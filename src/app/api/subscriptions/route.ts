import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAdmin } from '@/lib/auth';
import { db, ensureDatabase } from '@/lib/db';

// GET: Return current user's subscription history
export async function GET() {
  try {
    await ensureDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const subscriptions = await db.$queryRawUnsafe<Array<{
      id: string;
      plan: string;
      status: string;
      paymentMethod: string;
      paymentRef: string;
      amount: number;
      currency: string;
      startDate: string;
      endDate: string;
      createdAt: string;
    }>>(
      `SELECT id, plan, status, "paymentMethod", "paymentRef", amount, currency, "startDate", "endDate", "createdAt"
       FROM subscriptions WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
      user.id
    );

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('[TradeVault] Subscriptions GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST: Manually create subscription (admin only)
export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const { userId, plan, days, paymentMethod, paymentRef, amount, currency } = await request.json();

    if (!userId || !days || days <= 0) {
      return NextResponse.json({ error: 'Parametres invalides' }, { status: 400 });
    }

    const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    await db.$executeRawUnsafe(
      `INSERT INTO subscriptions (id, "userId", plan, status, "paymentMethod", "paymentRef", amount, currency, "startDate", "endDate", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, NOW(), NOW() + INTERVAL '1 day' * $8, NOW(), NOW())`,
      subId,
      userId,
      plan || 'pro',
      paymentMethod || 'manual',
      paymentRef || '',
      amount || 25,
      currency || 'EUR',
      days
    );

    // Log admin action
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO admin_logs (id, "adminId", action, "targetId", details, "createdAt") VALUES ($1, $2, $3, $4, $5, NOW())`,
        `log_${Date.now()}`,
        admin.id,
        'create_subscription',
        userId,
        `Plan ${plan || 'pro'}, ${days} jours, methode: ${paymentMethod || 'manual'}`
      );
    } catch {
      // Log failure is non-critical
    }

    return NextResponse.json({ success: true, subscriptionId: subId }, { status: 201 });
  } catch (error) {
    console.error('[TradeVault] Subscriptions POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
