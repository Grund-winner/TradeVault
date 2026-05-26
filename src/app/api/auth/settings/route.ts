import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    await ensureDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Non authentifie' },
        { status: 401 }
      );
    }

    const { siteName, siteSubtitle, theme, initialBalance, mtAccountId, mtServer, mtPlatform, avatarUrl, securityQuestion, securityAnswer } = await request.json();

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

    if (initialBalance !== undefined && initialBalance !== null) {
      updates.push(`"initialBalance" = $${paramIndex}`);
      values.push(parseFloat(initialBalance));
      paramIndex++;
    }

    if (mtAccountId !== undefined) {
      updates.push(`"mtAccountId" = $${paramIndex}`);
      values.push(String(mtAccountId));
      paramIndex++;
    }

    if (mtServer !== undefined) {
      updates.push(`"mtServer" = $${paramIndex}`);
      values.push(String(mtServer));
      paramIndex++;
    }

    if (mtPlatform !== undefined && (mtPlatform === 'mt4' || mtPlatform === 'mt5')) {
      updates.push(`"mtPlatform" = $${paramIndex}`);
      values.push(mtPlatform);
      paramIndex++;
    }

    if (avatarUrl !== undefined) {
      if (avatarUrl === null) {
        updates.push(`"avatarUrl" = NULL`);
      } else {
        updates.push(`"avatarUrl" = $${paramIndex}`);
        values.push(String(avatarUrl));
        paramIndex++;
      }
    }

    if (securityQuestion !== undefined) {
      if (securityQuestion === null) {
        updates.push(`"securityQuestion" = NULL`);
      } else {
        updates.push(`"securityQuestion" = $${paramIndex}`);
        values.push(String(securityQuestion));
        paramIndex++;
      }
    }

    if (securityAnswer !== undefined) {
      if (securityAnswer === null) {
        updates.push(`"securityAnswer" = NULL`);
      } else {
        updates.push(`"securityAnswer" = $${paramIndex}`);
        values.push(await hashPassword(String(securityAnswer)));
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Aucune modification a appliquer' },
        { status: 400 }
      );
    }

    updates.push(`"updatedAt" = NOW()`);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, "siteName", "siteSubtitle", theme, "initialBalance", "mtAccountId", "mtServer", "mtPlatform"`;
    values.push(currentUser.id);

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
