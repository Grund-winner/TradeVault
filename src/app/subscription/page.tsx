'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SubscriptionContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === 'true';
  const cancelled = searchParams.get('cancelled') === 'true';

  useEffect(() => {
    const cookieTheme = document.cookie
      .split('; ')
      .find(row => row.startsWith('tv_theme='));
    if (cookieTheme) {
      const t = cookieTheme.split('=')[1];
      if (t === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8 text-center">
          {success ? (
            <>
              <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">
                Paiement reussi !
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                Votre abonnement TradeVault Pro a ete active avec succes. Vous avez maintenant acces a toutes les fonctionnalites premium.
              </p>
            </>
          ) : cancelled ? (
            <>
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-10 w-10 text-amber-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">
                Paiement annule
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                Votre paiement a ete annule. Votre abonnement n&apos;a pas ete modifie. Vous pouvez retenter le paiement a tout moment.
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-[#ff6b2b]/10 border border-[#ff6b2b]/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-[#ff6b2b]" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">
                Abonnement
              </h1>
              <p className="text-sm text-muted-foreground mb-8">
                Gerez votre abonnement TradeVault Pro.
              </p>
            </>
          )}

          <div className="flex flex-col gap-3">
            <a
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#ff6b2b] to-[#ff4500] text-white text-sm font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au tableau de bord
            </a>
            {!success && (
              <a
                href="/pricing"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-muted border border-border text-foreground text-sm font-medium hover:bg-accent transition-all"
              >
                Voir les offres
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff6b2b] to-[#ff4500] flex items-center justify-center animate-pulse" />
      </div>
    }>
      <SubscriptionContent />
    </Suspense>
  );
}
