import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    await ensureDatabase();
    const { email, securityAnswer, newPassword } = await request.json();

    if (!email || !securityAnswer || !newPassword) {
      return NextResponse.json(
        { error: 'Email, reponse de securite et nouveau mot de passe sont requis' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe doit contenir au moins 6 caracteres' },
        { status: 400 }
      );
    }

    // Find user
    const users = await db.$queryRawUnsafe<Array<{
      id: string;
      securityQuestion: string | null;
      securityAnswer: string | null;
    }>>(
      `SELECT id, "securityQuestion", "securityAnswer" FROM users WHERE email = $1 AND "isActive" = true`,
      email.trim().toLowerCase()
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Aucun compte trouve avec cet email' },
        { status: 404 }
      );
    }

    const user = users[0];

    if (!user.securityQuestion || !user.securityAnswer) {
      return NextResponse.json(
        { error: 'Aucune question de securite configuree pour ce compte. Contactez un administrateur.' },
        { status: 400 }
      );
    }

    // Verify security answer (bcrypt hash)
    const isAnswerValid = await verifyPassword(securityAnswer, user.securityAnswer);
    if (!isAnswerValid) {
      return NextResponse.json(
        { error: 'Reponse de securite incorrecte' },
        { status: 401 }
      );
    }

    // Hash new password and update
    const newHash = await hashPassword(newPassword);
    await db.$executeRawUnsafe(
      `UPDATE users SET password = $1, "updatedAt" = NOW() WHERE id = $2`,
      newHash,
      user.id
    );

    return NextResponse.json({
      success: true,
      message: 'Mot de passe modifie avec succes',
    });
  } catch (error) {
    console.error('[Auth] Reset password error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la reinitialisation du mot de passe' },
      { status: 500 }
    );
  }
}
