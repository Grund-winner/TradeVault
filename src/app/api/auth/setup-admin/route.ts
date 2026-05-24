import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { createHash } from 'crypto';

// One-time admin setup: creates admin account if no admin exists
export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();

    const admins = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM users WHERE role IN ('admin', 'host') LIMIT 1`
    );

    if (admins.length > 0) {
      return NextResponse.json({ error: 'Admin already exists' }, { status: 403 });
    }

    const { email, password } = await request.json();
    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: 'Email and password (min 8 chars) required' }, { status: 400 });
    }

    const hashedPassword = createHash('sha256').update(password + '_tv_salt_2024').digest('hex');
    const userId = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const sessionToken = createHash('sha256').update(userId + Date.now() + '_session').digest('hex');

    await db.$executeRawUnsafe(
      `INSERT INTO users (id, email, password, "siteName", "siteSubtitle", theme, "sessionToken", role, locale, "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin', 'fr', true, NOW(), NOW())`,
      userId, email.toLowerCase().trim(), hashedPassword, 'TradeVault', 'Analytics Pro', 'dark', sessionToken
    );

    await db.$executeRawUnsafe(
      `INSERT INTO subscriptions (id, "userId", plan, status, "paymentMethod", "paymentRef", amount, currency, "startDate", "endDate", "createdAt", "updatedAt")
       VALUES ($1, $2, 'pro', 'active', 'admin', '', 0, 'EUR', NOW(), NOW() + INTERVAL '10 years', NOW(), NOW())`,
      `sub_admin_${Date.now()}`, userId
    );

    const response = NextResponse.json({
      user: { id: userId, email: email.toLowerCase().trim(), role: 'admin' },
      message: 'Admin account created',
    }, { status: 201 });

    response.cookies.set('tv_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[TradeVault] Setup admin error:', error);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}
