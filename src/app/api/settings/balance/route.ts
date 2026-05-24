import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createHash } from 'crypto';

// GET /api/settings/balance - Get initial balance
export async function GET() {
  try {
    await ensureDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    return NextResponse.json({ initialBalance: user.initialBalance || 0 });
  } catch (error) {
    console.error('[TradeVault] Balance GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/settings/balance - Update initial balance
export async function PUT(request: NextRequest) {
  try {
    await ensureDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { initialBalance } = await request.json();

    if (initialBalance === undefined || initialBalance === null) {
      return NextResponse.json({ error: 'Solde initial requis' }, { status: 400 });
    }

    await db.$executeRawUnsafe(
      `UPDATE users SET "initialBalance" = $1, "updatedAt" = NOW() WHERE id = $2`,
      parseFloat(initialBalance),
      user.id
    );

    return NextResponse.json({ success: true, initialBalance: parseFloat(initialBalance) });
  } catch (error) {
    console.error('[TradeVault] Balance PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
