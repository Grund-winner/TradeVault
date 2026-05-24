import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import Stripe from 'stripe';
import { createHmac } from 'crypto';

// Disable body parsing - we need raw body for webhook signature verification
export const runtime = 'nodejs';

async function createOrUpdateSubscription(
  userId: string,
  paymentMethod: string,
  paymentRef: string,
  amount: number,
  currency: string,
  days: number
) {
  await ensureDatabase();

  // Deactivate any existing active subscriptions
  try {
    await db.$executeRawUnsafe(
      `UPDATE subscriptions SET status = 'cancelled', "updatedAt" = NOW() WHERE "userId" = $1 AND status = 'active'`,
      userId
    );
  } catch {
    // Non-critical
  }

  // Create new subscription
  const subId = `sub_stripe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    await db.$executeRawUnsafe(
      `INSERT INTO subscriptions (id, "userId", plan, status, "paymentMethod", "paymentRef", amount, currency, "startDate", "endDate", "createdAt", "updatedAt")
       VALUES ($1, $2, 'pro', 'active', $3, $4, $5, $6, NOW(), NOW() + INTERVAL '1 day' * $7, NOW(), NOW())`,
      subId,
      userId,
      paymentMethod,
      paymentRef,
      amount,
      currency,
      days
    );
  } catch (error) {
    console.error('[TradeVault] Failed to create subscription from webhook:', error);
  }
}

async function cancelSubscription(userId: string) {
  await ensureDatabase();
  try {
    await db.$executeRawUnsafe(
      `UPDATE subscriptions SET status = 'cancelled', "updatedAt" = NOW() WHERE "userId" = $1 AND status = 'active'`,
      userId
    );
  } catch (error) {
    console.error('[TradeVault] Failed to cancel subscription:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || webhookSecret === 'whsec_placeholder') {
      console.warn('[TradeVault] Stripe webhook secret not configured, skipping signature verification');
    }

    let event: Stripe.Event;

    if (webhookSecret && webhookSecret !== 'whsec_placeholder') {
      const signature = request.headers.get('stripe-signature');
      if (!signature) {
        return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
      }
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
          apiVersion: '2025-05-28.basil',
        });
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('[TradeVault] Stripe webhook signature verification failed:', err);
        return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
      }
    } else {
      event = JSON.parse(body);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (userId) {
          await createOrUpdateSubscription(
            userId,
            'stripe',
            session.id,
            25,
            'EUR',
            30
          );
          console.log(`[TradeVault] Subscription created for user ${userId} via Stripe checkout`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await cancelSubscription(userId);
          console.log(`[TradeVault] Subscription cancelled for user ${userId}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = invoice.subscription as string | Stripe.Subscription;
        let userId: string | undefined;

        // Try to get userId from subscription metadata
        if (typeof subscription === 'object' && subscription?.metadata?.userId) {
          userId = subscription.metadata.userId;
        }

        // Fallback: look up by payment ref
        if (!userId && invoice.payment_intent) {
          try {
            await ensureDatabase();
            const existing = await db.$queryRawUnsafe<Array<{ "userId": string }>>(
              `SELECT "userId" FROM subscriptions WHERE "paymentRef" = $1 AND status = 'active' LIMIT 1`,
              typeof invoice.payment_intent === 'string' ? invoice.payment_intent : ''
            );
            if (existing.length > 0) userId = existing[0].userId;
          } catch {
            // Fallback failed
          }
        }

        if (userId) {
          // Extend subscription by 30 days
          await createOrUpdateSubscription(
            userId,
            'stripe',
            invoice.id,
            25,
            'EUR',
            30
          );
          console.log(`[TradeVault] Subscription renewed for user ${userId} via Stripe invoice`);
        }
        break;
      }

      default:
        console.log(`[TradeVault] Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[TradeVault] Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
