'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, RefreshCw, Loader2, TrendingUp, AlertTriangle, Target, Zap, Shield, ChevronRight } from 'lucide-react';
import { computeKPIs, type Trade } from '@/lib/mock-data';

interface AiAnalysisProps {
  trades: Trade[];
}

export default function AiAnalysis({ trades }: AiAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisType, setAnalysisType] = useState<'full' | 'quick'>('full');
  const [error, setError] = useState<string | null>(null);

  const kpis = computeKPIs(trades);
  const hasTrades = trades.length > 0;

  const runAnalysis = useCallback(async (type: 'full' | 'quick') => {
    setIsLoading(true);
    setError(null);
    setAnalysisType(type);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.analysis) {
          setAnalysis(data.analysis);
        } else {
          setError(data.message || 'Analyse indisponible.');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Erreur serveur.');
      }
    } catch {
      setError('Erreur de connexion. Verifiez votre connexion internet.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Simple markdown-like rendering
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-sm font-bold text-foreground mt-4 mb-2">{line.slice(3)}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={i} className="text-base font-bold text-foreground mt-4 mb-2">{line.slice(2)}</h2>;
      }
      // Bold
      const processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // List items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={i} className="flex items-start gap-2 ml-2 my-1">
            <ChevronRight className="h-3 w-3 text-[#ff6b2b] mt-0.5 flex-shrink-0" />
            <span className="text-xs text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: processedLine.slice(2) }} />
          </div>
        );
      }
      // Numbered list
      const numMatch = line.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <div key={i} className="flex items-start gap-2 ml-2 my-1">
            <span className="text-xs font-bold text-[#ff6b2b] mt-0.5 flex-shrink-0">{numMatch[1]}.</span>
            <span className="text-xs text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: numMatch[2].replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />
          </div>
        );
      }
      // Empty line
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }
      // Normal text
      return <p key={i} className="text-xs text-muted-foreground leading-relaxed my-1" dangerouslySetInnerHTML={{ __html: processedLine }} />;
    });
  };

  if (!hasTrades) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff6b2b]/20 to-[#ff4500]/10 border border-[#ff6b2b]/20 flex items-center justify-center mb-4">
          <Brain className="h-7 w-7 text-[#ff6b2b]" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Analyse IA</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Ajoutez des trades pour que l&apos;IA puisse analyser vos performances et vous donner des recommandations personnalisees.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Analyse IA</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Recommandations personnalisees basees sur vos performances</p>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Target className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Win Rate</p>
            <p className="text-sm font-bold text-foreground">{kpis.winRate}%</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#ff6b2b]/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-[#ff6b2b]" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">P&L Net</p>
            <p className={`text-sm font-bold ${kpis.netPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {kpis.netPnl >= 0 ? '+' : ''}{kpis.netPnl}$
            </p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Profit Factor</p>
            <p className="text-sm font-bold text-foreground">
              {kpis.profitFactor === 999 ? '∞' : kpis.profitFactor}
            </p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Total R</p>
            <p className={`text-sm font-bold ${kpis.totalR >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {kpis.totalR >= 0 ? '+' : ''}{kpis.totalR}R
            </p>
          </div>
        </div>
      </div>

      {/* Analysis Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => runAnalysis('full')}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b2b] to-[#ff4500] text-white text-sm font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Analyse Complete
        </button>
        <button
          onClick={() => runAnalysis('quick')}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm font-medium hover:bg-accent transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Analyse Rapide
        </button>
        {analysis && (
          <button
            onClick={() => runAnalysis(analysisType)}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            title="Regenerer"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-200">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-2xl p-8"
        >
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-12 h-12 rounded-xl bg-[#ff6b2b]/10 border border-[#ff6b2b]/20 flex items-center justify-center">
              <Brain className="h-6 w-6 text-[#ff6b2b] animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">L&apos;IA analyse vos performances...</p>
            <p className="text-[10px] text-muted-foreground/60">Cela peut prendre quelques secondes</p>
          </div>
        </motion.div>
      )}

      {/* Analysis Result */}
      {analysis && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-[#ff6b2b]" />
            <h4 className="text-sm font-semibold text-foreground">
              {analysisType === 'full' ? 'Analyse Complete' : 'Analyse Rapide'}
            </h4>
          </div>
          <div className="space-y-1">
            {renderMarkdown(analysis)}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
