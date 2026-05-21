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

    const trades = await db.$queryRawUnsafe<Array<{
      id: number;
      date: string;
      instrument: string;
      category: string;
      direction: string;
      entry: number;
      stop_loss: number;
      take_profit: number;
      pnl: number;
      pnl_r: number;
      status: string;
      strategy: string;
      type: string;
      timeframe: string;
      notes: string | null;
      tags: string | null;
    }>>(
      `SELECT * FROM trades WHERE "userId" = $1 ORDER BY date ASC`,
      currentUser.id
    );

    const formatted = trades.map(t => ({
      id: t.id,
      date: t.date,
      instrument: t.instrument,
      category: t.category,
      direction: t.direction,
      entry: t.entry,
      stopLoss: t.stop_loss,
      takeProfit: t.take_profit,
      pnl: t.pnl,
      pnlR: t.pnl_r,
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
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
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

    const result = await db.$queryRawUnsafe<Array<{ id: number }>>(
      `INSERT INTO trades (date, instrument, category, direction, entry, stop_loss, take_profit, pnl, pnl_r, status, strategy, type, timeframe, notes, tags, "userId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()) RETURNING id`,
      body.date,
      body.instrument,
      body.category,
      body.direction,
      body.entry,
      body.stopLoss,
      body.takeProfit,
      body.pnl,
      body.pnlR,
      body.status,
      body.strategy,
      body.type,
      body.timeframe,
      body.notes || null,
      body.tags ? (Array.isArray(body.tags) ? body.tags.join(',') : body.tags) : null,
      currentUser.id
    );

    const tradeId = result[0].id;

    const formatted = {
      id: tradeId,
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
      notes: body.notes || undefined,
      tags: body.tags ? (Array.isArray(body.tags) ? body.tags : body.tags.split(',')).filter(Boolean) : undefined,
    };

    return NextResponse.json(formatted, { status: 201 });
  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 });
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

    // Only delete if owned by current user
    await db.$executeRawUnsafe(
      `DELETE FROM trades WHERE id = $1 AND "userId" = $2`,
      parseInt(id),
      currentUser.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trade:', error);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  }
}
