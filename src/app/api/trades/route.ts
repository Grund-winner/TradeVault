import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';

// GET /api/trades - Fetch all trades
export async function GET() {
  try {
    await ensureDatabase();
    const trades = await db.trade.findMany({
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
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

// POST /api/trades - Create a new trade
export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
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
    };

    return NextResponse.json(formatted, { status: 201 });
  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 });
  }
}

// DELETE /api/trades?id=123 - Delete a trade
export async function DELETE(request: NextRequest) {
  try {
    await ensureDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 });
    }

    await db.trade.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trade:', error);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  }
}
