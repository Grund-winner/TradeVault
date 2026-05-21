'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, LogOut, Moon, Sun, Loader2, Check } from 'lucide-react';
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
        body: JSON.stringify({ siteName, siteSubtitle, theme }),
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
        className="w-full sm:max-w-md bg-[#111118] border-l border-white/[0.08] p-0 overflow-y-auto"
      >
        {/* Custom header - override the default close button styling */}
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff6b2b]/20 to-[#ff4500]/10 border border-[#ff6b2b]/20 flex items-center justify-center">
                <Settings className="h-4 w-4 text-[#ff6b2b]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Parametres</h2>
                <p className="text-[11px] text-[#94a3b8]">Personnaliser votre tableau de bord</p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-white/[0.08] transition-all"
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
                  <Loader2 className="h-5 w-5 text-[#ff6b2b] animate-spin" />
                  <span className="text-sm text-[#94a3b8]">Chargement des parametres...</span>
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
                  <Label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                    Nom du site
                  </Label>
                  <Input
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="TradeVault"
                    className="h-11 rounded-xl bg-white/[0.04] border-white/[0.08] text-white placeholder:text-[#475569] text-sm focus-visible:border-[#ff6b2b]/50 focus-visible:ring-[#ff6b2b]/20"
                  />
                  <p className="text-[11px] text-[#94a3b8]/60">
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
                  <Label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                    Sous-titre
                  </Label>
                  <Input
                    value={siteSubtitle}
                    onChange={(e) => setSiteSubtitle(e.target.value)}
                    placeholder="Analytics Pro"
                    className="h-11 rounded-xl bg-white/[0.04] border-white/[0.08] text-white placeholder:text-[#475569] text-sm focus-visible:border-[#ff6b2b]/50 focus-visible:ring-[#ff6b2b]/20"
                  />
                  <p className="text-[11px] text-[#94a3b8]/60">
                    Sous-titre affiche sous le nom du site.
                  </p>
                </motion.div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

                {/* Theme Toggle */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="space-y-4"
                >
                  <Label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                    Theme
                  </Label>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
                        {theme === 'dark' ? (
                          <Moon className="h-4 w-4 text-[#ff6b2b]" />
                        ) : (
                          <Sun className="h-4 w-4 text-[#f59e0b]" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {theme === 'dark' ? 'Mode sombre' : 'Mode clair'}
                        </p>
                        <p className="text-[11px] text-[#94a3b8]">
                          {theme === 'dark' ? 'Theme sombre actif' : 'Theme clair actif'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={theme === 'light'}
                      onCheckedChange={handleThemeToggle}
                      className="data-[state=checked]:bg-[#ff6b2b]"
                    />
                  </div>
                </motion.div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {!isLoading && (
            <div className="px-6 py-5 border-t border-white/[0.06] space-y-3">
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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#ef4444] font-medium text-sm hover:bg-[#ef4444]/10 hover:border-[#ef4444]/20 transition-all"
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
