import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDatabase } from '@/lib/db';
import { createHash } from 'crypto';
import { verifyPassword, hashPassword } from '@/lib/auth';

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

    const users = await db.$queryRawUnsafe<Array<{
      id: string;
      email: string;
      password: string;
      siteName: string;
      siteSubtitle: string;
      theme: string;
      role: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }>>(
      `SELECT * FROM users WHERE email = $1 AND "isActive" = true`,
      email.toLowerCase().trim()
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Identifiants invalides ou compte desactive' },
        { status: 401 }
      );
    }

    const user = users[0];
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Identifiants invalides ou compte desactive' },
        { status: 401 }
      );
    }

    // Migrate legacy SHA256 password to bcrypt on successful login
    if (!user.password.startsWith('$2')) {
      try {
        const newHash = await hashPassword(password);
        await db.$executeRawUnsafe(
          `UPDATE users SET password = $1 WHERE id = $2`,
          newHash,
          user.id
        );
      } catch (migrationError) {
        console.warn('[Auth] Failed to migrate password to bcrypt:', migrationError);
      }
    }

    const sessionToken = createHash('sha256').update(user.id + Date.now() + '_session').digest('hex');

    // Store session token in database
    await db.$executeRawUnsafe(
      `UPDATE users SET "sessionToken" = $1 WHERE id = $2`,
      sessionToken,
      user.id
    );

    // Check subscription status for tv_sub cookie
    let subStatus = 'expired';
    let subMaxAge = 60 * 60 * 24 * 30; // 30 days default
    try {
      const subs = await db.$queryRawUnsafe<Array<{ endDate: string }>>(
        `SELECT "endDate" FROM subscriptions WHERE "userId" = $1 AND status = 'active' AND "endDate" > NOW() ORDER BY "endDate" DESC LIMIT 1`,
        user.id
      );
      if (subs.length > 0) {
        subStatus = 'active';
        const endMs = new Date(subs[0].endDate).getTime();
        const nowMs = Date.now();
        subMaxAge = Math.max(0, Math.floor((endMs - nowMs) / 1000));
      }
    } catch {
      // Default to expired
    }

    const { password: _, ...userWithoutPassword } = user;

    const response = NextResponse.json(
      { user: userWithoutPassword, token: sessionToken },
      { status: 200 }
    );

    response.cookies.set('tv_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    // Subscription cookie (httpOnly for security)
    response.cookies.set('tv_sub', subStatus, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: subMaxAge,
      path: '/',
    });

    // Role cookie (httpOnly for security)
    response.cookies.set('tv_role', user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[TradeVault] Login error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
}
