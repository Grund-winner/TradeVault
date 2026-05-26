import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser, verifyPassword, hashPassword } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    await ensureDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Non authentifie' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Le mot de passe actuel et le nouveau mot de passe sont requis' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe doit contenir au moins 6 caracteres' },
        { status: 400 }
      );
    }

    // Fetch current password hash
    const users = await db.$queryRawUnsafe<Array<{ password: string }>>(
      `SELECT password FROM users WHERE id = $1`,
      currentUser.id
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Utilisateur non trouve' },
        { status: 404 }
      );
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, users[0].password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Mot de passe actuel incorrect' },
        { status: 401 }
      );
    }

    // Hash and update new password
    const newHash = await hashPassword(newPassword);
    await db.$executeRawUnsafe(
      `UPDATE users SET password = $1, "updatedAt" = NOW() WHERE id = $2`,
      newHash,
      currentUser.id
    );

    return NextResponse.json({ success: true, message: 'Mot de passe modifie avec succes' });
  } catch (error) {
    console.error('[Auth] Change password error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du changement de mot de passe' },
      { status: 500 }
    );
  }
}
