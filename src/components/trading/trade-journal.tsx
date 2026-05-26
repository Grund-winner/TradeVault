'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowUpDown, ChevronLeft, ChevronRight, Trash2, MessageSquare, Pencil } from 'lucide-react';
import type { Trade } from '@/lib/mock-data';

interface TradeJournalProps {
  trades: Trade[];
  onDeleteTrade: (tradeId: number) => void;
  onAddClick: () => void;
  onEditTrade?: (trade: Trade) => void;
}

type SortKey = 'date' | 'instrument' | 'direction' | 'pnl' | 'pnlR' | 'status' | 'strategy';

function SortHeaderCell({ label, k, onSort }: { label: string; k: SortKey; onSort: (key: SortKey) => void }) {
  return (
    <button
      onClick={() => onSort(k)}
      className="flex items-center gap-1 hover:text-[#ff6b2b] transition-colors text-xs font-semibold uppercase tracking-wider"
    >
      {label}
      <ArrowUpDown className="h-3 w-3 opacity-40" />
    </button>
  );
}

export default function TradeJournal({ trades, onDeleteTrade, onAddClick, onEditTrade }: TradeJournalProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const sorted = useMemo(() => {
    return [...trades].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date': cmp = a.date.localeCompare(b.date); break;
        case 'instrument': cmp = a.instrument.localeCompare(b.instrument); break;
        case 'direction': cmp = a.direction.localeCompare(b.direction); break;
        case 'pnl': cmp = a.pnl - b.pnl; break;
        case 'pnlR': cmp = a.pnlR - b.pnlR; break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'strategy': cmp = a.strategy.localeCompare(b.strategy); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [trades, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Journal de Trading</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{trades.length} trade{trades.length > 1 ? 's' : ''} enregistré{trades.length > 1 ? 's' : ''}</p>
        </div>
        <Button
          onClick={onAddClick}
          className="bg-[#ff6b2b] hover:bg-[#ff4500] text-white font-medium rounded-xl px-4 shadow-lg shadow-orange-500/20 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un trade
        </Button>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground"><SortHeaderCell label="Date" k="date" onSort={toggleSort} /></TableHead>
                <TableHead className="text-muted-foreground"><SortHeaderCell label="Instrument" k="instrument" onSort={toggleSort} /></TableHead>
                <TableHead className="text-muted-foreground"><SortHeaderCell label="Direction" k="direction" onSort={toggleSort} /></TableHead>
                <TableHead className="text-muted-foreground text-right">Entree</TableHead>
                <TableHead className="text-muted-foreground text-right">SL</TableHead>
                <TableHead className="text-muted-foreground text-right">TP</TableHead>
                <TableHead className="text-muted-foreground text-right"><SortHeaderCell label="P&L ($)" k="pnl" onSort={toggleSort} /></TableHead>
                <TableHead className="text-muted-foreground text-right"><SortHeaderCell label="P&L (R)" k="pnlR" onSort={toggleSort} /></TableHead>
                <TableHead className="text-muted-foreground"><SortHeaderCell label="Statut" k="status" onSort={toggleSort} /></TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell"><SortHeaderCell label="Strategie" k="strategy" onSort={toggleSort} /></TableHead>
                <TableHead className="text-muted-foreground hidden lg:table-cell">Notes</TableHead>
                <TableHead className="text-muted-foreground w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {paginated.map((trade) => (
                  <motion.tr
                    key={trade.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="trade-row border-b border-border cursor-default"
                  >
                    <TableCell className="text-sm text-foreground font-medium">
                      {new Date(trade.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-sm text-foreground font-medium">{trade.instrument}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        trade.direction === 'Buy' ? 'border-[#22c55e]/30 text-[#22c55e] bg-[#22c55e]/10' : 'border-[#ef4444]/30 text-[#ef4444] bg-[#ef4444]/10'
                      }`}>
                        {trade.direction === 'Buy' ? 'Achat' : 'Vente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground text-right font-mono">{trade.entry}</TableCell>
                    <TableCell className="text-sm text-muted-foreground text-right font-mono">{trade.stopLoss}</TableCell>
                    <TableCell className="text-sm text-muted-foreground text-right font-mono">{trade.takeProfit}</TableCell>
                    <TableCell className={`text-sm font-bold text-right ${trade.pnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-sm font-bold text-right ${trade.pnlR >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {trade.pnlR >= 0 ? '+' : ''}{trade.pnlR}R
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        trade.status === 'Win' ? 'bg-[#22c55e]/15 text-[#22c55e] border-0' : 'bg-[#ef4444]/15 text-[#ef4444] border-0'
                      }`}>
                        {trade.status === 'Win' ? 'Gain' : 'Perte'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{trade.strategy}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {trade.notes && (
                        <button
                          title={trade.notes}
                          className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-[#ff6b2b] hover:bg-[#ff6b2b]/10 transition-all"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => onEditTrade?.(trade)}
                          className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-[#ff6b2b] hover:bg-[#ff6b2b]/10 transition-all"
                          title="Modifier ce trade"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Supprimer ce trade ?')) onDeleteTrade(trade.id); }}
                          className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
                          title="Supprimer ce trade"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                    Aucun trade trouvé pour ces filtres.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Page {page + 1} sur {totalPages} ({sorted.length} trades)
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="h-8 px-2 text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${page === i ? 'bg-[#ff6b2b] text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  {i + 1}
                </button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="h-8 px-2 text-muted-foreground hover:text-foreground">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
