import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    const users = await db.$queryRawUnsafe<Array<{ securityQuestion: string | null }>>(
      `SELECT "securityQuestion" FROM users WHERE email = $1 AND "isActive" = true`,
      email.trim().toLowerCase()
    );

    if (users.length === 0) {
      // Don't reveal if user exists or not
      return NextResponse.json({ hasQuestion: false });
    }

    const user = users[0];

    if (!user.securityQuestion) {
      return NextResponse.json({ hasQuestion: false });
    }

    return NextResponse.json({
      hasQuestion: true,
      question: user.securityQuestion,
    });
  } catch (error) {
    console.error('[Auth] Security question error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la verification de la question de securite' },
      { status: 500 }
    );
  }
}
