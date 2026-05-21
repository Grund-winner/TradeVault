import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/trades - Fetch all trades for current user
export async function GET() {
  try {
    await ensureDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const trades = await db.trade.findMany({
      where: { userId: currentUser.id },
      orderBy: { date: 'asc' },
    });

    const formatted = trades.map(t => ({
      id: t.id,
      date: t.date,
      instrument: t.instrument,
      category: t.category,
      direction: t.direction,
      entry: t.entry,
      stopLoss: t.stopLoss,
      takeProfit: t.takeProfit,
      pnl: t.pnl,
      pnlR: t.pnlR,
      status: t.status,
      strategy: t.strategy,
      type: t.type,
      timeframe: t.timeframe,
      notes: t.notes || undefined,
      tags: t.tags ? t.tags.split(',').filter(Boolean) : undefined,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching trades:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to fetch trades', details: msg }, { status: 500 });
  }
}

// POST /api/trades - Create a new trade for current user
export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const body = await request.json();

    const trade = await db.trade.create({
      data: {
        date: body.date,
        instrument: body.instrument,
        category: body.category,
        direction: body.direction,
        entry: body.entry,
        stopLoss: body.stopLoss,
        takeProfit: body.takeProfit,
        pnl: body.pnl,
        pnlR: body.pnlR,
        status: body.status,
        strategy: body.strategy,
        type: body.type,
        timeframe: body.timeframe,
        notes: body.notes || null,
        tags: body.tags ? (Array.isArray(body.tags) ? body.tags.join(',') : body.tags) : null,
        userId: currentUser.id,
      },
    });

    const formatted = {
      id: trade.id,
      date: trade.date,
      instrument: trade.instrument,
      category: trade.category,
      direction: trade.direction,
      entry: trade.entry,
      stopLoss: trade.stopLoss,
      takeProfit: trade.takeProfit,
      pnl: trade.pnl,
      pnlR: trade.pnlR,
      status: trade.status,
      strategy: trade.strategy,
      type: trade.type,
      timeframe: trade.timeframe,
      notes: trade.notes || undefined,
      tags: trade.tags ? trade.tags.split(',').filter(Boolean) : undefined,
    };

    return NextResponse.json(formatted, { status: 201 });
  } catch (error) {
    console.error('Error creating trade:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to create trade', details: msg }, { status: 500 });
  }
}

// DELETE /api/trades?id=123 - Delete a trade owned by current user
export async function DELETE(request: NextRequest) {
  try {
    await ensureDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 });
    }

    await db.trade.deleteMany({
      where: {
        id: parseInt(id),
        userId: currentUser.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trade:', error);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  }
}
