'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Shield, Zap, Users, TrendingUp, Loader2, CreditCard, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type PaymentMethod = 'card' | 'usdt_trc20' | 'usdt_bep20';

function PricingContent() {
  const searchParams = useSearchParams();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (searchParams.get('expired') === 'true') setIsExpired(true);
    if (searchParams.get('cancelled') === 'true') setError('Paiement annule. Reessayez.');

    // Check if user is logged in & apply theme
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setIsLoggedIn(!!data.exists);
        // Apply theme preference
        if (data.theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
        }
      })
      .catch(() => {});
  }, [searchParams]);

  const features = [
    { icon: TrendingUp, text: 'Trade tracking & analyse avancee' },
    { icon: Zap, text: 'Synchronisation MT4/MT5 en temps reel' },
    { icon: Shield, text: 'Analyse de strategie par IA' },
    { icon: Users, text: 'Acces communaute exclusive' },
  ];

  const paymentMethods = [
    { id: 'card' as PaymentMethod, label: 'Visa / Mastercard', sublabel: 'Paiement securise par Stripe', icon: CreditCard },
    { id: 'usdt_trc20' as PaymentMethod, label: 'USDT TRC20', sublabel: 'Reseau Tron (TRC20)', icon: () => <span className="text-xs font-mono font-bold text-red-400">TRX</span> },
    { id: 'usdt_bep20' as PaymentMethod, label: 'USDT BEP20', sublabel: 'Reseau BSC (BEP20)', icon: () => <span className="text-xs font-mono font-bold text-yellow-400">BSC</span> },
  ];

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (paymentMethod === 'card') {
        // Stripe checkout
        const res = await fetch('/api/payments/stripe/create-checkout', { method: 'POST' });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Erreur lors de la creation du paiement');
          setIsLoading(false);
          return;
        }

        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          setError('Erreur: URL de paiement non recue');
        }
      } else {
        // NOWPayments crypto
        const network = paymentMethod === 'usdt_trc20' ? 'trc20' : 'bep20';
        const res = await fetch('/api/payments/crypto/create-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currency: 'usdt', network }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Erreur lors de la creation de la facture');
          setIsLoading(false);
          return;
        }

        if (data.invoiceUrl) {
          window.location.href = data.invoiceUrl;
        } else if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          setError('Erreur: URL de paiement non recue');
        }
      }
    } catch {
      setError('Erreur de connexion. Verifiez votre connexion internet.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 grid-bg opacity-50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Back link */}
        <Link href={isLoggedIn ? '/' : '/login'} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 text-sm">
          <ArrowLeft className="h-4 w-4" />
          {isLoggedIn ? 'Retour au tableau de bord' : 'Retour a la connexion'}
        </Link>

        {/* Expired subscription warning */}
        {isExpired && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6"
          >
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">Votre abonnement a expire. Renouvelez pour continuer a utiliser TradeVault.</p>
          </motion.div>
        )}

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-3xl border border-border bg-card p-8 backdrop-blur-xl"
        >
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
              Plan Pro
            </span>
          </div>

          {/* Price */}
          <div className="text-center mb-8">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-5xl font-bold text-foreground">25</span>
              <span className="text-xl text-muted-foreground">EUR</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {isLoggedIn ? 'par mois' : 'par mois / 7 jours d\'essai gratuit'}
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted"
              >
                <feature.icon className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{feature.text}</span>
                <Check className="h-4 w-4 text-green-500 ml-auto flex-shrink-0" />
              </motion.div>
            ))}
          </div>

          {/* Payment Methods */}
          <div className="space-y-3 mb-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Methode de paiement</p>
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                  paymentMethod === method.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/50 hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                    <method.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{method.label}</p>
                    <p className="text-xs text-muted-foreground">{method.sublabel}</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === method.id ? 'border-primary' : 'border-border'
                }`}>
                  {paymentMethod === method.id && <div className="w-3 h-3 rounded-full bg-primary" />}
                </div>
              </button>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4"
            >
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-300">{error}</p>
            </motion.div>
          )}

          {/* CTA Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-primary to-orange-600 text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                {isLoggedIn ? "S'abonner maintenant" : "Commencer l'essai gratuit"}
                <Zap className="h-5 w-5" />
              </>
            )}
          </motion.button>

          {!isLoggedIn && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Un compte sera cree automatiquement avec 7 jours d&apos;essai gratuit.
            </p>
          )}

          <p className="text-center text-xs text-muted-foreground mt-2">
            Annule a tout moment. Aucun engagement.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground">Chargement...</span>
        </div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}
