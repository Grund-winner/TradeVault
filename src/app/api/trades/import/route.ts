import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// Zod schema for CSV row validation (same as route.ts but with preprocessing)
const csvTradeSchema = z.object({
  date: z.string().min(1, 'La date est requise'),
  instrument: z.string().min(1, "L'instrument est requis"),
  category: z.string().optional().default('Forex'),
  direction: z.enum(['BUY', 'SELL', 'Buy', 'Sell'], { message: 'La direction doit etre BUY/SELL' })
    .transform(v => v.toUpperCase() === 'BUY' ? 'BUY' : 'SELL'),
  entry: z.coerce.number({ message: "Le prix d'entree doit etre un nombre" }),
  stopLoss: z.coerce.number({ message: 'Le stop loss doit etre un nombre' }),
  takeProfit: z.coerce.number({ message: 'Le take profit doit etre un nombre' }),
  pnl: z.coerce.number({ message: 'Le P&L doit etre un nombre' }),
  pnlR: z.coerce.number({ message: 'Le P&L R doit etre un nombre' }),
  status: z.enum(['Win', 'Loss', 'Break Even', 'WIN', 'LOSS', 'BREAK EVEN', 'win', 'loss', 'break even'], {
    message: 'Le statut doit etre Win/Loss/Break Even',
  }).transform(v => {
    const lower = v.toLowerCase();
    if (lower.includes('win')) return 'Win';
    if (lower.includes('break')) return 'Break Even';
    return 'Loss';
  }),
  strategy: z.string().min(1, 'La strategie est requise'),
  type: z.enum(['Market', 'Limit', 'Stop', 'market', 'limit', 'stop', 'Market Order', 'Limit Order', 'Stop Order'], {
    message: 'Le type doit etre Market/Limit/Stop',
  }).transform(v => {
    const lower = v.toLowerCase();
    if (lower.includes('limit')) return 'Limit';
    if (lower.includes('stop')) return 'Stop';
    return 'Market';
  }),
  timeframe: z.string().optional().default('H1'),
  notes: z.string().optional().nullable().default(null),
  tags: z.union([z.array(z.string()), z.string()]).optional().nullable().default(null),
});

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() ?? '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

// POST /api/trades/import - Bulk import trades from CSV
export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Fichier CSV requis' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Le fichier doit etre un CSV' }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Le fichier CSV est vide ou invalide' }, { status: 400 });
    }

    const details: string[] = [];
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, rows start at 2

      // Parse tags if comma-separated string
      let parsedTags = row.tags;
      if (parsedTags && typeof parsedTags === 'string') {
        parsedTags = parsedTags.split(',').map(t => t.trim()).filter(Boolean);
      }

      // Parse notes - empty string should be null
      const parsedNotes = row.notes?.trim() || null;

      const parsed = csvTradeSchema.safeParse({
        date: row.date,
        instrument: row.instrument,
        category: row.category || 'Forex',
        direction: row.direction,
        entry: row.entry,
        stopLoss: row.stopLoss,
        takeProfit: row.takeProfit,
        pnl: row.pnl,
        pnlR: row.pnlR,
        status: row.status,
        strategy: row.strategy,
        type: row.type || 'Market',
        timeframe: row.timeframe || 'H1',
        notes: parsedNotes,
        tags: parsedTags,
      });

      if (!parsed.success) {
        const errMsg = parsed.error.issues.map(iss => iss.message).join(', ');
        details.push(`Ligne ${rowNum}: ${errMsg}`);
        errors++;
        continue;
      }

      const data = parsed.data;

      try {
        await db.trade.create({
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
            notes: data.notes,
            tags: data.tags ? (Array.isArray(data.tags) ? data.tags.join(',') : data.tags) : null,
            userId: currentUser.id,
            source: 'csv_import',
          },
        });
        imported++;
      } catch (dbError) {
        details.push(`Ligne ${rowNum}: Erreur de base de donnees`);
        errors++;
      }
    }

    return NextResponse.json({ imported, errors, details });
  } catch (error) {
    console.error('Error importing trades:', error);
    return NextResponse.json({ error: 'Failed to import trades' }, { status: 500 });
  }
}
