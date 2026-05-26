import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE() {
  try {
    await ensureDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Non authentifie' },
        { status: 401 }
      );
    }

    // Delete user - cascade will handle related records (trades, subscriptions, posts, conversations)
    await db.$executeRawUnsafe(
      `DELETE FROM users WHERE id = $1`,
      currentUser.id
    );

    // Create response with cleared cookies
    const response = NextResponse.json({
      success: true,
      message: 'Compte supprime avec succes. Toutes vos donnees ont ete effacees.',
    });

    // Clear all auth cookies
    response.cookies.set('tv_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('[Auth] Account deletion error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du compte' },
      { status: 500 }
    );
  }
}
