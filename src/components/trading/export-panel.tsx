'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, FileSpreadsheet, Loader2, CheckCircle2, Printer, BarChart3 } from 'lucide-react';
import { computeKPIs, type Trade } from '@/lib/mock-data';

interface ExportPanelProps {
  trades: Trade[];
}

export default function ExportPanel({ trades }: ExportPanelProps) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [pdfDone, setPdfDone] = useState(false);
  const [csvDone, setCsvDone] = useState(false);

  const kpis = computeKPIs(trades);
  const hasTrades = trades.length > 0;

  const exportCsv = async () => {
    setExportingCsv(true);
    setCsvDone(false);
    try {
      const res = await fetch('/api/export/csv');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `tradevault_export_${date}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setCsvDone(true);
        setTimeout(() => setCsvDone(false), 3000);
      }
    } catch {
      // silent
    } finally {
      setExportingCsv(false);
    }
  };

  const exportPdf = async () => {
    setExportingPdf(true);
    setPdfDone(false);
    try {
      const res = await fetch('/api/export/pdf');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setPdfDone(true);
        setTimeout(() => setPdfDone(false), 3000);
      }
    } catch {
      // silent
    } finally {
      setExportingPdf(false);
    }
  };

  if (!hasTrades) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff6b2b]/20 to-[#ff4500]/10 border border-[#ff6b2b]/20 flex items-center justify-center mb-4">
          <Download className="h-7 w-7 text-[#ff6b2b]" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Exporter vos donnees</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Ajoutez des trades pour pouvoir exporter votre journal et vos rapports de performance.
        </p>
      </motion.div>
    );
  }

  const summaryCards = [
    { label: 'Trades', value: kpis.totalTrades.toString(), color: 'text-foreground' },
    { label: 'Win Rate', value: `${kpis.winRate}%`, color: kpis.winRate >= 50 ? 'text-[#22c55e]' : 'text-amber-400' },
    { label: 'P&L Net', value: `${kpis.netPnl >= 0 ? '+' : ''}$${kpis.netPnl.toLocaleString()}`, color: kpis.netPnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]' },
    { label: 'Profit Factor', value: kpis.profitFactor === 999 ? '∞' : kpis.profitFactor.toString(), color: 'text-[#ff6b2b]' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-foreground">Export &amp; Impression</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Telechargez vos donnees en CSV ou generez un rapport PDF professionnel
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{card.label}</p>
            <p className={`text-lg font-bold ${card.color} mt-1`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PDF Export */}
        <motion.div
          whileHover={{ y: -2 }}
          className="glass-card rounded-2xl p-6 border border-border hover:border-[#ff6b2b]/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <FileText className="h-6 w-6 text-red-400" />
            </div>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full">Rapport</span>
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Rapport PDF</h4>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Generez un rapport professionnel avec vos KPIs, courbe d&apos;equite et liste detaillee de tous vos trades. Format imprimable.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={exportPdf}
              disabled={exportingPdf}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b2b] to-[#ff4500] text-white text-sm font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50"
            >
              {exportingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : pdfDone ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              {exportingPdf ? 'Generation...' : pdfDone ? 'Rapport genere !' : 'Generer le rapport'}
            </button>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />KPIs</span>
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" />Trades</span>
              <span className="flex items-center gap-1"><Printer className="h-3 w-3" />Print-ready</span>
            </div>
          </div>
        </motion.div>

        {/* CSV Export */}
        <motion.div
          whileHover={{ y: -2 }}
          className="glass-card rounded-2xl p-6 border border-border hover:border-green-500/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-green-400" />
            </div>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full">Donnees</span>
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Export CSV</h4>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Telechargez tous vos trades au format CSV. Compatible avec Excel, Google Sheets et tout outil d&apos;analyse.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={exportCsv}
              disabled={exportingCsv}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm font-medium hover:bg-accent transition-all disabled:opacity-50"
            >
              {exportingCsv ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : csvDone ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exportingCsv ? 'Telechargement...' : csvDone ? 'Telecharge !' : 'Telecharger CSV'}
            </button>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>Excel</span>
              <span>Google Sheets</span>
              <span>Numbers</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Info */}
      <div className="glass-card rounded-2xl p-4">
        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-[#ff6b2b]" />
          Contenu de l&apos;export
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[11px] text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">Rapport PDF</p>
            <ul className="space-y-0.5 ml-3 list-disc">
              <li>Resume des KPIs</li>
              <li>Courbe d&apos;equite</li>
              <li>Tableau des trades</li>
              <li>Format A4 imprimable</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Export CSV</p>
            <ul className="space-y-0.5 ml-3 list-disc">
              <li>Tous les champs de trades</li>
              <li>Pips calcules</li>
              <li>Separateur virgule</li>
              <li>Encodage UTF-8</li>
            </ul>
          </div>
          <div className="hidden md:block">
            <p className="font-medium text-foreground mb-1">Donnees inclues</p>
            <ul className="space-y-0.5 ml-3 list-disc">
              <li>{trades.length} trades</li>
              <li>Du {trades[trades.length - 1]?.date || 'N/A'}</li>
              <li>Au {trades[0]?.date || 'N/A'}</li>
              <li>Filtres actifs appliques</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
