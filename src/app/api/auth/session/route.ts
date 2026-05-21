import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        exists: false,
        siteName: 'TradeVault',
        siteSubtitle: 'Analytics Pro',
        theme: 'dark',
      });
    }

    return NextResponse.json({
      exists: true,
      siteName: user.siteName,
      siteSubtitle: user.siteSubtitle,
      theme: user.theme,
      email: user.email,
    });
  } catch (error) {
    console.error('[TradeVault] Session error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement de la session' },
      { status: 500 }
    );
  }
}
