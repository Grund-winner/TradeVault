import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { createHmac } from 'crypto';

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

  // Deactivate existing active subscriptions
  try {
    await db.$executeRawUnsafe(
      `UPDATE subscriptions SET status = 'cancelled', "updatedAt" = NOW() WHERE "userId" = $1 AND status = 'active'`,
      userId
    );
  } catch {
    // Non-critical
  }

  // Create new subscription
  const subId = `sub_crypto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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

    // Update tv_sub cookie via a simple response flag (will be set on next login)
    console.log(`[TradeVault] Subscription created for user ${userId} via ${paymentMethod}`);
  } catch (error) {
    console.error('[TradeVault] Failed to create subscription from crypto webhook:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;

    if (!ipnSecret || ipnSecret === 'placeholder') {
      console.warn('[TradeVault] NOWPayments IPN secret not configured, skipping verification');
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Verify IPN signature if configured
    if (ipnSecret && ipnSecret !== 'placeholder') {
      const receivedSignature = request.headers.get('x-nowpayments-sig');
      if (receivedSignature) {
        const expectedSignature = createHmac('sha512', ipnSecret).update(body).digest('hex');
        if (receivedSignature !== expectedSignature) {
          console.error('[TradeVault] NOWPayments IPN signature verification failed');
          return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }
      }
    }

    const paymentStatus = data.payment_status;
    const orderId = data.order_id as string | undefined;
    const paymentId = data.payment_id as string | undefined;
    const payCurrency = data.pay_currency as string | undefined;
    const priceAmount = data.price_amount as number | undefined;
    const actuallyPaid = data.actually_paid as number | undefined;

    if (paymentStatus === 'finished' || paymentStatus === 'confirmed') {
      // Extract userId from order_id format: tv_{userId}_{timestamp}
      let userId: string | undefined;
      if (orderId && orderId.startsWith('tv_')) {
        const parts = orderId.split('_');
        if (parts.length >= 3) {
          // userId could contain underscores, so reconstruct from middle parts
          userId = parts.slice(1, -1).join('_');
        }
      }

      if (!userId) {
        // Try to find by looking at recent admin logs
        try {
          await ensureDatabase();
          const logs = await db.$queryRawUnsafe<Array<{ targetId: string }>>(
            `SELECT "targetId" FROM admin_logs WHERE action = 'crypto_invoice_created' AND details LIKE $1 ORDER BY "createdAt" DESC LIMIT 1`,
            `%${paymentId || orderId || ''}%`
          );
          if (logs.length > 0) {
            const logTargetId = logs[0].targetId;
            if (logTargetId && logTargetId.startsWith('tv_')) {
              userId = logTargetId.split('_').slice(1, -1).join('_');
            }
          }
        } catch {
          // Fallback failed
        }
      }

      if (userId) {
        await createOrUpdateSubscription(
          userId,
          `crypto_${payCurrency || 'usdt'}`,
          String(paymentId || orderId || ''),
          actuallyPaid || priceAmount || 25,
          'USD',
          30
        );
        console.log(`[TradeVault] Crypto subscription activated for user ${userId}, payment ${paymentId}`);
      } else {
        console.warn('[TradeVault] Could not determine userId from crypto webhook:', { orderId, paymentId });
      }
    } else if (paymentStatus === 'failed' || paymentStatus === 'expired') {
      console.log(`[TradeVault] Crypto payment ${paymentId} ${paymentStatus}`);
    } else {
      console.log(`[TradeVault] Unhandled NOWPayments status: ${paymentStatus} for payment ${paymentId}`);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[TradeVault] Crypto webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
