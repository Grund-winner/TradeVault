'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Lock, Crown, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface CommunityPanelProps {
  userRole: string; // 'admin' | 'host' | 'user'
  hasSubscription: boolean;
}

interface PlatformLinks {
  whatsappLink: string;
  telegramLink: string;
}

export default function CommunityPanel({ userRole, hasSubscription }: CommunityPanelProps) {
  const [links, setLinks] = useState<PlatformLinks>({ whatsappLink: '', telegramLink: '' });
  const [isLoading, setIsLoading] = useState(true);

  const canAccess = userRole === 'admin' || userRole === 'host' || hasSubscription;

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch('/api/community');
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-[#ff6b2b] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ff6b2b]/10 border border-[#ff6b2b]/20 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-[#ff6b2b]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Communauté</h2>
            <p className="text-[11px] text-muted-foreground">
              Rejoignez nos groupes exclusifs
            </p>
          </div>
        </div>

        {canAccess && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
            <Crown className="h-3 w-3" />
            Accès Pro
          </span>
        )}
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WhatsApp Card */}
        <PlatformCard
          platform="whatsapp"
          label="WhatsApp"
          description="Groupe communautaire WhatsApp pour echanger en temps reel avec les autres traders."
          link={links.whatsappLink}
          canAccess={canAccess}
          gradientFrom="from-green-500/10"
          gradientTo="to-green-600/5"
          borderAccent="border-green-500/20"
          textAccent="text-green-400"
          bgAccent="bg-green-500/10"
        />

        {/* Telegram Card */}
        <PlatformCard
          platform="telegram"
          label="Telegram"
          description="Canal Telegram exclusif avec analyses, signaux et discussions avancees."
          link={links.telegramLink}
          canAccess={canAccess}
          gradientFrom="from-sky-500/10"
          gradientTo="to-sky-600/5"
          borderAccent="border-sky-500/20"
          textAccent="text-sky-400"
          bgAccent="bg-sky-500/10"
        />
      </div>

      {/* Free user message */}
      {!canAccess && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6 text-center"
        >
          <Lock className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground mb-2">
            Accès réservé aux membres Pro
          </h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
            Abonnez-vous pour acceder aux groupes exclusifs et rejoindre notre communauté de traders professionnels.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b2b] to-[#ff4500] text-white text-sm font-medium shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all hover:scale-105 active:scale-95"
          >
            <Crown className="h-4 w-4" />
            Devenir Pro
          </Link>
        </motion.div>
      )}
    </div>
  );
}

// ─── Platform Card Component ──────────────────────────────────────────────────

function PlatformCard({
  platform,
  label,
  description,
  link,
  canAccess,
  gradientFrom,
  gradientTo,
  borderAccent,
  textAccent,
  bgAccent,
}: {
  platform: 'whatsapp' | 'telegram';
  label: string;
  description: string;
  link: string;
  canAccess: boolean;
  gradientFrom: string;
  gradientTo: string;
  borderAccent: string;
  textAccent: string;
  bgAccent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-2xl overflow-hidden"
    >
      {/* Top gradient bar */}
      <div className={`h-1 bg-gradient-to-r ${gradientFrom} ${gradientTo}`} />

      <div className="p-6">
        {/* Platform Icon */}
        <div className="relative mb-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} border ${borderAccent} flex items-center justify-center`}>
            {platform === 'whatsapp' ? (
              <svg className={`w-8 h-8 ${canAccess ? 'text-green-400' : 'text-green-400/40'}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            ) : (
              <svg className={`w-8 h-8 ${canAccess ? 'text-sky-400' : 'text-sky-400/40'}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            )}
          </div>

          {/* Lock overlay for free users */}
          {!canAccess && (
            <div className="absolute inset-0 rounded-2xl bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <Lock className="h-6 w-6 text-amber-500" />
            </div>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="text-lg font-bold text-foreground mb-1">{label}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          {description}
        </p>

        {/* Button */}
        {canAccess ? (
          <a
            href={link || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl ${bgAccent} border ${borderAccent} ${textAccent} text-sm font-medium transition-all hover:scale-105 active:scale-95 ${!link ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ExternalLink className="h-4 w-4" />
            Rejoindre
          </a>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Lock className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-amber-500 font-semibold uppercase tracking-wider">
              Pro requis
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
