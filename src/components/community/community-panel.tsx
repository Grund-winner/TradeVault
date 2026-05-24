'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MessageSquare,
  Pin,
  Send,
  Trash2,
  Lock,
  Crown,
  Loader2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommunityPanelProps {
  userRole: string; // 'admin' | 'host' | 'user'
  hasSubscription: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractNameFromEmail(email: string): string {
  return email.split('@')[0] ?? email;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "A l'instant";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "A l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
  if (days < 7) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;

  const date = new Date(dateStr);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `Le ${dd}/${mm}/${yyyy}`;
}

function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    // Pinned posts first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    // Then by most recent
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

const MAX_CHARS = 2000;
const POLL_INTERVAL = 30_000;

// ─── Component ───────────────────────────────────────────────────────────────

export default function CommunityPanel({ userRole, hasSubscription }: CommunityPanelProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newContent, setNewContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const canPost = userRole === 'admin' || userRole === 'host' || hasSubscription;
  const canModerate = userRole === 'admin' || userRole === 'host';

  // ── Fetch posts ──────────────────────────────────────────────────────────

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/community');
      if (!res.ok) throw new Error('Erreur lors du chargement');
      const data = await res.json();

      // API may return { posts: [...] } or [...]
      const list: Post[] = Array.isArray(data) ? data : data.posts ?? [];
      setPosts(sortPosts(list));
      setError(null);
    } catch (err) {
      console.error('[CommunityPanel] fetch error:', err);
      setError('Impossible de charger les publications. Reessayez plus tard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Poll every 30 s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPosts();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPosts]);

  // Fetch current user id for ownership checks
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const session = await res.json();
          setCurrentUserId(session?.user?.id ?? null);
        }
      } catch {
        // silently ignore – ownership checks will be evaluated server-side anyway
      }
    }
    fetchUser();
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const trimmed = newContent.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Erreur lors de la publication');
      }

      setNewContent('');
      await fetchPosts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  }, [newContent, isSubmitting, fetchPosts]);

  const handleDelete = useCallback(
    async (postId: string) => {
      if (!confirm('Supprimer cette publication ?')) return;
      try {
        const res = await fetch('/api/community', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: postId }),
        });
        if (!res.ok) throw new Error();
        await fetchPosts();
      } catch {
        setError("La publication n'a pas pu etre supprimee.");
        setTimeout(() => setError(null), 5000);
      }
    },
    [fetchPosts],
  );

  const handleTogglePin = useCallback(
    async (postId: string, currentState: boolean) => {
      try {
        const res = await fetch('/api/community', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: postId, isPinned: !currentState }),
        });
        if (!res.ok) throw new Error();
        await fetchPosts();
      } catch {
        setError("Impossible de modifier l'epingle.");
        setTimeout(() => setError(null), 5000);
      }
    },
    [fetchPosts],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isOwner = (post: Post) => post.userId === currentUserId;
  const canDelete = (post: Post) => canModerate || isOwner(post);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ff6b2b]/10 border border-[#ff6b2b]/20 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-[#ff6b2b]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Communaute</h2>
            <p className="text-[11px] text-muted-foreground">
              {posts.length} publication{posts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Admin badge */}
        {canModerate && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#ff6b2b] bg-[#ff6b2b]/10 border border-[#ff6b2b]/20 px-2.5 py-1 rounded-full">
            <Crown className="h-3 w-3" />
            Moderateur
          </span>
        )}
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create post section */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <textarea
          value={newContent}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) setNewContent(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            canPost
              ? 'Partagez une idee, une analyse ou une question avec la communaute...'
              : 'Rejoignez la conversation...'
          }
          disabled={!canPost}
          rows={3}
          className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm resize-none focus:outline-none focus:border-[#ff6b2b]/40 placeholder:text-muted-foreground/50 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Bottom bar: char count + submit */}
        <div className="flex items-center justify-between">
          <span
            className={`text-[11px] tabular-nums ${
              newContent.length > MAX_CHARS * 0.9
                ? 'text-destructive'
                : 'text-muted-foreground'
            }`}
          >
            {newContent.length} / {MAX_CHARS}
          </span>

          {canPost ? (
            <button
              onClick={handleSubmit}
              disabled={!newContent.trim() || isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff6b2b] to-[#ff4500] text-white text-sm font-medium shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publier
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 px-4">
              <Lock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Abonnement requis pour publier
              </span>
              <Link
                href="/pricing"
                className="text-xs text-[#ff6b2b] hover:text-[#ff4500] font-semibold underline underline-offset-2 transition-colors ml-1"
              >
                Voir les offres
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Posts list */}
      <div className="space-y-4">
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-[#ff6b2b] animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Chargement des publications...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && posts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Aucune publication pour le moment
            </p>
            <p className="text-xs text-muted-foreground max-w-[280px]">
              Soyez le premier a partager une idee, une analyse ou une question avec la communaute !
            </p>
          </motion.div>
        )}

        {/* Post cards */}
        {!isLoading && posts.length > 0 && (
          <AnimatePresence mode="popLayout">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`glass-card rounded-2xl p-5 transition-all ${
                  post.isPinned ? 'ring-1 ring-[#ff6b2b]/15' : ''
                }`}
              >
                {/* Pinned badge row */}
                {post.isPinned && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1 bg-[#ff6b2b]/10 text-[#ff6b2b] border border-[#ff6b2b]/20 text-[10px] font-medium px-2 py-0.5 rounded-full">
                      <Pin className="h-2.5 w-2.5" />
                      Epinglé
                    </span>
                  </div>
                )}

                {/* Author + timestamp */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {extractNameFromEmail(post.userEmail)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    &middot; {formatTimeAgo(post.createdAt)}
                  </span>
                </div>

                {/* Content */}
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap mt-2">
                  {post.content}
                </p>

                {/* Action buttons */}
                <div className="flex items-center gap-1 mt-4">
                  {/* Pin toggle – admin/host only */}
                  {canModerate && (
                    <button
                      onClick={() => handleTogglePin(post.id, post.isPinned)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                        post.isPinned
                          ? 'bg-[#ff6b2b]/10 text-[#ff6b2b] hover:bg-[#ff6b2b]/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                      title={post.isPinned ? 'Desepinglez' : 'Epinnez'}
                    >
                      <Pin className={`h-3 w-3 ${post.isPinned ? 'fill-current' : ''}`} />
                      {post.isPinned ? 'Epinglé' : 'Epingler'}
                    </button>
                  )}

                  {/* Delete – own posts or admin/host */}
                  {canDelete(post) && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3 w-3" />
                      Supprimer
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
