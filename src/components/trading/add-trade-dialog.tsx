'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Trade, Direction, TradeType, Strategy, InstrumentCategory, Timeframe } from '@/lib/mock-data';

interface AddTradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (trade: Trade) => void;
  editTrade?: Trade | null;
  onEdit?: (trade: Trade) => void;
}

// Get pip size for an instrument
function getPipSize(instrument: string): number {
  const sym = instrument.toUpperCase();
  if (sym.includes('JPY')) return 0.01;
  if (sym.includes('XAU')) return 0.1;
  if (sym.includes('XAG')) return 0.01;
  if (sym.includes('OIL') || sym.includes('WTI') || sym.includes('BRENT')) return 0.01;
  return 0.0001;
}

export default function AddTradeDialog({ open, onOpenChange, onAdd, editTrade, onEdit }: AddTradeDialogProps) {
  const isEditing = !!editTrade;

  const [date, setDate] = useState(() => editTrade ? editTrade.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [instrument, setInstrument] = useState(() => editTrade?.instrument || '');
  const [category, setCategory] = useState<InstrumentCategory>(() => (editTrade?.category as InstrumentCategory) || 'FOREX');
  const [direction, setDirection] = useState<Direction>(() => (editTrade?.direction as Direction) || 'Buy');
  const [entry, setEntry] = useState(() => editTrade?.entry.toString() || '');
  const [stopLoss, setStopLoss] = useState(() => editTrade?.stopLoss.toString() || '');
  const [takeProfit, setTakeProfit] = useState(() => editTrade?.takeProfit.toString() || '');
  const [pnl, setPnl] = useState(() => editTrade?.pnl.toString() || '');
  const [pnlR, setPnlR] = useState(() => editTrade?.pnlR.toString() || '');
  const [status, setStatus] = useState<'Win' | 'Loss'>(() => (editTrade?.status === 'Win' || editTrade?.status === 'Break Even') ? 'Win' : 'Loss');
  const [strategy, setStrategy] = useState<Strategy>(() => (editTrade?.strategy as Strategy) || 'Breakout');
  const [type, setType] = useState<TradeType>(() => (editTrade?.type as TradeType) || 'Intraday');
  const [timeframe, setTimeframe] = useState<Timeframe>(() => (editTrade?.timeframe as Timeframe) || 'H1');
  const [notes, setNotes] = useState(() => editTrade?.notes || '');
  const [tags, setTags] = useState(() => editTrade?.tags?.join(', ') || '');

  // Auto-calculate pips
  const pipCalculations = useMemo(() => {
    const entryVal = parseFloat(entry);
    const slVal = parseFloat(stopLoss);
    const tpVal = parseFloat(takeProfit);
    const pipSize = getPipSize(instrument);

    if (!entryVal || !pipSize) {
      return { slPips: null, tpPips: null };
    }

    let slPips: number | null = null;
    let tpPips: number | null = null;

    if (slVal) {
      const distance = Math.abs(entryVal - slVal);
      slPips = Math.round(distance / pipSize);
    }

    if (tpVal) {
      const distance = Math.abs(tpVal - entryVal);
      tpPips = Math.round(distance / pipSize);
    }

    return { slPips, tpPips };
  }, [entry, stopLoss, takeProfit, instrument]);

  // Auto-detect category from instrument
  const handleInstrumentChange = (value: string) => {
    setInstrument(value);
    const sym = value.toUpperCase();
    if (sym.includes('XAU') || sym.includes('XAG') || sym.includes('OIL') || sym.includes('NATGAS')) {
      setCategory('COMMODITIES');
    } else if (sym.includes('.US') || sym.includes('AAPL') || sym.includes('TSLA') || sym.includes('AMZN') || sym.includes('MSFT') || sym.includes('GOOG')) {
      setCategory('STOCKS');
    } else {
      setCategory('FOREX');
    }
  };

  const handleSubmit = () => {
    if (!instrument || !entry || !stopLoss || !takeProfit || !pnl) return;

    const entryVal = parseFloat(entry);
    const slVal = parseFloat(stopLoss);
    const pipSize = getPipSize(instrument);
    const slPips = pipSize > 0 ? Math.round(Math.abs(entryVal - slVal) / pipSize) : 0;

    const trade: Trade = {
      id: editTrade?.id || Date.now(),
      date,
      instrument: instrument.toUpperCase(),
      category,
      direction,
      entry: entryVal,
      stopLoss: slVal,
      takeProfit: parseFloat(takeProfit),
      pnl: parseFloat(pnl),
      pnlR: pnlR ? parseFloat(pnlR) : parseFloat(pnl) > 0 ? 1.0 : -1.0,
      status,
      strategy,
      type,
      timeframe,
      notes: notes || undefined,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    };

    if (isEditing && onEdit) {
      onEdit(trade);
    } else {
      onAdd(trade);
    }
    onOpenChange(false);

    // Reset form
    setInstrument('');
    setEntry('');
    setStopLoss('');
    setTakeProfit('');
    setPnl('');
    setPnlR('');
    setNotes('');
    setTags('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            {isEditing ? 'Modifier le Trade' : 'Ajouter un Trade'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEditing
              ? 'Modifiez les détails de votre opération.'
              : 'Enregistrez les détails de votre nouvelle opération.'
            }
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 mt-2"
        >
          {/* Row 1: Date & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-muted border-border text-foreground text-sm h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Résultat</Label>
              <Select value={status} onValueChange={v => setStatus(v as 'Win' | 'Loss')}>
                <SelectTrigger className="bg-muted border-border text-foreground text-sm h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="Win" className="text-[#22c55e]">Gain</SelectItem>
                  <SelectItem value="Loss" className="text-[#ef4444]">Perte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Instrument & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Instrument</Label>
              <Input
                placeholder="ex: EUR/USD"
                value={instrument}
                onChange={e => handleInstrumentChange(e.target.value)}
                className="bg-muted border-border text-foreground text-sm h-10 rounded-xl placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Catégorie</Label>
              <Select value={category} onValueChange={v => setCategory(v as InstrumentCategory)}>
                <SelectTrigger className="bg-muted border-border text-foreground text-sm h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="FOREX">FOREX</SelectItem>
                  <SelectItem value="COMMODITIES">COMMODITIES</SelectItem>
                  <SelectItem value="STOCKS">STOCKS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Direction & Strategy */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Direction</Label>
              <Select value={direction} onValueChange={v => setDirection(v as Direction)}>
                <SelectTrigger className="bg-muted border-border text-foreground text-sm h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Stratégie</Label>
              <Select value={strategy} onValueChange={v => setStrategy(v as Strategy)}>
                <SelectTrigger className="bg-muted border-border text-foreground text-sm h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="Breakout">Breakout</SelectItem>
                  <SelectItem value="Momentum">Momentum</SelectItem>
                  <SelectItem value="Mean Reversion">Mean Reversion</SelectItem>
                  <SelectItem value="Range">Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Entry, SL, TP with pip calculations */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Entrée</Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={entry}
                onChange={e => setEntry(e.target.value)}
                className="bg-muted border-border text-foreground text-sm h-10 rounded-xl placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">
                Stop Loss
                {pipCalculations.slPips !== null && (
                  <span className="ml-1.5 text-[#ef4444] font-semibold">{pipCalculations.slPips} pips</span>
                )}
              </Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={stopLoss}
                onChange={e => setStopLoss(e.target.value)}
                className="bg-muted border-border text-foreground text-sm h-10 rounded-xl placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">
                Take Profit
                {pipCalculations.tpPips !== null && (
                  <span className="ml-1.5 text-[#22c55e] font-semibold">{pipCalculations.tpPips} pips</span>
                )}
              </Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={takeProfit}
                onChange={e => setTakeProfit(e.target.value)}
                className="bg-muted border-border text-foreground text-sm h-10 rounded-xl placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          {/* Pip info bar */}
          {pipCalculations.slPips !== null && pipCalculations.tpPips !== null && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">SL</p>
                  <p className="text-sm font-bold text-[#ef4444]">{pipCalculations.slPips} pips</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">TP</p>
                  <p className="text-sm font-bold text-[#22c55e]">{pipCalculations.tpPips} pips</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Ratio</p>
                  <p className="text-sm font-bold text-[#ff6b2b]">
                    {pipCalculations.slPips > 0 ? (pipCalculations.tpPips / pipCalculations.slPips).toFixed(1) : '-'}:1
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Row 5: P&L, R-Multiple, Type */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">P&L ($)</Label>
              <Input
                type="number"
                step="any"
                placeholder="+500"
                value={pnl}
                onChange={e => setPnl(e.target.value)}
                className="bg-muted border-border text-foreground text-sm h-10 rounded-xl placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">R-Multiple</Label>
              <Input
                type="number"
                step="0.5"
                placeholder="1.0"
                value={pnlR}
                onChange={e => setPnlR(e.target.value)}
                className="bg-muted border-border text-foreground text-sm h-10 rounded-xl placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Type / TF</Label>
              <div className="flex gap-1">
                <Select value={type} onValueChange={v => setType(v as TradeType)}>
                  <SelectTrigger className="bg-muted border-border text-foreground text-xs h-10 rounded-xl flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="Intraday">Intra</SelectItem>
                    <SelectItem value="Multiday">Multi</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={timeframe} onValueChange={v => setTimeframe(v as Timeframe)}>
                  <SelectTrigger className="bg-muted border-border text-foreground text-xs h-10 rounded-xl w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="M1">M1</SelectItem>
                    <SelectItem value="M5">M5</SelectItem>
                    <SelectItem value="M15">M15</SelectItem>
                    <SelectItem value="M30">M30</SelectItem>
                    <SelectItem value="H1">H1</SelectItem>
                    <SelectItem value="H4">H4</SelectItem>
                    <SelectItem value="D1">D1</SelectItem>
                    <SelectItem value="W1">W1</SelectItem>
                    <SelectItem value="MN">MN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Row 6: Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Notes</Label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Raisons du trade, observations, emotions..."
              rows={3}
              className="w-full bg-muted border-border text-foreground text-sm rounded-xl px-3 py-2 placeholder:text-muted-foreground/50 resize-none focus:border-[#ff6b2b]/40 focus:ring-[#ff6b2b]/20 outline-none"
            />
          </div>

          {/* Row 7: Tags */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Tags</Label>
            <Input
              placeholder="scalp, news, breakout... (séparés par des virgules)"
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="bg-muted border-border text-foreground text-sm h-10 rounded-xl placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 h-10 rounded-xl bg-[#ff6b2b] hover:bg-[#ff4500] text-white font-medium shadow-lg shadow-orange-500/20 transition-all"
            >
              {isEditing ? 'Enregistrer les modifications' : 'Ajouter le trade'}
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
