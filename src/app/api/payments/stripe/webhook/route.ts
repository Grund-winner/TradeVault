import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Stripe webhook endpoint - raw body processing
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Webhook non configure' }, { status: 400 });
    }

    const body = await request.text();
    // Stripe signature verification would go here
    console.log('[Payments] Stripe webhook received (unprocessed)');
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Payments] Stripe webhook error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
