import { NextResponse } from 'next/server';
import { getCurrentUser, checkSubscription } from '@/lib/auth';
import { db, ensureDatabase } from '@/lib/db';

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

    // Get MT fields separately since they're not in AuthUser interface
    const mtFields = await db.$queryRawUnsafe<Array<{ mtApiKey: string | null; mtAccountId: string | null; mtServer: string | null; mtPlatform: string | null; mtLastSync: string | null }>>(
      `SELECT "mtApiKey", "mtAccountId", "mtServer", "mtPlatform", "mtLastSync" FROM users WHERE id = $1`,
      user.id
    );
    const mt = mtFields[0] || {};

    return NextResponse.json({
      exists: true,
      siteName: user.siteName,
      siteSubtitle: user.siteSubtitle,
      theme: user.theme,
      email: user.email,
      role: user.role,
      locale: user.locale,
      initialBalance: user.initialBalance,
      isActive: user.isActive,
      subscription: sub,
      mt: {
        hasApiKey: !!mt.mtApiKey,
        apiKeyMasked: mt.mtApiKey ? `${mt.mtApiKey.substring(0, 6)}${'*'.repeat(24)}${mt.mtApiKey.substring(mt.mtApiKey.length - 4)}` : null,
        accountId: mt.mtAccountId,
        server: mt.mtServer,
        platform: mt.mtPlatform,
        lastSync: mt.mtLastSync,
      },
    });
  } catch (error) {
    console.error('[TradeVault] Session error:', error);
    return NextResponse.json({ error: 'Session error' }, { status: 500 });
  }
}
