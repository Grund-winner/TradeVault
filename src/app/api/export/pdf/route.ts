import { NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

interface TradeRow {
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
  pips: number;
  notes: string | null;
}

interface KPIs {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  totalR: number;
  profitFactor: number;
  maxConsWins: number;
  maxConsLosses: number;
  avgWin: number;
  avgLoss: number;
  grossWins: number;
  grossLosses: number;
  wins: number;
  losses: number;
  breakEven: number;
  bestTrade: number;
  worstTrade: number;
}

function computeKPIs(trades: TradeRow[]): KPIs {
  const closedTrades = trades.filter(
    (t) => t.status === 'win' || t.status === 'loss' || t.status === 'breakeven'
  );

  const wins = closedTrades.filter((t) => t.status === 'win');
  const losses = closedTrades.filter((t) => t.status === 'loss');
  const breakEven = closedTrades.filter((t) => t.status === 'breakeven');

  const grossWins = wins.reduce((sum, t) => sum + t.pnl, 0);
  const grossLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
  const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalR = closedTrades.reduce((sum, t) => sum + t.pnl_r, 0);

  const avgWin = wins.length > 0 ? grossWins / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLosses / losses.length : 0;
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;

  // Max consecutive wins/losses
  let maxConsWins = 0;
  let maxConsLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

  for (const t of closedTrades) {
    if (t.status === 'win') {
      currentWins++;
      currentLosses = 0;
      maxConsWins = Math.max(maxConsWins, currentWins);
    } else if (t.status === 'loss') {
      currentLosses++;
      currentWins = 0;
      maxConsLosses = Math.max(maxConsLosses, currentLosses);
    } else {
      currentWins = 0;
      currentLosses = 0;
    }
  }

  const allPnls = closedTrades.map((t) => t.pnl);
  const bestTrade = allPnls.length > 0 ? Math.max(...allPnls) : 0;
  const worstTrade = allPnls.length > 0 ? Math.min(...allPnls) : 0;

  return {
    totalTrades: closedTrades.length,
    winRate,
    totalPnl,
    totalR,
    profitFactor,
    maxConsWins,
    maxConsLosses,
    avgWin,
    avgLoss,
    grossWins,
    grossLosses,
    wins: wins.length,
    losses: losses.length,
    breakEven: breakEven.length,
    bestTrade,
    worstTrade,
  };
}

function formatNumber(n: number, decimals = 2): string {
  if (n === Infinity) return '+\u221E';
  return n.toFixed(decimals);
}

function pnlColor(val: number): string {
  if (val > 0) return '#22c55e';
  if (val < 0) return '#ef4444';
  return '#a3a3a3';
}

function generateReportHtml(
  trades: TradeRow[],
  kpis: KPIs,
  userName: string,
  generatedAt: string
): string {
  const dateRange =
    trades.length > 0
      ? `${trades[trades.length - 1].date} \u2192 ${trades[0].date}`
      : 'Aucune transaction';

  const kpiCards = [
    { label: 'Total Trades', value: String(kpis.totalTrades), color: '#ff6b2b' },
    { label: 'Win Rate', value: `${formatNumber(kpis.winRate, 1)}%`, color: '#ff6b2b' },
    { label: 'PnL Total', value: `${formatNumber(kpis.totalPnl)} \u20AC`, color: pnlColor(kpis.totalPnl) },
    { label: 'R Total', value: `${formatNumber(kpis.totalR)}R`, color: pnlColor(kpis.totalR) },
    { label: 'Profit Factor', value: formatNumber(kpis.profitFactor), color: kpis.profitFactor >= 1 ? '#22c55e' : '#ef4444' },
    { label: 'Gain Brut', value: `${formatNumber(kpis.grossWins)} \u20AC`, color: '#22c55e' },
    { label: 'Perte Brute', value: `${formatNumber(kpis.grossLosses)} \u20AC`, color: '#ef4444' },
    { label: 'Gain Moyen', value: `${formatNumber(kpis.avgWin)} \u20AC`, color: '#22c55e' },
    { label: 'Perte Moyenne', value: `${formatNumber(kpis.avgLoss)} \u20AC`, color: '#ef4444' },
    { label: 'S\u00e9rie Gagnante Max', value: String(kpis.maxConsWins), color: '#22c55e' },
    { label: 'S\u00e9rie Perdante Max', value: String(kpis.maxConsLosses), color: '#ef4444' },
    { label: 'Meilleur Trade', value: `${formatNumber(kpis.bestTrade)} \u20AC`, color: '#22c55e' },
    { label: 'Pire Trade', value: `${formatNumber(kpis.worstTrade)} \u20AC`, color: '#ef4444' },
    { label: 'Gagnants', value: String(kpis.wins), color: '#22c55e' },
    { label: 'Perdants', value: String(kpis.losses), color: '#ef4444' },
    { label: 'Breakeven', value: String(kpis.breakEven), color: '#a3a3a3' },
  ];

  const kpiCardsHtml = kpiCards
    .map(
      (c) => `
      <div class="kpi-card">
        <div class="kpi-value" style="color:${c.color}">${c.value}</div>
        <div class="kpi-label">${c.label}</div>
      </div>`
    )
    .join('\n');

  const tradeRowsHtml = trades
    .map(
      (t, i) => `
      <tr class="${t.status === 'win' ? 'row-win' : t.status === 'loss' ? 'row-loss' : 'row-be'}">
        <td>${i + 1}</td>
        <td>${t.date}</td>
        <td>${t.instrument}</td>
        <td>${t.direction}</td>
        <td>${t.category}</td>
        <td>${t.type}</td>
        <td>${t.strategy}</td>
        <td>${t.timeframe}</td>
        <td>${formatNumber(t.entry)}</td>
        <td>${formatNumber(t.stop_loss)}</td>
        <td>${formatNumber(t.take_profit)}</td>
        <td style="color:${pnlColor(t.pnl)}; font-weight:600">${formatNumber(t.pnl)} \u20AC</td>
        <td style="color:${pnlColor(t.pnl_r)}; font-weight:600">${formatNumber(t.pnl_r)}R</td>
        <td>${formatNumber(t.pips, 1)}</td>
        <td class="status-${t.status}">${t.status.toUpperCase()}</td>
        <td>${t.notes ?? ''}</td>
      </tr>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TradeVault - Rapport de Performance</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0f0f0f;
      color: #e5e5e5;
      line-height: 1.6;
      padding: 40px;
    }

    /* Screen-only: hide print button */
    .no-print {
      display: block;
      margin-bottom: 20px;
      text-align: right;
    }
    .no-print button {
      background: linear-gradient(135deg, #ff6b2b, #ff4500);
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 0.5px;
    }
    .no-print button:hover {
      opacity: 0.9;
    }

    @media print {
      body {
        background: white;
        color: #1a1a1a;
        padding: 20px;
        font-size: 11px;
      }
      .no-print {
        display: none !important;
      }
      .report-container {
        box-shadow: none !important;
        border: none !important;
      }
      .header {
        background: #ff4500 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .kpi-card {
        background: #f8f8f8 !important;
        border: 1px solid #ddd !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      table th {
        background: #1a1a1a !important;
        color: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .row-win { background: #f0fdf4 !important; }
      .row-loss { background: #fef2f2 !important; }
      .row-be { background: #fafafa !important; }
    }

    .report-container {
      max-width: 1200px;
      margin: 0 auto;
      background: #1a1a1a;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
      border: 1px solid #2a2a2a;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #ff6b2b, #ff4500);
      padding: 40px;
      color: white;
      position: relative;
      overflow: hidden;
    }
    .header::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 400px;
      height: 400px;
      background: rgba(255,255,255,0.05);
      border-radius: 50%;
    }
    .header-content {
      position: relative;
      z-index: 1;
    }
    .logo {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    .logo span {
      color: rgba(255,255,255,0.8);
      font-weight: 400;
    }
    .report-title {
      font-size: 18px;
      font-weight: 300;
      opacity: 0.95;
      margin-bottom: 20px;
    }
    .meta-row {
      display: flex;
      gap: 32px;
      font-size: 13px;
      opacity: 0.9;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .meta-label {
      font-weight: 500;
      opacity: 0.7;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 1px;
    }

    /* KPI Section */
    .section {
      padding: 32px 40px;
    }
    .section-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #888;
      margin-bottom: 20px;
      font-weight: 600;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 16px;
    }
    .kpi-card {
      background: #242424;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .kpi-value {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .kpi-label {
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    /* Trade Table */
    .table-wrapper {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    thead th {
      background: #242424;
      color: #ccc;
      padding: 12px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 2px solid #ff6b2b;
      position: sticky;
      top: 0;
    }
    tbody td {
      padding: 10px;
      border-bottom: 1px solid #2a2a2a;
      color: #ccc;
    }
    tbody tr:nth-child(even) {
      background: #1e1e1e;
    }
    tbody tr:hover {
      background: #292929;
    }
    .row-win { border-left: 3px solid #22c55e; }
    .row-loss { border-left: 3px solid #ef4444; }
    .row-be { border-left: 3px solid #a3a3a3; }

    .status-win { color: #22c55e; font-weight: 600; }
    .status-loss { color: #ef4444; font-weight: 600; }
    .status-breakeven { color: #a3a3a3; font-weight: 600; }

    /* Footer */
    .footer {
      text-align: center;
      padding: 24px;
      color: #666;
      font-size: 11px;
      border-top: 1px solid #2a2a2a;
    }
    .footer strong {
      color: #ff6b2b;
    }

    @media print {
      .kpi-grid {
        grid-template-columns: repeat(5, 1fr);
        gap: 10px;
      }
      .kpi-card { padding: 12px; }
      .kpi-value { font-size: 16px; }
      table { font-size: 9px; }
      thead th { padding: 8px 6px; font-size: 8px; }
      tbody td { padding: 6px; }
      .section { padding: 20px; }
      .header { padding: 24px; }
    }
  </style>
</head>
<body>

  <div class="no-print">
    <button onclick="window.print()">&#9112; Imprimer / Sauvegarder en PDF</button>
  </div>

  <div class="report-container">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="logo">TradeVault <span>&#x2022; Analytics Pro</span></div>
        <div class="report-title">Rapport de Performance</div>
        <div class="meta-row">
          <div class="meta-item">
            <span class="meta-label">Utilisateur</span>
            <span>${userName}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Periode</span>
            <span>${dateRange}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Genere le</span>
            <span>${generatedAt}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Total Trades</span>
            <span>${kpis.totalTrades}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="section">
      <div class="section-title">Indicateurs Cles de Performance</div>
      <div class="kpi-grid">
        ${kpiCardsHtml}
      </div>
    </div>

    <!-- Trade List -->
    <div class="section">
      <div class="section-title">Historique des Trades</div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Instrument</th>
              <th>Direction</th>
              <th>Categorie</th>
              <th>Type</th>
              <th>Strategie</th>
              <th>TF</th>
              <th>Entree</th>
              <th>SL</th>
              <th>TP</th>
              <th>PnL</th>
              <th>R</th>
              <th>Pips</th>
              <th>Statut</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${tradeRowsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <strong>TradeVault</strong> &mdash; Rapport genere automatiquement le ${generatedAt}
    </div>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;
}

export async function GET() {
  try {
    await ensureDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const trades = await db.$queryRawUnsafe<TradeRow[]>(
      `SELECT id, date, instrument, category, direction, entry, stop_loss, take_profit,
              pnl, pnl_r, status, strategy, type, timeframe, pips, notes
       FROM trades
       WHERE "userId" = $1
       ORDER BY date DESC`,
      currentUser.id
    );

    const kpis = computeKPIs(trades);

    const now = new Date();
    const generatedAt = now.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const userName = currentUser.siteName || currentUser.email;

    const html = generateReportHtml(trades, kpis, userName, generatedAt);

    const today = now.toISOString().slice(0, 10);
    const filename = `tradevault_rapport_${today}.html`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Export PDF] Erreur:', error);
    return NextResponse.json({ error: "Erreur lors de la generation du rapport" }, { status: 500 });
  }
}
