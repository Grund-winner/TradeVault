'use client';

import { useState } from 'react';
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
}

export default function AddTradeDialog({ open, onOpenChange, onAdd }: AddTradeDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [instrument, setInstrument] = useState('');
  const [category, setCategory] = useState<InstrumentCategory>('FOREX');
  const [direction, setDirection] = useState<Direction>('Long');
  const [entry, setEntry] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [pnl, setPnl] = useState('');
  const [pnlR, setPnlR] = useState('');
  const [status, setStatus] = useState<'Win' | 'Loss'>('Win');
  const [strategy, setStrategy] = useState<Strategy>('Breakout');
  const [type, setType] = useState<TradeType>('Intraday');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');

  const handleSubmit = () => {
    if (!instrument || !entry || !stopLoss || !takeProfit || !pnl) return;

    const trade: Trade = {
      id: Date.now(),
      date,
      instrument: instrument.toUpperCase(),
      category,
      direction,
      entry: parseFloat(entry),
      stopLoss: parseFloat(stopLoss),
      takeProfit: parseFloat(takeProfit),
      pnl: parseFloat(pnl),
      pnlR: pnlR ? parseFloat(pnlR) : parseFloat(pnl) > 0 ? 1.0 : -1.0,
      status,
      strategy,
      type,
      timeframe,
    };

    onAdd(trade);
    onOpenChange(false);

    // Reset form
    setInstrument('');
    setEntry('');
    setStopLoss('');
    setTakeProfit('');
    setPnl('');
    setPnlR('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111118] border border-white/[0.08] text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">Ajouter un Trade</DialogTitle>
          <DialogDescription className="text-sm text-[#94a3b8]">
            Enregistrez les details de votre nouvelle operation.
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
              <Label className="text-xs text-[#94a3b8] font-medium">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-white/5 border-white/[0.08] text-white text-sm h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#94a3b8] font-medium">Resultat</Label>
              <Select value={status} onValueChange={v => setStatus(v as 'Win' | 'Loss')}>
                <SelectTrigger className="bg-white/5 border-white/[0.08] text-white text-sm h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                  <SelectItem value="Win" className="text-[#22c55e]">Win</SelectItem>
                  <SelectItem value="Loss" className="text-[#ef4444]">Loss</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Instrument & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#94a3b8] font-medium">Instrument</Label>
              <Input
                placeholder="ex: EUR/USD"
                value={instrument}
                onChange={e => setInstrument(e.target.value)}
                className="bg-white/5 border-white/[0.08] text-white text-sm h-10 rounded-xl placeholder:text-[#94a3b8]/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#94a3b8] font-medium">Categorie</Label>
              <Select value={category} onValueChange={v => setCategory(v as InstrumentCategory)}>
                <SelectTrigger className="bg-white/5 border-white/[0.08] text-white text-sm h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
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
              <Label className="text-xs text-[#94a3b8] font-medium">Direction</Label>
              <Select value={direction} onValueChange={v => setDirection(v as Direction)}>
                <SelectTrigger className="bg-white/5 border-white/[0.08] text-white text-sm h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                  <SelectItem value="Long">Long</SelectItem>
                  <SelectItem value="Short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#94a3b8] font-medium">Strategie</Label>
              <Select value={strategy} onValueChange={v => setStrategy(v as Strategy)}>
                <SelectTrigger className="bg-white/5 border-white/[0.08] text-white text-sm h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                  <SelectItem value="Breakout">Breakout</SelectItem>
                  <SelectItem value="Momentum">Momentum</SelectItem>
                  <SelectItem value="Mean Reversion">Mean Reversion</SelectItem>
                  <SelectItem value="Range">Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Entry, SL, TP */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#94a3b8] font-medium">Entree</Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={entry}
                onChange={e => setEntry(e.target.value)}
                className="bg-white/5 border-white/[0.08] text-white text-sm h-10 rounded-xl placeholder:text-[#94a3b8]/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#94a3b8] font-medium">Stop Loss</Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={stopLoss}
                onChange={e => setStopLoss(e.target.value)}
                className="bg-white/5 border-white/[0.08] text-white text-sm h-10 rounded-xl placeholder:text-[#94a3b8]/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#94a3b8] font-medium">Take Profit</Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={takeProfit}
                onChange={e => setTakeProfit(e.target.value)}
                className="bg-white/5 border-white/[0.08] text-white text-sm h-10 rounded-xl placeholder:text-[#94a3b8]/50"
              />
            </div>
          </div>

          {/* Row 5: P&L, R-Multiple, Type */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#94a3b8] font-medium">P&L ($)</Label>
              <Input
                type="number"
                step="any"
                placeholder="+500"
                value={pnl}
                onChange={e => setPnl(e.target.value)}
                className="bg-white/5 border-white/[0.08] text-white text-sm h-10 rounded-xl placeholder:text-[#94a3b8]/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#94a3b8] font-medium">R-Multiple</Label>
              <Input
                type="number"
                step="0.5"
                placeholder="1.0"
                value={pnlR}
                onChange={e => setPnlR(e.target.value)}
                className="bg-white/5 border-white/[0.08] text-white text-sm h-10 rounded-xl placeholder:text-[#94a3b8]/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#94a3b8] font-medium">Type / TF</Label>
              <div className="flex gap-1">
                <Select value={type} onValueChange={v => setType(v as TradeType)}>
                  <SelectTrigger className="bg-white/5 border-white/[0.08] text-white text-xs h-10 rounded-xl flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                    <SelectItem value="Intraday">Intra</SelectItem>
                    <SelectItem value="Multiday">Multi</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={timeframe} onValueChange={v => setTimeframe(v as Timeframe)}>
                  <SelectTrigger className="bg-white/5 border-white/[0.08] text-white text-xs h-10 rounded-xl w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a24] border-white/[0.08]">
                    <SelectItem value="1h">1h</SelectItem>
                    <SelectItem value="2h">2h</SelectItem>
                    <SelectItem value="4h">4h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 rounded-xl text-[#94a3b8] hover:text-white hover:bg-white/5"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 h-10 rounded-xl bg-[#ff6b2b] hover:bg-[#ff4500] text-white font-medium shadow-lg shadow-orange-500/20 transition-all"
            >
              Ajouter le trade
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
