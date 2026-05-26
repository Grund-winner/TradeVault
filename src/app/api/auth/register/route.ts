import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDatabase } from '@/lib/db';
import { createHash } from 'crypto';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe sont requis' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caracteres' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUsers = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM users WHERE email = $1`,
      email.toLowerCase().trim()
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Cet email est deja utilise' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const sessionToken = createHash('sha256').update(userId + Date.now() + '_session').digest('hex');

    await db.$executeRawUnsafe(
      `INSERT INTO users (id, email, password, "siteName", "siteSubtitle", theme, "sessionToken", role, locale, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'user', 'fr', NOW(), NOW())`,
      userId,
      email.toLowerCase().trim(),
      hashedPassword,
      'TradeVault',
      'Analytics Pro',
      'dark',
      sessionToken
    );

    // Create 7-day trial subscription
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO subscriptions (id, "userId", plan, status, "paymentMethod", "paymentRef", amount, currency, "startDate", "endDate", "createdAt", "updatedAt")
         VALUES ($1, $2, 'pro', 'active', 'trial', '', 0, 'EUR', NOW(), NOW() + INTERVAL '7 days', NOW(), NOW())`,
        `sub_${Date.now()}`,
        userId
      );
    } catch (subError) {
      console.error('[TradeVault] Failed to create trial subscription:', subError);
    }

    const users = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, email, "siteName", "siteSubtitle", theme, role, locale, "createdAt", "updatedAt" FROM users WHERE id = $1`,
      userId
    );

    const user = users[0];

    const response = NextResponse.json(
      { user, token: sessionToken },
      { status: 201 }
    );

    response.cookies.set('tv_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    // Subscription cookie (httpOnly for security - 7-day trial)
    response.cookies.set('tv_sub', 'active', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    // Role cookie (httpOnly for security)
    response.cookies.set('tv_role', 'user', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[TradeVault] Register error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la creation du compte' },
      { status: 500 }
    );
  }
}
