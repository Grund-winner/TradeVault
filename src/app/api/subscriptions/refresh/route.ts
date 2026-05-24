import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, ensureDatabase } from '@/lib/db';

// GET: Refresh subscription cookies and return current sub status
export async function GET() {
  try {
    await ensureDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const subs = await db.$queryRawUnsafe<Array<{ endDate: string }>>(
      `SELECT "endDate" FROM subscriptions WHERE "userId" = $1 AND status = 'active' AND "endDate" > NOW() ORDER BY "endDate" DESC LIMIT 1`,
      user.id
    );

    const isActive = subs.length > 0;
    const endDate = subs[0]?.endDate || null;

    const response = NextResponse.json({ active: isActive, endDate });

    // Refresh the tv_sub cookie
    if (isActive && endDate) {
      const endMs = new Date(endDate).getTime();
      const nowMs = Date.now();
      const maxAge = Math.max(0, Math.floor((endMs - nowMs) / 1000));

      response.cookies.set('tv_sub', 'active', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge,
        path: '/',
      });
    } else {
      response.cookies.set('tv_sub', 'expired', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
    }

    // Refresh role cookie
    response.cookies.set('tv_role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[TradeVault] Subscription refresh error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
