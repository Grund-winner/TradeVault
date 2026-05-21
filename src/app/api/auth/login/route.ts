import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDatabase } from '@/lib/db';
import { createHash } from 'crypto';

async function hashPassword(password: string): Promise<string> {
  return createHash('sha256').update(password + '_tv_salt_2024').digest('hex');
}

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
      createdAt: string;
      updatedAt: string;
    }>>(
      `SELECT * FROM users WHERE email = $1`,
      email.toLowerCase().trim()
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      );
    }

    const user = users[0];
    const hashedPassword = await hashPassword(password);

    if (user.password !== hashedPassword) {
      return NextResponse.json(
        { error: 'Identifiants invalides' },
        { status: 401 }
      );
    }

    const sessionToken = createHash('sha256').update(user.id + Date.now() + '_session').digest('hex');

    // Store session token in database
    await db.$executeRawUnsafe(
      `UPDATE users SET "sessionToken" = $1 WHERE id = $2`,
      sessionToken,
      user.id
    );

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

    return response;
  } catch (error) {
    console.error('[TradeVault] Login error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la connexion' },
      { status: 500 }
    );
  }
}
