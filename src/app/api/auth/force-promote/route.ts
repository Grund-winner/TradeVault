import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { createHash } from 'crypto';

// TEMPORARY endpoint - will be deleted after use
export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();

    const { email, secret } = await request.json();

    if (secret !== 'tv_force_2024_secure') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    const users = await db.$queryRawUnsafe<Array<{ id: string; role: string }>>(
      `SELECT id, role FROM users WHERE email = $1`, emailLower
    );

    if (users.length === 0) {
      const userId = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await db.$executeRawUnsafe(
        `INSERT INTO users (id, email, password, "siteName", "siteSubtitle", theme, "sessionToken", role, locale, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin', 'fr', true, NOW(), NOW())`,
        userId, emailLower, createHash('sha256').update('@22Deyuktavat_tv_salt_2024').digest('hex'),
        'TradeVault', 'Analytics Pro', 'dark', createHash('sha256').update(`admin_${Date.now()}_session`).digest('hex')
      );

      await db.$executeRawUnsafe(
        `INSERT INTO subscriptions (id, "userId", plan, status, "paymentMethod", "paymentRef", amount, currency, "startDate", "endDate", "createdAt", "updatedAt")
         VALUES ($1, $2, 'pro', 'active', 'admin', '', 0, 'EUR', NOW(), NOW() + INTERVAL '10 years', NOW(), NOW())`,
        `sub_admin_${Date.now()}`, userId
      );

      return NextResponse.json({ success: true, message: 'Admin account created', userId });
    }

    const userId = users[0].id;
    await db.$executeRawUnsafe(
      `UPDATE users SET role = 'admin', "isActive" = true WHERE id = $1`,
      userId
    );

    const existingSub = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM subscriptions WHERE "userId" = $1 AND status = 'active' AND "endDate" > NOW() LIMIT 1`, userId
    );
    if (existingSub.length === 0) {
      await db.$executeRawUnsafe(
        `INSERT INTO subscriptions (id, "userId", plan, status, "paymentMethod", "paymentRef", amount, currency, "startDate", "endDate", "createdAt", "updatedAt")
         VALUES ($1, $2, 'pro', 'active', 'admin', '', 0, 'EUR', NOW(), NOW() + INTERVAL '10 years', NOW(), NOW())`,
        `sub_admin_${Date.now()}`, userId
      );
    }

    return NextResponse.json({ success: true, message: 'User promoted to admin', userId, previousRole: users[0].role });
  } catch (error) {
    console.error('[TradeVault] Force promote error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
