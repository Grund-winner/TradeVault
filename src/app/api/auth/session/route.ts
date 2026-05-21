import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDatabase } from '@/lib/db';

export async function GET() {
  try {
    await ensureDatabase();

    const users = await db.$queryRawUnsafe<Array<{
      id: string;
      email: string;
      siteName: string;
      siteSubtitle: string;
      theme: string;
    }>>(
      `SELECT id, email, "siteName", "siteSubtitle", theme FROM users LIMIT 1`
    );

    if (users.length === 0) {
      // No user registered yet — return defaults
      return NextResponse.json({
        exists: false,
        siteName: 'TradeVault',
        siteSubtitle: 'Analytics Pro',
        theme: 'dark',
      });
    }

    const user = users[0];
    return NextResponse.json({
      exists: true,
      siteName: user.siteName,
      siteSubtitle: user.siteSubtitle,
      theme: user.theme,
    });
  } catch (error) {
    console.error('[TradeVault] Session error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement de la session' },
      { status: 500 }
    );
  }
}
