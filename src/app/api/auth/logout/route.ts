import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json(
      { success: true, message: 'Deconnexion reussie' },
      { status: 200 }
    );

    // Clear the httpOnly session cookie
    response.cookies.set('tv_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    // Clear the subscription status cookie
    response.cookies.set('tv_sub', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    // Clear the role cookie
    response.cookies.set('tv_role', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[TradeVault] Logout error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la deconnexion' },
      { status: 500 }
    );
  }
}
