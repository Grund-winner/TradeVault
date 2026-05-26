import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, ensureDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey || apiKey === 'placeholder') {
      return NextResponse.json(
        { error: 'Paiement crypto non configure. Contactez le support ou utilisez une carte bancaire.' },
        { status: 503 }
      );
    }

    const { currency, network } = await request.json();

    const payCurrency = network === 'bep20' ? 'usdtbep20' : 'usdttrc20';
    const priceAmount = 25;
    const priceCurrency = 'eur';
    const orderId = `tv_${user.id}_${Date.now()}`;

    // Call NOWPayments API to create invoice
    const npResponse = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: priceAmount,
        price_currency: priceCurrency,
        pay_currency: payCurrency,
        order_id: orderId,
        order_description: `TradeVault Pro - 1 mois (${network?.toUpperCase()})`,
        ipn_callback_url: `${process.env.NEXT_PUBLIC_URL || ''}/api/payments/crypto/webhook`,
        success_url: `${process.env.NEXT_PUBLIC_URL || ''}/subscription?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL || ''}/pricing?cancelled=true`,
      }),
    });

    if (!npResponse.ok) {
      const errorData = await npResponse.json().catch(() => ({}));
      console.error('[TradeVault] NOWPayments error:', errorData);
      return NextResponse.json(
        { error: 'Erreur lors de la creation de la facture crypto. Essayez avec une carte bancaire.' },
        { status: 502 }
      );
    }

    const invoiceData = await npResponse.json();

    // Store the payment reference for later matching
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO admin_logs (id, "adminId", action, "targetId", details, "createdAt")
         VALUES ($1, $2, 'crypto_invoice_created', $3, $4, NOW())`,
        `log_${Date.now()}`,
        user.id,
        orderId,
        `NOWPayments invoice: ${invoiceData.id}, currency: ${payCurrency}, amount: ${priceAmount} ${priceCurrency}`
      );
    } catch {
      // Non-critical logging
    }

    return NextResponse.json({
      invoiceId: invoiceData.id,
      invoiceUrl: invoiceData.invoice_url,
      paymentUrl: invoiceData.invoice_url,
      amount: priceAmount,
      currency: payCurrency,
      orderId,
    });
  } catch (error) {
    console.error('[TradeVault] Crypto create-invoice error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la creation du paiement crypto' },
      { status: 500 }
    );
  }
}
