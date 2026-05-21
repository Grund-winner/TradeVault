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

    await db.$executeRawUnsafe(
      `INSERT INTO users (id, email, password, "siteName", "siteSubtitle", theme, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      userId,
      email.toLowerCase().trim(),
      hashedPassword,
      'TradeVault',
      'Analytics Pro',
      'dark'
    );

    const users = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, email, "siteName", "siteSubtitle", theme, "createdAt", "updatedAt" FROM users WHERE id = $1`,
      userId
    );

    const user = users[0];

    // Create session token
    const sessionToken = createHash('sha256').update(userId + Date.now() + '_session').digest('hex');

    const response = NextResponse.json(
      { user, token: sessionToken },
      { status: 201 }
    );

    response.cookies.set('tv_session', sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
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
