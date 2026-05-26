'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, FileSpreadsheet, Loader2, CheckCircle2, Printer, BarChart3, Upload, AlertCircle, X, FileDown } from 'lucide-react';
import { computeKPIs, type Trade } from '@/lib/mock-data';

interface ExportPanelProps {
  trades: Trade[];
  onImportComplete?: () => void;
}

// Generate CSV template as a downloadable string
function generateCSVTemplate(): string {
  const headers = 'date,instrument,category,direction,entry,stopLoss,takeProfit,pnl,pnlR,status,strategy,type,timeframe,notes,tags';
  const example1 = '2025-01-15,EUR/USD,Forex,BUY,1.0850,1.0820,1.0920,350,1.75,Win,Breakout,Market,H1,"Bonne entree sur support",breakout,news';
  const example2 = '2025-01-16,GBP/JPY,Forex,SELL,188.50,189.00,187.50,-200,-1.0,Loss,Momentum,Limit,H4,"Sortie prematuree",range';
  return `${headers}\n${example1}\n${example2}\n`;
}

export default function ExportPanel({ trades, onImportComplete }: ExportPanelProps) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [pdfDone, setPdfDone] = useState(false);
  const [csvDone, setCsvDone] = useState(false);

  // Import states
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: number; details: string[] } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const downloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tradevault_modele_import.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setImportDone(false);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/trades/import', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setImportResult(result);
        setImportDone(true);
        setSelectedFile(null);
        if (result.imported > 0) {
          onImportComplete?.();
        }
        setTimeout(() => setImportDone(false), 8000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setImportResult({
          imported: 0,
          errors: 1,
          details: [errData.error || 'Erreur lors de l\'import'],
        });
      }
    } catch {
      setImportResult({
        imported: 0,
        errors: 1,
        details: ['Erreur de connexion'],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
      setImportResult(null);
      setImportDone(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  if (!hasTrades) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Import section still visible even without trades */}
        <div>
          <h3 className="text-lg font-bold text-foreground">Import &amp; Export</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Importez vos trades depuis un fichier CSV ou exportez vos donnees.
          </p>
        </div>

        {/* CSV Import Card */}
        <motion.div
          whileHover={{ y: -2 }}
          className="glass-card rounded-2xl p-6 border border-border hover:border-[#ff6b2b]/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#ff6b2b]/10 border border-[#ff6b2b]/20 flex items-center justify-center">
              <Upload className="h-6 w-6 text-[#ff6b2b]" />
            </div>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full">Import</span>
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Importer des Trades</h4>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Importez vos trades en masse depuis un fichier CSV. Telechargez d&apos;abord le modele pour connaitre le format attendu.
          </p>

          <button
            onClick={downloadTemplate}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm font-medium hover:bg-accent transition-all mb-3"
          >
            <FileDown className="h-4 w-4" />
            Telecharger le modele CSV
          </button>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-[#ff6b2b] bg-[#ff6b2b]/5'
                : selectedFile
                  ? 'border-green-500/40 bg-green-500/5'
                  : 'border-border hover:border-muted-foreground/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-foreground">{selectedFile.name}</span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setImportResult(null);
                  }}
                  className="ml-2 p-0.5 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Glissez votre fichier CSV ici
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  ou cliquez pour selectionner
                </p>
              </>
            )}
          </div>

          {selectedFile && (
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleImport}
              disabled={importing}
              className="flex items-center justify-center gap-2 w-full mt-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b2b] to-[#ff4500] text-white text-sm font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {importing ? 'Import en cours...' : 'Importer des trades'}
            </motion.button>
          )}

          <AnimatePresence>
            {importResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <div className={`rounded-xl p-3 border ${
                  importResult.errors === 0
                    ? 'bg-green-500/10 border-green-500/20'
                    : importResult.imported > 0
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {importResult.errors === 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    )}
                    <p className="text-sm font-medium text-foreground">
                      {importResult.imported} trade{importResult.imported > 1 ? 's' : ''} importé{importResult.imported > 1 ? 's' : ''}
                      {importResult.errors > 0 ? `, ${importResult.errors} erreur${importResult.errors > 1 ? 's' : ''}` : ''}
                    </p>
                  </div>
                  {importResult.details.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-0.5">
                      {importResult.details.slice(0, 10).map((detail, i) => (
                        <p key={i} className="text-[11px] text-muted-foreground">{detail}</p>
                      ))}
                      {importResult.details.length > 10 && (
                        <p className="text-[10px] text-muted-foreground/60">
                          ...et {importResult.details.length - 10} autre{importResult.details.length - 10 > 1 ? 's' : ''} erreur{importResult.details.length - 10 > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  }

  const summaryCards = [
    { label: 'Trades', value: kpis.totalTrades.toString(), color: 'text-foreground' },
    { label: 'Win Rate', value: `${kpis.winRate}%`, color: kpis.winRate >= 50 ? 'text-[#22c55e]' : 'text-amber-400' },
    { label: 'P&L Net', value: `${kpis.netPnl >= 0 ? '+' : ''}$${kpis.netPnl.toLocaleString()}`, color: kpis.netPnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]' },
    { label: 'Profit Factor', value: kpis.profitFactor === 999 ? 'Parfait' : kpis.profitFactor.toString(), color: 'text-[#ff6b2b]' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-foreground">Export &amp; Import</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Importez vos trades en masse ou exportez vos donnees en CSV / rapport PDF
        </p>
      </div>

      {/* CSV Import Section */}
      <motion.div
        whileHover={{ y: -2 }}
        className="glass-card rounded-2xl p-6 border border-border hover:border-[#ff6b2b]/30 transition-colors"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#ff6b2b]/10 border border-[#ff6b2b]/20 flex items-center justify-center">
            <Upload className="h-6 w-6 text-[#ff6b2b]" />
          </div>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full">Import</span>
        </div>
        <h4 className="text-sm font-semibold text-foreground mb-1">Importer des Trades (CSV)</h4>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          Importez vos trades en masse depuis un fichier CSV. Telechargez le modele pour connaitre le format attendu.
        </p>

        <button
          onClick={downloadTemplate}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm font-medium hover:bg-accent transition-all mb-3"
        >
          <FileDown className="h-4 w-4" />
          Telecharger le modele CSV
        </button>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-[#ff6b2b] bg-[#ff6b2b]/5'
              : selectedFile
                ? 'border-green-500/40 bg-green-500/5'
                : 'border-border hover:border-muted-foreground/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          {selectedFile ? (
            <div className="flex items-center justify-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-foreground">{selectedFile.name}</span>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setImportResult(null);
                }}
                className="ml-2 p-0.5 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Glissez votre fichier CSV ici
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                ou cliquez pour selectionner
              </p>
            </>
          )}
        </div>

        {selectedFile && (
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleImport}
            disabled={importing}
            className="flex items-center justify-center gap-2 w-full mt-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b2b] to-[#ff4500] text-white text-sm font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {importing ? 'Import en cours...' : 'Importer des trades'}
          </motion.button>
        )}

        <AnimatePresence>
          {importResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className={`rounded-xl p-3 border ${
                importResult.errors === 0
                  ? 'bg-green-500/10 border-green-500/20'
                  : importResult.imported > 0
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {importResult.errors === 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  )}
                  <p className="text-sm font-medium text-foreground">
                    {importResult.imported} trade{importResult.imported > 1 ? 's' : ''} importé{importResult.imported > 1 ? 's' : ''}
                    {importResult.errors > 0 ? `, ${importResult.errors} erreur${importResult.errors > 1 ? 's' : ''}` : ''}
                  </p>
                </div>
                {importResult.details.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-0.5">
                    {importResult.details.slice(0, 10).map((detail, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground">{detail}</p>
                    ))}
                    {importResult.details.length > 10 && (
                      <p className="text-[10px] text-muted-foreground/60">
                        ...et {importResult.details.length - 10} autre{importResult.details.length - 10 > 1 ? 's' : ''} erreur{importResult.details.length - 10 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

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
            Générez un rapport professionnel avec vos KPIs, courbe d&apos;équité et liste détaillée de tous vos trades. Format imprimable.
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
              {exportingPdf ? 'Génération...' : pdfDone ? 'Rapport généré !' : 'Générer le rapport'}
            </button>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />KPIs</span>
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" />Trades</span>
              <span className="flex items-center gap-1"><Printer className="h-3 w-3" />Imprimable</span>
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
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full">Données</span>
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Export CSV</h4>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Téléchargez tous vos trades au format CSV. Compatible avec Excel, Google Sheets et tout outil d&apos;analyse.
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
              {exportingCsv ? 'Téléchargement...' : csvDone ? 'Téléchargé !' : 'Télécharger CSV'}
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
              <li>Résumé des KPIs</li>
              <li>Courbe d&apos;équité</li>
              <li>Tableau des trades</li>
              <li>Format A4 imprimable</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Export CSV</p>
            <ul className="space-y-0.5 ml-3 list-disc">
              <li>Tous les champs de trades</li>
              <li>Pips calculés</li>
              <li>Separateur virgule</li>
              <li>Encodage UTF-8</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Import CSV</p>
            <ul className="space-y-0.5 ml-3 list-disc">
              <li>Import en masse</li>
              <li>Validation par ligne</li>
              <li>Rapport d&apos;erreurs</li>
              <li>Modele disponible</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
