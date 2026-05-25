import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { requireAdmin, safeJson } from '@/lib/auth';

// GET /api/admin/config - Get platform config (WhatsApp & Telegram links)
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }
    await ensureDatabase();

    const configs = await db.$queryRawUnsafe<Array<{ key: string; value: string }>>(
      `SELECT key, value FROM platform_configs WHERE key IN ('whatsapp_link', 'telegram_link')`
    );

    const result: Record<string, string> = {};
    for (const c of configs) {
      result[c.key] = c.value;
    }

    return NextResponse.json(safeJson({
      whatsappLink: result.whatsapp_link || '',
      telegramLink: result.telegram_link || '',
    }));
  } catch (error) {
    console.error('[Admin] Config GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/admin/config - Update platform config
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }
    await ensureDatabase();

    const body = await request.json();
    const { whatsappLink, telegramLink } = body;

    if (whatsappLink !== undefined) {
      await db.$executeRawUnsafe(
        `INSERT INTO platform_configs (id, key, value, "updatedAt") VALUES ('cfg_whatsapp', 'whatsapp_link', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = NOW()`,
        String(whatsappLink)
      );
    }

    if (telegramLink !== undefined) {
      await db.$executeRawUnsafe(
        `INSERT INTO platform_configs (id, key, value, "updatedAt") VALUES ('cfg_telegram', 'telegram_link', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = NOW()`,
        String(telegramLink)
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin] Config PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
