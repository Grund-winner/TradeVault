import { NextResponse } from 'next/server';
import { getCurrentUser, checkSubscription } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        exists: false,
        siteName: 'TradeVault',
        siteSubtitle: 'Analytics Pro',
        theme: 'dark',
        locale: 'fr',
      });
    }

    const sub = await checkSubscription(user.id);

    return NextResponse.json({
      exists: true,
      siteName: user.siteName,
      siteSubtitle: user.siteSubtitle,
      theme: user.theme,
      email: user.email,
      role: user.role,
      locale: user.locale,
      initialBalance: user.initialBalance,
      subscription: sub,
    });
  } catch (error) {
    console.error('[TradeVault] Session error:', error);
    return NextResponse.json({ error: 'Session error' }, { status: 500 });
  }
}
