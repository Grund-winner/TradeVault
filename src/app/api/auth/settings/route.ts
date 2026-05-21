import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDatabase } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    await ensureDatabase();

    const { siteName, siteSubtitle, theme } = await request.json();

    // Validate inputs
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (siteName !== undefined && typeof siteName === 'string' && siteName.trim().length > 0) {
      updates.push(`"siteName" = $${paramIndex}`);
      values.push(siteName.trim());
      paramIndex++;
    }

    if (siteSubtitle !== undefined && typeof siteSubtitle === 'string') {
      updates.push(`"siteSubtitle" = $${paramIndex}`);
      values.push(siteSubtitle.trim());
      paramIndex++;
    }

    if (theme !== undefined && (theme === 'dark' || theme === 'light')) {
      updates.push(`theme = $${paramIndex}`);
      values.push(theme);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Aucune modification a appliquer' },
        { status: 400 }
      );
    }

    updates.push(`"updatedAt" = NOW()`);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = (SELECT id FROM users LIMIT 1) RETURNING id, email, "siteName", "siteSubtitle", theme`;

    const result = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(query, ...values);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Aucun utilisateur trouve' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: result[0] });
  } catch (error) {
    console.error('[TradeVault] Settings update error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise a jour des parametres' },
      { status: 500 }
    );
  }
}
