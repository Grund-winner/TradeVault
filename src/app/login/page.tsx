'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, ArrowLeft, UserPlus, LogIn, ShieldQuestion, Mail, KeyRound, CheckCircle2 } from 'lucide-react';

type Tab = 'login' | 'register';
type ResetStep = 'idle' | 'email' | 'question' | 'answer' | 'newPassword' | 'success';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // Forgot password state
  const [resetStep, setResetStep] = useState<ResetStep>('idle');
  const [resetEmail, setResetEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPasswordReset, setNewPasswordReset] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetIsLoading, setResetIsLoading] = useState(false);

  // Get redirect destination after login
  const redirectTo = searchParams.get('from') || '/';

  // Apply saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('tv-theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(redirectTo);
      } else {
        setError(data.error || 'Erreur de connexion');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Compte cree avec succes ! Connexion en cours...');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setError(data.error || 'Erreur lors de la creation du compte');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = activeTab === 'login' ? handleLogin : handleRegister;

  // Forgot password handlers
  const handleFetchSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetIsLoading(true);

    try {
      const res = await fetch('/api/auth/security-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();

      if (data.hasQuestion) {
        setSecurityQuestion(data.question);
        setResetStep('question');
      } else {
        setResetError('Aucune question de securite configuree pour ce compte. Veuillez contacter un administrateur.');
      }
    } catch {
      setResetError('Erreur de connexion au serveur');
    } finally {
      setResetIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (newPasswordReset !== confirmNewPassword) {
      setResetError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPasswordReset.length < 6) {
      setResetError('Le nouveau mot de passe doit contenir au moins 6 caracteres.');
      return;
    }

    setResetIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          securityAnswer,
          newPassword: newPasswordReset,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setResetStep('success');
      } else {
        setResetError(data.error || 'Erreur lors de la reinitialisation');
      }
    } catch {
      setResetError('Erreur de connexion au serveur');
    } finally {
      setResetIsLoading(false);
    }
  };

  const resetForgotPassword = () => {
    setResetStep('idle');
    setResetEmail('');
    setSecurityQuestion('');
    setSecurityAnswer('');
    setNewPasswordReset('');
    setConfirmNewPassword('');
    setResetError('');
    setShowResetPassword(false);
  };

  const pageVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  // ---- RESET PASSWORD FLOW ----
  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff6b2b]/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#ff4500]/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-border/30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-border/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-[#ff6b2b]/10" />
        </div>
        <div className="absolute inset-0 grid-bg opacity-50" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff6b2b] to-[#ff4500] flex items-center justify-center shadow-xl shadow-orange-500/20">
                <img src="/logo.png" alt="TradeVault" className="w-7 h-7 object-contain" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">TradeVault</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Analytics Pro</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Reinitialisation du mot de passe
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-3xl border border-border bg-card backdrop-blur-2xl shadow-2xl p-8"
          >
            {/* Back button */}
            <button
              type="button"
              onClick={resetForgotPassword}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour a la connexion
            </button>

            <AnimatePresence mode="wait">
              {/* Step: Enter email */}
              {resetStep === 'idle' && (
                <motion.form
                  key="email"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  onSubmit={handleFetchSecurityQuestion}
                  className="space-y-5"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[#ff6b2b]/10 border border-[#ff6b2b]/20 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-[#ff6b2b]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Mot de passe oublie ?</h2>
                      <p className="text-xs text-muted-foreground">Entrez votre email pour commencer</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="votre@email.com"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-[#ff6b2b]/50 focus:ring-1 focus:ring-[#ff6b2b]/20 transition-all"
                    />
                  </div>

                  <AnimatePresence>
                    {resetError && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                      >
                        {resetError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={resetIsLoading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#ff6b2b] to-[#ff4500] text-white font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetIsLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Suivant
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}

              {/* Step: Show security question & get answer */}
              {(resetStep === 'question' || resetStep === 'answer') && (
                <motion.form
                  key="question"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    setResetError('');
                    if (!securityAnswer.trim()) {
                      setResetError('Veuillez entrer votre reponse.');
                      return;
                    }
                    setResetStep('newPassword');
                  }}
                  className="space-y-5"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <ShieldQuestion className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Question de securite</h2>
                      <p className="text-xs text-muted-foreground">Repondez pour continuer</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-muted border border-border">
                    <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Votre question</p>
                    <p className="text-sm text-foreground">{securityQuestion}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Votre reponse
                    </label>
                    <input
                      type="text"
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      placeholder="Entrez votre reponse"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-[#ff6b2b]/50 focus:ring-1 focus:ring-[#ff6b2b]/20 transition-all"
                    />
                  </div>

                  <AnimatePresence>
                    {resetError && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                      >
                        {resetError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#ff6b2b] to-[#ff4500] text-white font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
                  >
                    Suivant
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </motion.form>
              )}

              {/* Step: Enter new password */}
              {resetStep === 'newPassword' && (
                <motion.form
                  key="newPassword"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  onSubmit={handleResetPassword}
                  className="space-y-5"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <KeyRound className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Nouveau mot de passe</h2>
                      <p className="text-xs text-muted-foreground">Choisissez un mot de passe solide</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      value={newPasswordReset}
                      onChange={(e) => setNewPasswordReset(e.target.value)}
                      placeholder="Min. 6 caracteres"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-[#ff6b2b]/50 focus:ring-1 focus:ring-[#ff6b2b]/20 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Confirmer le mot de passe
                    </label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirmez votre mot de passe"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-[#ff6b2b]/50 focus:ring-1 focus:ring-[#ff6b2b]/20 transition-all"
                    />
                  </div>

                  <AnimatePresence>
                    {resetError && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                      >
                        {resetError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={resetIsLoading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-medium shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetIsLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Reinitialiser le mot de passe
                        <KeyRound className="h-4 w-4" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}

              {/* Step: Success */}
              {resetStep === 'success' && (
                <motion.div
                  key="success"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="space-y-5 text-center py-4"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="h-8 w-8 text-green-400" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Mot de passe modifie !</h2>
                  <p className="text-sm text-muted-foreground">
                    Votre mot de passe a ete reinitialise avec succes. Vous pouvez maintenant vous connecter.
                  </p>
                  <motion.button
                    onClick={resetForgotPassword}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#ff6b2b] to-[#ff4500] text-white font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
                  >
                    <LogIn className="h-4 w-4" />
                    Se connecter
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-[10px] text-muted-foreground mt-6 uppercase tracking-wider"
          >
            TradeVault v2.0 — Trading Analytics Dashboard
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ---- MAIN LOGIN / REGISTER FORM ----
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff6b2b]/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#ff4500]/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-border/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-border/40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-[#ff6b2b]/10" />
      </div>

      {/* Grid background */}
      <div className="absolute inset-0 grid-bg opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff6b2b] to-[#ff4500] flex items-center justify-center shadow-xl shadow-orange-500/20">
              <img src="/logo.png" alt="TradeVault" className="w-7 h-7 object-contain" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">TradeVault</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Analytics Pro</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Votre tableau de bord de trading professionnel
          </p>
        </motion.div>

        {/* Glass Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-3xl border border-border bg-card backdrop-blur-2xl shadow-2xl p-8"
        >
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted mb-8">
            {(['login', 'register'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setError(''); setSuccess(''); }}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="authTab"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#ff6b2b]/20 to-[#ff4500]/10 border border-[#ff6b2b]/20"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {tab === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {tab === 'login' ? 'Connexion' : 'Inscription'}
                </span>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-[#ff6b2b]/50 focus:ring-1 focus:ring-[#ff6b2b]/20 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-[#ff6b2b]/50 focus:ring-1 focus:ring-[#ff6b2b]/20 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (register only) */}
            <AnimatePresence>
              {activeTab === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-[#ff6b2b]/50 focus:ring-1 focus:ring-[#ff6b2b]/20 transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm"
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#ff6b2b] to-[#ff4500] text-white font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {activeTab === 'login' ? 'Se connecter' : 'Creer un compte'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Forgot password link - login tab only */}
          <AnimatePresence>
            {activeTab === 'login' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(true);
                    setResetEmail(email);
                  }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-[#ff6b2b] transition-colors py-1"
                >
                  Mot de passe oublie ?
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Securise</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border" />
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-muted-foreground">
            Vos donnees sont protegees et stockees en toute securite
          </p>
        </motion.div>

        {/* Bottom branding */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-[10px] text-muted-foreground mt-6 uppercase tracking-wider"
        >
          TradeVault v2.0 — Trading Analytics Dashboard
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-[#ff6b2b]/30 border-t-[#ff6b2b] rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
