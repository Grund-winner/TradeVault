'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Save, LogOut, Moon, Sun, Loader2, Check, Crown, ExternalLink, Wallet, Link2, Key, Download, RefreshCw, Copy, CheckCircle2, Zap, Monitor, Camera, Trash2, Upload, Lock, Eye, EyeOff, AlertCircle, ShieldQuestion, UserX } from 'lucide-react';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MTConnectionData {
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  accountId: string | null;
  server: string | null;
  platform: string | null;
  lastSync: string | null;
}

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => void;
  onSettingsSaved?: (settings: { siteName: string; siteSubtitle: string; theme: string }) => void;
  onAvatarSaved?: (avatarUrl: string | null) => void;
}

export default function SettingsPanel({
  open,
  onOpenChange,
  onLogout,
  onSettingsSaved,
  onAvatarSaved,
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

  // MT4/MT5 state
  const [mtData, setMtData] = useState<MTConnectionData | null>(null);
  const [mtPlatform, setMtPlatform] = useState('mt4');
  const [mtAccountId, setMtAccountId] = useState('');
  const [mtServer, setMtServer] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [showFullKey, setShowFullKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Security question state
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [currentSecurityQuestion, setCurrentSecurityQuestion] = useState<string | null>(null);

  // Account deletion state
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const SECURITY_QUESTIONS = [
    'Quel est le nom de votre premier animal de compagnie ?',
    'Dans quelle ville etes-vous ne(e) ?',
    'Quel est le nom de votre ecole primaire ?',
    'Quelle est votre nourriture preferee ?',
    'Quel est le prenom de votre grand-mere maternelle ?',
    'Quel est le premier film que vous avez vu au cinema ?',
  ];

  const WEBHOOK_URL = 'https://trade-vault-xi.vercel.app/api/webhook/mt4';

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
        if (data.mt) {
          setMtData(data.mt);
          if (data.mt.platform) setMtPlatform(data.mt.platform);
          if (data.mt.accountId) setMtAccountId(data.mt.accountId);
          if (data.mt.server) setMtServer(data.mt.server);
        }
        if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        if (data.securityQuestion) {
          setCurrentSecurityQuestion(data.securityQuestion);
          setSecurityQuestion(data.securityQuestion);
        } else {
          setCurrentSecurityQuestion(null);
          setSecurityQuestion('');
        }
      }
    } catch {
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
      setNewApiKey('');
      setShowFullKey(false);
      setCopiedKey(false);
      setIsUploadingAvatar(false);
      setSecurityAnswer('');
      setSecuritySuccess(false);
      setSecurityError(null);
      setShowDeleteConfirm(false);
      setDeleteConfirmPassword('');
      setDeleteError(null);
    }
  }, [open, fetchSettings]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (200KB max)
    if (file.size > 200 * 1024) {
      alert('L\'image ne doit pas depasser 200 Ko.');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez selectionner un fichier image.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/auth/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatarUrl: base64 }),
          });
          if (res.ok) {
            setAvatarUrl(base64);
            onAvatarSaved?.(base64);
          }
        } catch {
          // silently fail
        } finally {
          setIsUploadingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      const res = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: null }),
      });
      if (res.ok) {
        setAvatarUrl(null);
        onAvatarSaved?.(null);
      }
    } catch {
      // silently fail
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setShowSaved(false);
    try {
      const res = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteName, siteSubtitle, theme, initialBalance, mtAccountId, mtServer, mtPlatform }),
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

  const handleGenerateApiKey = async () => {
    setIsGeneratingKey(true);
    try {
      const res = await fetch('/api/settings/api-key', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setNewApiKey(data.apiKey);
        setShowFullKey(true);
        setMtData(prev => prev ? { ...prev, hasApiKey: true, apiKeyMasked: data.apiKey } : { hasApiKey: true, apiKeyMasked: data.apiKey, accountId: null, server: null, platform: 'mt4', lastSync: null });
      }
    } catch {
      // Silently fail
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = key;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleDownloadEA = (platform: 'mt4' | 'mt5') => {
    window.open(`/api/settings/ea-download?platform=${platform}`, '_blank');
  };

  const getTimeSinceSync = (lastSyncStr: string | null): string => {
    if (!lastSyncStr) return 'Jamais';
    const lastSync = new Date(lastSyncStr);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "A l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-popover border-l border-border p-0 overflow-y-auto"
      >
        {/* Custom header */}
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
                </motion.div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* Avatar Upload */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.075 }}
                  className="space-y-3"
                >
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Photo de profil
                  </Label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-lg font-bold text-white overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          'TV'
                        )}
                      </div>
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 rounded-2xl bg-background/60 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-xs font-medium hover:bg-accent transition-all cursor-pointer">
                        <Upload className="h-3.5 w-3.5" />
                        Changer
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                      </label>
                      {avatarUrl && (
                        <button
                          onClick={handleRemoveAvatar}
                          disabled={isUploadingAvatar}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60">
                    JPG, PNG ou GIF. Taille maximale : 200 Ko.
                  </p>
                </motion.div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* Change Password */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.085 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-400" />
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Changer le mot de passe
                    </Label>
                  </div>
                  <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
                    <div className="relative">
                      <Input
                        type={showPasswords ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(null); setPasswordSuccess(false); }}
                        placeholder="Mot de passe actuel"
                        className="h-9 rounded-lg bg-background border-border text-foreground text-sm pr-9 placeholder:text-muted-foreground/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showPasswords ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); setPasswordSuccess(false); }}
                        placeholder="Nouveau mot de passe (min. 6 caracteres)"
                        className="h-9 rounded-lg bg-background border-border text-foreground text-sm pr-9 placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <div className="relative">
                      <Input
                        type={showPasswords ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null); setPasswordSuccess(false); }}
                        placeholder="Confirmer le nouveau mot de passe"
                        className="h-9 rounded-lg bg-background border-border text-foreground text-sm pr-9 placeholder:text-muted-foreground/50"
                      />
                    </div>
                    {passwordError && (
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        <p className="text-[11px]">{passwordError}</p>
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="flex items-center gap-2 text-green-400">
                        <Check className="h-3.5 w-3.5 flex-shrink-0" />
                        <p className="text-[11px]">Mot de passe modifie avec succes !</p>
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        if (!currentPassword || !newPassword || !confirmPassword) {
                          setPasswordError('Tous les champs sont requis.');
                          return;
                        }
                        if (newPassword.length < 6) {
                          setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caracteres.');
                          return;
                        }
                        if (newPassword !== confirmPassword) {
                          setPasswordError('Les mots de passe ne correspondent pas.');
                          return;
                        }
                        setIsChangingPassword(true);
                        setPasswordError(null);
                        try {
                          const res = await fetch('/api/auth/change-password', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ currentPassword, newPassword }),
                          });
                          if (res.ok) {
                            setPasswordSuccess(true);
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                          } else {
                            const data = await res.json().catch(() => ({}));
                            setPasswordError(data.error || 'Erreur lors du changement de mot de passe.');
                          }
                        } catch {
                          setPasswordError('Erreur de connexion. Reessayez.');
                        } finally {
                          setIsChangingPassword(false);
                        }
                      }}
                      disabled={isChangingPassword}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-all disabled:opacity-50"
                    >
                      {isChangingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                      Modifier le mot de passe
                    </button>
                  </div>
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

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* ========== MT4/MT5 CONNECTION SECTION ========== */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.25 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-blue-400" />
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      MetaTrader 4 / 5
                    </Label>
                  </div>

                  {/* MT Connection Card */}
                  <div className="p-4 rounded-xl bg-muted border border-border space-y-4">
                    {/* Status badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${mtData?.lastSync ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground/30'}`} />
                        <span className="text-xs font-medium text-foreground">
                          {mtData?.hasApiKey ? 'Connecte' : 'Non configure'}
                        </span>
                      </div>
                      {mtData?.lastSync && (
                        <span className="text-[10px] text-muted-foreground">
                          Derniere sync: {getTimeSinceSync(mtData.lastSync)}
                        </span>
                      )}
                    </div>

                    {/* Platform Selection */}
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground font-medium">Plateforme</p>
                      <Select value={mtPlatform} onValueChange={setMtPlatform}>
                        <SelectTrigger className="h-9 rounded-lg bg-background border-border text-foreground text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="mt4">MetaTrader 4 (MT4)</SelectItem>
                          <SelectItem value="mt5">MetaTrader 5 (MT5)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* MT Account ID */}
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground font-medium">Numero de compte</p>
                      <Input
                        value={mtAccountId}
                        onChange={(e) => setMtAccountId(e.target.value)}
                        placeholder="ex: 12345678"
                        className="h-9 rounded-lg bg-background border-border text-foreground text-sm placeholder:text-muted-foreground/50"
                      />
                    </div>

                    {/* MT Server */}
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground font-medium">Serveur</p>
                      <Input
                        value={mtServer}
                        onChange={(e) => setMtServer(e.target.value)}
                        placeholder="ex: ICMarketsSC-Demo"
                        className="h-9 rounded-lg bg-background border-border text-foreground text-sm placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>

                  {/* API Key Section */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-600/5 border border-blue-500/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-blue-400" />
                      <p className="text-xs font-semibold text-foreground">Cle API</p>
                    </div>

                    {/* Show existing or new key */}
                    {(mtData?.hasApiKey || newApiKey) && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 rounded-lg bg-background border border-border font-mono text-xs text-foreground truncate">
                          {showFullKey && newApiKey
                            ? newApiKey
                            : (newApiKey || mtData?.apiKeyMasked || '')}
                        </div>
                        <button
                          onClick={() => handleCopyKey(newApiKey || mtData?.apiKeyMasked || '')}
                          className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                          title="Copier"
                        >
                          {copiedKey ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        {newApiKey && (
                          <button
                            onClick={() => setShowFullKey(!showFullKey)}
                            className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                            title={showFullKey ? 'Masquer' : 'Afficher'}
                          >
                            {showFullKey ? (
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {newApiKey && showFullKey && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-[11px] text-amber-300">
                          <strong>Important:</strong> Sauvegardez cette cle maintenant. Elle ne sera plus affichee en entier apres la fermeture de ce panneau.
                        </p>
                      </div>
                    )}

                    {/* Generate button */}
                    <button
                      onClick={handleGenerateApiKey}
                      disabled={isGeneratingKey}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-all disabled:opacity-50"
                    >
                      {isGeneratingKey ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      {mtData?.hasApiKey ? 'Regenerer la cle API' : 'Generer une cle API'}
                    </button>
                  </div>

                  {/* Webhook URL */}
                  <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-[#ff6b2b]" />
                      <p className="text-xs font-semibold text-foreground">URL du Webhook</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-lg bg-background border border-border font-mono text-[11px] text-muted-foreground truncate">
                        {WEBHOOK_URL}
                      </div>
                      <button
                        onClick={() => handleCopyKey(WEBHOOK_URL)}
                        className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                        title="Copier l'URL"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">
                      Cette URL est pre-configuree dans l&apos;Expert Advisor.
                    </p>
                  </div>

                  {/* Download EA */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/5 to-green-600/5 border border-green-500/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-green-400" />
                      <p className="text-xs font-semibold text-foreground">Expert Advisor (EA)</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Telechargez le fichier EA et installez-le dans MetaTrader. Votre cle API est automatiquement integree.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleDownloadEA('mt4')}
                        disabled={!mtData?.hasApiKey && !newApiKey}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Download className="h-3.5 w-3.5" />
                        MT4 (.mq4)
                      </button>
                      <button
                        onClick={() => handleDownloadEA('mt5')}
                        disabled={!mtData?.hasApiKey && !newApiKey}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Download className="h-3.5 w-3.5" />
                        MT5 (.mq5)
                      </button>
                    </div>
                    {!mtData?.hasApiKey && !newApiKey && (
                      <p className="text-[10px] text-muted-foreground/50 text-center">
                        Generez une cle API d&apos;abord pour telecharger l&apos;EA
                      </p>
                    )}
                  </div>

                  {/* Installation Steps */}
                  <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-semibold text-foreground">Guide d&apos;installation</p>
                    </div>
                    <ol className="space-y-2 text-[11px] text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span>
                        <span>Ouvrez les parametres Expert Advisors dans MetaTrader (Outils &gt; Options &gt; Expert Advisors) et cochez &quot;Autoriser WebRequest&quot;</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span>
                        <span>Ajoutez <code className="text-[10px] bg-background px-1 rounded">trade-vault-xi.vercel.app</code> a la liste des URL autorisees</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">3</span>
                        <span>Placez le fichier .mq4/.mq5 dans le dossier MQL4/Experts ou MQL5/Experts</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">4</span>
                        <span>Compilez le fichier dans MetaEditor, puis attachez l&apos;EA a un graphique</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">5</span>
                        <span>L&apos;EA synchronise automatiquement vos trades fermes toutes les 5 minutes</span>
                      </li>
                    </ol>
                  </div>
                </motion.div>
                {/* Security Question Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <ShieldQuestion className="h-4 w-4 text-purple-400" />
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Question de securite
                    </Label>
                  </div>
                  <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
                    {currentSecurityQuestion && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                        <Check className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                        <p className="text-[11px] text-green-400">Question configuree</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground font-medium">Question de securite</p>
                      <Select value={securityQuestion} onValueChange={(val) => { setSecurityQuestion(val); setSecuritySuccess(false); setSecurityError(null); }}>
                        <SelectTrigger className="h-9 rounded-lg bg-background border-border text-foreground text-xs">
                          <SelectValue placeholder="Choisir une question..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {SECURITY_QUESTIONS.map((q) => (
                            <SelectItem key={q} value={q}>{q}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground font-medium">Votre reponse</p>
                      <Input
                        type="text"
                        value={securityAnswer}
                        onChange={(e) => { setSecurityAnswer(e.target.value); setSecuritySuccess(false); setSecurityError(null); }}
                        placeholder="Entrez votre reponse secrete"
                        className="h-9 rounded-lg bg-background border-border text-foreground text-sm placeholder:text-muted-foreground/50"
                      />
                    </div>
                    {securityError && (
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        <p className="text-[11px]">{securityError}</p>
                      </div>
                    )}
                    {securitySuccess && (
                      <div className="flex items-center gap-2 text-green-400">
                        <Check className="h-3.5 w-3.5 flex-shrink-0" />
                        <p className="text-[11px]">Question de securite enregistree !</p>
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        if (!securityQuestion) {
                          setSecurityError('Veuillez choisir une question.');
                          return;
                        }
                        if (!securityAnswer.trim()) {
                          setSecurityError('Veuillez entrer votre reponse.');
                          return;
                        }
                        setIsSavingSecurity(true);
                        setSecurityError(null);
                        try {
                          const res = await fetch('/api/auth/settings', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ securityQuestion, securityAnswer }),
                          });
                          if (res.ok) {
                            setSecuritySuccess(true);
                            setCurrentSecurityQuestion(securityQuestion);
                          } else {
                            const data = await res.json().catch(() => ({}));
                            setSecurityError(data.error || 'Erreur lors de l\'enregistrement.');
                          }
                        } catch {
                          setSecurityError('Erreur de connexion. Reessayez.');
                        } finally {
                          setIsSavingSecurity(false);
                        }
                      }}
                      disabled={isSavingSecurity}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-all disabled:opacity-50"
                    >
                      {isSavingSecurity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldQuestion className="h-3.5 w-3.5" />}
                      Enregistrer la question de securite
                    </button>
                  </div>
                </motion.div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* Zone dangereuse - Account Deletion */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.35 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-destructive" />
                    <Label className="text-xs font-medium text-destructive uppercase tracking-wider">
                      Zone dangereuse
                    </Label>
                  </div>
                  <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Supprimer mon compte</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Cette action est irreversible. Toutes vos donnees (trades, abonnements, conversations AI, etc.) seront definitivement supprimees.
                      </p>
                    </div>

                    <AnimatePresence>
                      {showDeleteConfirm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-3 overflow-hidden"
                        >
                          <div className="relative">
                            <Input
                              type="password"
                              value={deleteConfirmPassword}
                              onChange={(e) => { setDeleteConfirmPassword(e.target.value); setDeleteError(null); }}
                              placeholder="Confirmez avec votre mot de passe"
                              className="h-9 rounded-lg bg-background border-destructive/30 text-foreground text-sm placeholder:text-muted-foreground/50"
                            />
                          </div>
                          {deleteError && (
                            <div className="flex items-center gap-2 text-destructive">
                              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                              <p className="text-[11px]">{deleteError}</p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmPassword(''); setDeleteError(null); }}
                              disabled={isDeletingAccount}
                              className="flex-1 py-2 rounded-lg bg-muted border border-border text-foreground text-xs font-medium hover:bg-accent transition-all disabled:opacity-50"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={async () => {
                                if (!deleteConfirmPassword) {
                                  setDeleteError('Veuillez entrer votre mot de passe.');
                                  return;
                                }
                                setIsDeletingAccount(true);
                                setDeleteError(null);
                                try {
                                  const res = await fetch('/api/auth/change-password', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ currentPassword: deleteConfirmPassword, newPassword: deleteConfirmPassword }),
                                  });
                                  if (res.ok) {
                                    // Password verified, now delete account
                                    const delRes = await fetch('/api/auth/account', { method: 'DELETE' });
                                    if (delRes.ok) {
                                      onOpenChange(false);
                                      onLogout();
                                    } else {
                                      const data = await delRes.json().catch(() => ({}));
                                      setDeleteError(data.error || 'Erreur lors de la suppression.');
                                    }
                                  } else {
                                    setDeleteError('Mot de passe incorrect.');
                                  }
                                } catch {
                                  setDeleteError('Erreur de connexion. Reessayez.');
                                } finally {
                                  setIsDeletingAccount(false);
                                }
                              }}
                              disabled={isDeletingAccount}
                              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-destructive text-white text-xs font-medium hover:bg-destructive/90 transition-all disabled:opacity-50"
                            >
                              {isDeletingAccount ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              Confirmer la suppression
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!showDeleteConfirm && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/20 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Supprimer mon compte
                      </button>
                    )}
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
