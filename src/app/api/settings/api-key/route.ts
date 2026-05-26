import { NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { randomBytes } from 'crypto';

// POST /api/settings/api-key - Generate or regenerate MT API key
export async function POST() {
  try {
    await ensureDatabase();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Generate a secure API key: tv_<32 hex chars>
    const apiKey = `tv_${randomBytes(16).toString('hex')}`;

    await db.$executeRawUnsafe(
      `UPDATE users SET "mtApiKey" = $1, "updatedAt" = NOW() WHERE id = $2`,
      apiKey,
      user.id
    );

    return NextResponse.json({ apiKey, message: 'Cle API generee avec succes' });
  } catch (error) {
    console.error('[TradeVault] API key generation error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// GET /api/settings/api-key - Get current MT API key (masked)
export async function GET() {
  try {
    await ensureDatabase();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const users = await db.$queryRawUnsafe<Array<{ mtApiKey: string | null }>>(
      `SELECT "mtApiKey" FROM users WHERE id = $1`,
      user.id
    );

    const apiKey = users[0]?.mtApiKey;

    return NextResponse.json({
      hasApiKey: !!apiKey,
      apiKeyMasked: apiKey ? `${apiKey.substring(0, 6)}${'*'.repeat(24)}${apiKey.substring(apiKey.length - 4)}` : null,
    });
  } catch (error) {
    console.error('[TradeVault] API key fetch error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
