import { NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';

// GET /api/community - Return platform config links (WhatsApp & Telegram)
export async function GET() {
  try {
    await ensureDatabase();

    const configs = await db.$queryRawUnsafe<Array<{ key: string; value: string }>>(
      `SELECT key, value FROM platform_configs WHERE key IN ('whatsapp_link', 'telegram_link')`
    );

    const result: Record<string, string> = {};
    for (const c of configs) {
      result[c.key] = c.value;
    }

    return NextResponse.json({
      whatsappLink: result.whatsapp_link || '',
      telegramLink: result.telegram_link || '',
    });
  } catch (error) {
    console.error('[TradeVault] Community GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
