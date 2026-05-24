'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, LogOut, Moon, Sun, Loader2, Check, Crown, ExternalLink, Wallet, Link2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => void;
  onSettingsSaved?: (settings: { siteName: string; siteSubtitle: string; theme: string }) => void;
}

export default function SettingsPanel({
  open,
  onOpenChange,
  onLogout,
  onSettingsSaved,
}: SettingsPanelProps) {
  const [siteName, setSiteName] = useState('');
  const [siteSubtitle, setSiteSubtitle] = useState('');
  const [theme, setTheme] = useState('dark');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [subActive, setSubActive] = useState(false);
  const [subEndDate, setSubEndDate] = useState<string | null>(null);
  const [initialBalance, setInitialBalance] = useState('');

  // Fetch current settings when panel opens
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        setSiteName(data.siteName || 'TradeVault');
        setSiteSubtitle(data.siteSubtitle || 'Analytics Pro');
        setTheme(data.theme || 'dark');
        if (data.subscription) {
          setSubActive(data.subscription.active);
          setSubEndDate(data.subscription.endDate);
        }
        if (data.initialBalance) setInitialBalance(String(data.initialBalance));
      }
    } catch {
      // Use defaults on error
      setSiteName('TradeVault');
      setSiteSubtitle('Analytics Pro');
      setTheme('dark');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open, fetchSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setShowSaved(false);
    try {
      const res = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteName, siteSubtitle, theme, initialBalance }),
      });

      if (res.ok) {
        setShowSaved(true);
        onSettingsSaved?.({ siteName, siteSubtitle, theme });
        setTimeout(() => {
          setShowSaved(false);
          onOpenChange(false);
        }, 800);
      }
    } catch {
      // Silently fail
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeToggle = (checked: boolean) => {
    const newTheme = checked ? 'light' : 'dark';
    setTheme(newTheme);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-popover border-l border-border p-0 overflow-y-auto"
      >
        {/* Custom header - override the default close button styling */}
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff6b2b]/20 to-[#ff4500]/10 border border-[#ff6b2b]/20 flex items-center justify-center">
                <Settings className="h-4 w-4 text-[#ff6b2b]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Parametres</h2>
                <p className="text-[11px] text-muted-foreground">Personnaliser votre tableau de bord</p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">Chargement des parametres...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Site Name */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Nom du site
                  </Label>
                  <Input
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="TradeVault"
                    className="h-11 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground text-sm focus-visible:border-primary/50 focus-visible:ring-primary/20"
                  />
                  <p className="text-[11px] text-muted-foreground/60">
                    Ce nom s&apos;affiche dans l&apos;en-tete et la barre laterale.
                  </p>
                </motion.div>

                {/* Site Subtitle */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  className="space-y-3"
                >
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Sous-titre
                  </Label>
                  <Input
                    value={siteSubtitle}
                    onChange={(e) => setSiteSubtitle(e.target.value)}
                    placeholder="Analytics Pro"
                    className="h-11 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground text-sm focus-visible:border-primary/50 focus-visible:ring-primary/20"
                  />
                  <p className="text-[11px] text-muted-foreground/60">
                    Sous-titre affiche sous le nom du site.
                  </p>
                </motion.div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* Theme Toggle */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="space-y-4"
                >
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Theme
                  </Label>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center">
                        {theme === 'dark' ? (
                          <Moon className="h-4 w-4 text-primary" />
                        ) : (
                          <Sun className="h-4 w-4 text-[#f59e0b]" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {theme === 'dark' ? 'Mode sombre' : 'Mode clair'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {theme === 'dark' ? 'Theme sombre actif' : 'Theme clair actif'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={theme === 'light'}
                      onCheckedChange={handleThemeToggle}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </motion.div>
                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* Subscription Info */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="space-y-3"
                >
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Abonnement
                  </Label>
                  <div className="p-4 rounded-xl bg-muted border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#ff6b2b]/20 to-[#ff4500]/10 flex items-center justify-center">
                          <Crown className="h-4 w-4 text-[#ff6b2b]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Plan Pro</p>
                          <p className="text-[11px] text-muted-foreground">25 EUR / mois</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        subActive
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {subActive ? 'Actif' : 'Expire'}
                      </span>
                    </div>
                    {subEndDate && subActive && (
                      <p className="text-[11px] text-muted-foreground">
                        Expire le {new Date(subEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    <a
                      href="/pricing"
                      className="flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 font-medium mt-2 transition-colors"
                    >
                      Gerer l&apos;abonnement
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </motion.div>
                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* Starting Balance */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="space-y-3"
                >
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Solde initial
                  </Label>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted border border-border">
                    <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        step="100"
                        value={initialBalance}
                        onChange={(e) => setInitialBalance(e.target.value)}
                        placeholder="10000"
                        className="h-9 rounded-lg bg-background border-border text-foreground text-sm"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">EUR/USD</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60">
                    Votre solde de depart pour calculer le ROI et le drawdown.
                  </p>
                </motion.div>

                {/* MT4/MT5 Connection Info */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.25 }}
                  className="space-y-3"
                >
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    MetaTrader
                  </Label>
                  <div className="p-4 rounded-xl bg-muted border border-border">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                        <Link2 className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">MT4 / MT5 Sync</p>
                        <p className="text-[11px] text-muted-foreground">Connexion via Expert Advisor</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Utilisez l&apos;Expert Advisor TradeVault dans MetaTrader pour synchroniser automatiquement vos trades. Demandez le fichier .ex4/.ex5 dans le panneau admin.
                    </p>
                  </div>
                </motion.div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {!isLoading && (
            <div className="px-6 py-5 border-t border-border space-y-3">
              {/* Save Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#ff6b2b] to-[#ff4500] text-white font-medium text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : showSaved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving
                  ? 'Enregistrement...'
                  : showSaved
                    ? 'Enregistre !'
                    : 'Enregistrer les modifications'}
              </motion.button>

              {/* Logout Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-muted border border-border text-destructive font-medium text-sm hover:bg-destructive/10 hover:border-destructive/20 transition-all"
              >
                <LogOut className="h-4 w-4" />
                Se deconnecter
              </motion.button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
