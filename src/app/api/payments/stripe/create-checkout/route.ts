import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.plan) {
      return NextResponse.json({ error: 'Plan requis' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Paiement Stripe non configure. Contactez l\'administrateur.' }, { status: 503 });
    }

    // Stripe integration would go here when key is configured
    return NextResponse.json({ error: 'Paiement Stripe non encore disponible.' }, { status: 503 });
  } catch (error) {
    console.error('[Payments] Stripe checkout error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
