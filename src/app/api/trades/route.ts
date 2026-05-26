import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// Zod schema for trade creation/validation
const tradeSchema = z.object({
  date: z.string().min(1, 'La date est requise'),
  instrument: z.string().min(1, "L'instrument est requis"),
  category: z.string().optional().default('Forex'),
  direction: z.enum(['BUY', 'SELL'], { message: 'La direction est requise' }),
  entry: z.number({ message: "Le prix d'entree est requis" }),
  stopLoss: z.number({ message: 'Le stop loss est requis' }),
  takeProfit: z.number({ message: 'Le take profit est requis' }),
  pnl: z.number({ message: 'Le P&L est requis' }),
  pnlR: z.number({ message: 'Le P&L R est requis' }),
  status: z.enum(['Win', 'Loss', 'Break Even'], { message: 'Le statut est requis' }),
  strategy: z.string().min(1, 'La strategie est requise'),
  type: z.enum(['Market', 'Limit', 'Stop'], { message: 'Le type est requis' }),
  timeframe: z.string().optional().default('H1'),
  notes: z.string().optional().nullable(),
  tags: z.union([z.array(z.string()), z.string()]).optional().nullable(),
});

// Partial schema for trade editing (all fields optional)
const tradeUpdateSchema = tradeSchema.partial();

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

    // Validate with Zod
    const parsed = tradeSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const trade = await db.trade.create({
      data: {
        date: data.date,
        instrument: data.instrument,
        category: data.category,
        direction: data.direction,
        entry: data.entry,
        stopLoss: data.stopLoss,
        takeProfit: data.takeProfit,
        pnl: data.pnl,
        pnlR: data.pnlR,
        status: data.status,
        strategy: data.strategy,
        type: data.type,
        timeframe: data.timeframe,
        notes: data.notes || null,
        tags: data.tags ? (Array.isArray(data.tags) ? data.tags.join(',') : data.tags) : null,
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
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 });
  }
}

// PUT /api/trades - Update a trade owned by current user
export async function PUT(request: NextRequest) {
  try {
    await ensureDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Trade ID requis' }, { status: 400 });
    }

    const body = await request.json();

    // Validate with partial schema
    const parsed = tradeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (data.date !== undefined) updateData.date = data.date;
    if (data.instrument !== undefined) updateData.instrument = data.instrument;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.direction !== undefined) updateData.direction = data.direction;
    if (data.entry !== undefined) updateData.entry = data.entry;
    if (data.stopLoss !== undefined) updateData.stopLoss = data.stopLoss;
    if (data.takeProfit !== undefined) updateData.takeProfit = data.takeProfit;
    if (data.pnl !== undefined) updateData.pnl = data.pnl;
    if (data.pnlR !== undefined) updateData.pnlR = data.pnlR;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.strategy !== undefined) updateData.strategy = data.strategy;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.timeframe !== undefined) updateData.timeframe = data.timeframe;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.tags !== undefined) updateData.tags = Array.isArray(data.tags) ? data.tags.join(',') : (data.tags || null);

    // Check trade exists and belongs to user
    const existing = await db.trade.findFirst({
      where: { id: parseInt(id), userId: currentUser.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Trade non trouve' }, { status: 404 });
    }

    const trade = await db.trade.update({
      where: { id: parseInt(id) },
      data: updateData,
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

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error updating trade:', error);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
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
