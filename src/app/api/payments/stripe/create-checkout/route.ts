import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, ensureDatabase } from '@/lib/db';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRICE_ID;

    if (!stripeSecretKey || !stripePriceId || stripeSecretKey === 'sk_test_placeholder') {
      return NextResponse.json(
        { error: 'Paiement par carte non configure. Veuillez contacter le support.' },
        { status: 503 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-05-28.basil',
    });

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_URL || '';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/api/payments/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?cancelled=true`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('[TradeVault] Stripe create-checkout error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la creation du paiement' },
      { status: 500 }
    );
  }
}
