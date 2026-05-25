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

    // Get MT fields and avatarUrl separately
    const fields = await db.$queryRawUnsafe<Array<{ mtApiKey: string | null; mtAccountId: string | null; mtServer: string | null; mtPlatform: string | null; mtLastSync: string | null; avatarUrl: string | null }>>(
      `SELECT "mtApiKey", "mtAccountId", "mtServer", "mtPlatform", "mtLastSync", "avatarUrl" FROM users WHERE id = $1`,
      user.id
    );
    const f = fields[0] || {};

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
      avatarUrl: f.avatarUrl || null,
      subscription: sub,
      mt: {
        hasApiKey: !!f.mtApiKey,
        apiKeyMasked: f.mtApiKey ? `${f.mtApiKey.substring(0, 6)}${'*'.repeat(24)}${f.mtApiKey.substring(f.mtApiKey.length - 4)}` : null,
        accountId: f.mtAccountId,
        server: f.mtServer,
        platform: f.mtPlatform,
        lastSync: f.mtLastSync,
      },
    });
  } catch (error) {
    console.error('[TradeVault] Session error:', error);
    return NextResponse.json({ error: 'Session error' }, { status: 500 });
  }
}
