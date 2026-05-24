'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Shield, Zap, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'usdt_trc20' | 'usdt_bep20'>('card');

  const features = [
    { icon: TrendingUp, text: 'Trade tracking & analysis' },
    { icon: Zap, text: 'Real-time MT4/MT5 sync' },
    { icon: Shield, text: 'AI strategy analysis' },
    { icon: Users, text: 'Community access' },
  ];

  const paymentMethods = [
    { id: 'card' as const, label: 'Visa / Mastercard', sublabel: 'Paiement securise par Stripe' },
    { id: 'usdt_trc20' as const, label: 'USDT TRC20', sublabel: 'Reseau Tron' },
    { id: 'usdt_bep20' as const, label: 'USDT BEP20', sublabel: 'Reseau BSC' },
  ];

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
        <Link href="/login" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Retour a la connexion
        </Link>

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
            <p className="text-sm text-muted-foreground mt-2">par mois / 7 jours d&apos;essai gratuit</p>
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
          <div className="space-y-3 mb-8">
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
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{method.label}</p>
                  <p className="text-xs text-muted-foreground">{method.sublabel}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === method.id ? 'border-primary' : 'border-border'
                }`}>
                  {paymentMethod === method.id && <div className="w-3 h-3 rounded-full bg-primary" />}
                </div>
              </button>
            ))}
          </div>

          {/* CTA Button */}
          <Link href="/login">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-primary to-orange-600 text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
            >
              Commencer l&apos;essai gratuit
              <Zap className="h-5 w-5" />
            </motion.button>
          </Link>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Annule a tout moment. Aucun engagement.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
