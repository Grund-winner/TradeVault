import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { createHash } from 'crypto';

// Setup admin: creates or promotes a user to admin
// Works only if no admin exists yet
export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();

    const admins = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM users WHERE role IN ('admin', 'host') LIMIT 1`
    );

    if (admins.length > 0) {
      return NextResponse.json({ error: 'Admin already exists', adminId: admins[0].id }, { status: 403 });
    }

    const { email, password } = await request.json();
    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: 'Email and password (min 8 chars) required' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const hashedPassword = createHash('sha256').update(password + '_tv_salt_2024').digest('hex');

    // Check if user already exists
    const existing = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM users WHERE email = $1`, emailLower
    );

    let userId: string;
    const sessionToken = createHash('sha256').update(`admin_${Date.now()}_session`).digest('hex');

    if (existing.length > 0) {
      // Promote existing user
      userId = existing[0].id;
      await db.$executeRawUnsafe(
        `UPDATE users SET role = 'admin', "sessionToken" = $1, "isActive" = true WHERE id = $2`,
        sessionToken, userId
      );
    } else {
      // Create new admin user
      userId = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await db.$executeRawUnsafe(
        `INSERT INTO users (id, email, password, "siteName", "siteSubtitle", theme, "sessionToken", role, locale, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin', 'fr', true, NOW(), NOW())`,
        userId, emailLower, hashedPassword, 'TradeVault', 'Analytics Pro', 'dark', sessionToken
      );
    }

    // Ensure admin has a subscription
    const existingSub = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM subscriptions WHERE "userId" = $1 AND status = 'active' LIMIT 1`, userId
    );
    if (existingSub.length === 0) {
      await db.$executeRawUnsafe(
        `INSERT INTO subscriptions (id, "userId", plan, status, "paymentMethod", "paymentRef", amount, currency, "startDate", "endDate", "createdAt", "updatedAt")
         VALUES ($1, $2, 'pro', 'active', 'admin', '', 0, 'EUR', NOW(), NOW() + INTERVAL '10 years', NOW(), NOW())`,
        `sub_admin_${Date.now()}`, userId
      );
    }

    const response = NextResponse.json({
      user: { id: userId, email: emailLower, role: 'admin' },
      message: existing.length > 0 ? 'User promoted to admin' : 'Admin account created',
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
