'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, CreditCard, ArrowLeft, Shield, Search,
  Eye, Ban, CheckCircle, DollarSign, TrendingUp, Crown, Gift,
  AlertTriangle, Loader2, RefreshCw, Clock, LogIn, Settings, Save,
  UserCog, ShieldOff, GiftIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Tab = 'dashboard' | 'users' | 'trades' | 'subscriptions' | 'config';

interface UserRow {
  id: string;
  email: string;
  role: string;
  phone: string;
  locale: string;
  initialBalance: number;
  isActive: boolean;
  siteName: string;
  createdAt: string;
  subStatus: string | null;
  subEndDate: string | null;
}

interface PlatformStats {
  users: { total: number; active: number; admins: number };
  subscriptions: { active: number; trial: number; revenue: number };
  trades: { total: number; totalPnl: number };
}

interface TradeRow {
  id: number;
  date: string;
  instrument: string;
  direction: string;
  pnl: number;
  userEmail: string;
  status: string;
  type: string;
  strategy: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userDetail, setUserDetail] = useState<Record<string, unknown> | null>(null);
  const [userTrades, setUserTrades] = useState<unknown[]>([]);
  const [allTrades, setAllTrades] = useState<TradeRow[]>([]);
  const [tradeSearch, setTradeSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Config state
  const [whatsappLink, setWhatsappLink] = useState('');
  const [telegramLink, setTelegramLink] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const statsRes = await fetch('/api/admin/stats');

      if (statsRes.status === 401) {
        setLoading(false);
        router.push('/login?from=/admin');
        return;
      }

      if (statsRes.status === 403) {
        setIsAdmin(false);
        setError("Vous n'avez pas les droits administrateur.");
        setLoading(false);
        return;
      }

      if (!statsRes.ok) {
        const errData = await statsRes.json().catch(() => ({}));
        setError(`Erreur serveur: ${errData.error || statsRes.statusText}`);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      const statsData = await statsRes.json();
      setStats(statsData);

      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      } else {
        setError('Impossible de charger les utilisateurs.');
      }

      // Fetch all trades
      const tradesRes = await fetch('/api/admin/trades');
      if (tradesRes.ok) {
        const tradesData = await tradesRes.json();
        setAllTrades(tradesData);
      }
    } catch (err) {
      setError(`Erreur de connexion: ${err instanceof Error ? err.message : 'Inconnue'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const data = await res.json();
        setWhatsappLink(data.whatsappLink || '');
        setTelegramLink(data.telegramLink || '');
      }
    } catch {
      // silent
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  useEffect(() => {
    if (activeTab === 'config') fetchConfig();
  }, [activeTab, fetchConfig]);

  const viewUser = async (user: UserRow) => {
    setSelectedUser(user);
    try {
      const [detailRes, tradesRes] = await Promise.all([
        fetch(`/api/admin/users/${user.id}`),
        fetch(`/api/admin/trades/${user.id}`),
      ]);
      if (detailRes.ok) setUserDetail(await detailRes.json());
      if (tradesRes.ok) setUserTrades(await tradesRes.json());
    } catch { /* silent */ }
  };

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchAdminData();
    } catch { /* silent */ }
  };

  const promoteToAdmin = async (user: UserRow) => {
    if (!confirm(`Promouvoir ${user.email} en tant qu'admin ?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' }),
      });
      if (res.ok) fetchAdminData();
    } catch { /* silent */ }
  };

  const demoteToUser = async (user: UserRow) => {
    if (!confirm(`Retirer les droits admin de ${user.email} ?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user' }),
      });
      if (res.ok) fetchAdminData();
    } catch { /* silent */ }
  };

  const grantSubscription = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantSubscription: true }),
      });
      if (res.ok) fetchAdminData();
    } catch { /* silent */ }
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    setConfigSaved(false);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappLink, telegramLink }),
      });
      if (res.ok) {
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 2000);
      }
    } catch {
      // silent
    } finally {
      setConfigSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAdminData();
    if (activeTab === 'config') fetchConfig();
    setRefreshing(false);
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTrades = allTrades.filter(t =>
    t.instrument.toLowerCase().includes(tradeSearch.toLowerCase()) ||
    t.userEmail.toLowerCase().includes(tradeSearch.toLowerCase()) ||
    t.direction.toLowerCase().includes(tradeSearch.toLowerCase())
  );

  const sidebarItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'trades', label: 'Trades', icon: TrendingUp },
    { id: 'subscriptions', label: 'Abonnements', icon: CreditCard },
    { id: 'config', label: 'Configuration', icon: Settings },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-8 w-8 text-primary animate-pulse" />
          <span className="text-sm text-muted-foreground">Chargement du panneau admin...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="max-w-md w-full mx-4 p-8 rounded-2xl bg-card border border-border text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Accès Refusé</h2>
          <p className="text-sm text-muted-foreground">
            {error || "Vous n'avez pas les permissions nécessaires pour accéder à cette page."}
          </p>
          <div className="flex gap-3">
            <Link
              href="/login?from=/admin"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#ff6b2b] text-white font-medium text-sm hover:bg-[#ff4500] transition-all"
            >
              <LogIn className="h-4 w-4" />
              Se connecter
            </Link>
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-muted border border-border text-foreground font-medium text-sm hover:bg-accent transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="max-w-md w-full mx-4 p-8 rounded-2xl bg-card border border-border text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Erreur de Chargement</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 mx-auto px-6 py-3 rounded-xl bg-[#ff6b2b] text-white font-medium text-sm hover:bg-[#ff4500] transition-all"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-border p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-sidebar-foreground">Admin Panel</h1>
            <p className="text-[10px] text-muted-foreground">TradeVault</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSelectedUser(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                activeTab === item.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="space-y-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <Link href="/" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <ArrowLeft className="h-4 w-4" />
            Retour au dashboard
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {error && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-200">{error}</p>
            <button onClick={handleRefresh} className="ml-auto text-xs text-amber-400 hover:text-amber-300 whitespace-nowrap">Réessayer</button>
          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && stats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Dashboard Admin</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Utilisateurs" value={stats.users.total.toString()} sub={`${stats.users.active} actifs, ${stats.users.admins} admins`} color="text-blue-500" />
              <StatCard icon={CheckCircle} label="Abonnements Actifs" value={stats.subscriptions.active.toString()} sub={`${stats.subscriptions.trial} essais`} color="text-green-500" />
              <StatCard icon={DollarSign} label="Revenu Mensuel" value={`${stats.subscriptions.revenue}€`} sub="estime" color="text-primary" />
              <StatCard icon={TrendingUp} label="Total Trades" value={stats.trades.total.toString()} sub={`P&L: ${stats.trades.totalPnl > 0 ? '+' : ''}${stats.trades.totalPnl}€`} color={stats.trades.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'} />
            </div>
          </motion.div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && !selectedUser && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Utilisateurs ({users.length})</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 w-64"
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-border bg-card">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {users.length === 0 ? 'Aucun utilisateur inscrit pour le moment.' : 'Aucun utilisateur trouvé pour cette recherche.'}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Role</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Abonnement</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Statut</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Inscription</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-foreground">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                              user.role === 'admin' ? 'bg-primary/10 text-primary' :
                              user.role === 'host' ? 'bg-blue-500/10 text-blue-500' :
                              'bg-muted text-muted-foreground'
                            }`}>{user.role}</span>
                          </td>
                          <td className="px-4 py-3">
                            {user.subStatus === 'active' ? (
                              <span className="text-xs text-green-500">Actif</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Expiré</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {user.isActive ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Ban className="h-4 w-4 text-red-500" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => viewUser(user)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all text-xs" title="Voir les détails">
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden xl:inline">Voir</span>
                              </button>
                              {user.role !== 'admin' && user.role !== 'host' && (
                                <button onClick={() => promoteToAdmin(user)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all text-xs" title="Promouvoir Admin">
                                  <UserCog className="h-3.5 w-3.5" />
                                  <span className="hidden xl:inline">Admin</span>
                                </button>
                              )}
                              {(user.role === 'admin' || user.role === 'host') && (
                                <button onClick={() => demoteToUser(user)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all text-xs" title="Retirer Admin">
                                  <ShieldOff className="h-3.5 w-3.5" />
                                  <span className="hidden xl:inline">Retirer</span>
                                </button>
                              )}
                              {user.subStatus !== 'active' && (
                                <button onClick={() => grantSubscription(user.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-green-500/10 text-muted-foreground hover:text-green-500 transition-all text-xs" title="Donner abonnement">
                                  <GiftIcon className="h-3.5 w-3.5" />
                                  <span className="hidden xl:inline">Abonner</span>
                                </button>
                              )}
                              <button onClick={() => toggleUserActive(user.id, user.isActive)} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-xs ${user.isActive ? 'hover:bg-red-500/10 text-muted-foreground hover:text-red-500' : 'hover:bg-green-500/10 text-muted-foreground hover:text-green-500'}`} title={user.isActive ? 'Desactiver' : 'Activer'}>
                                {user.isActive ? (
                                  <>
                                    <Ban className="h-3.5 w-3.5" />
                                    <span className="hidden xl:inline">Bloquer</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    <span className="hidden xl:inline">Activer</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* USER DETAIL VIEW */}
        {activeTab === 'users' && selectedUser && userDetail && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <button onClick={() => setSelectedUser(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Retour
            </button>

            <h2 className="text-xl font-bold text-foreground">{(userDetail.user as Record<string, string>)?.email}</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="text-xs text-muted-foreground uppercase mb-2">Role</p>
                <p className="text-lg font-bold text-foreground">{(userDetail.user as Record<string, string>)?.role}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="text-xs text-muted-foreground uppercase mb-2">Trades</p>
                <p className="text-lg font-bold text-foreground">{(userDetail.stats as Record<string, number>)?.total_trades || 0}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="text-xs text-muted-foreground uppercase mb-2">P&L Total</p>
                <p className={`text-lg font-bold ${(userDetail.stats as Record<string, number>)?.total_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(userDetail.stats as Record<string, number>)?.total_pnl >= 0 ? '+' : ''}{(userDetail.stats as Record<string, number>)?.total_pnl || 0}€
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Trades récents</h3>
              {userTrades.length > 0 ? (
                <div className="space-y-2">
                  {userTrades.slice(0, 10).map((t: Record<string, unknown>, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div>
                        <span className="text-sm text-foreground">{t.instrument as string}</span>
                        <span className="text-xs text-muted-foreground ml-2">{t.date as string}</span>
                      </div>
                      <span className={`text-sm font-medium ${(t.pnl as number) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {(t.pnl as number) >= 0 ? '+' : ''}{t.pnl as number}€
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun trade pour cet utilisateur.</p>
              )}
            </div>
          </motion.div>
        )}

        {/* TRADES TAB */}
        {activeTab === 'trades' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Tous les Trades ({allTrades.length})</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher instrument, email..."
                  value={tradeSearch}
                  onChange={e => setTradeSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 w-72"
                />
              </div>
            </div>

            {filteredTrades.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-border bg-card">
                <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {allTrades.length === 0 ? 'Aucun trade enregistré pour le moment.' : 'Aucun trade trouvé pour cette recherche.'}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Instrument</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Direction</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">P&L</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Utilisateur</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrades.slice(0, 100).map((trade) => (
                        <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-muted-foreground">{trade.date}</td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{trade.instrument}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium ${trade.direction === 'BUY' || trade.direction === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                              {trade.direction}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-sm font-medium text-right ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}€
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{trade.userEmail || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs ${trade.status === 'win' ? 'text-green-500' : trade.status === 'loss' ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {trade.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredTrades.length > 100 && (
                  <div className="px-4 py-3 text-xs text-muted-foreground text-center border-t border-border/50">
                    Affichage des 100 premiers résultats sur {filteredTrades.length}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* SUBSCRIPTIONS TAB */}
        {activeTab === 'subscriptions' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Abonnements</h2>
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <p className="text-xs text-muted-foreground uppercase">Actifs</p>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stats.subscriptions.active}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <p className="text-xs text-muted-foreground uppercase">Essais</p>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stats.subscriptions.trial}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <p className="text-xs text-muted-foreground uppercase">Revenu</p>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stats.subscriptions.revenue}€</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Configuration</h2>
                <p className="text-sm text-muted-foreground mt-1">Gérer les liens de la communauté et les paramètres de la plateforme</p>
              </div>
            </div>

            {/* Community Links */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Liens de la Communauté</p>
                  <p className="text-[11px] text-muted-foreground">Les liens WhatsApp et Telegram visibles par les utilisateurs Pro</p>
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {configLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 text-primary animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Chargement...</span>
                </div>
              ) : (
                <>
                  {/* WhatsApp Link */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Lien WhatsApp
                    </label>
                    <input
                      type="url"
                      value={whatsappLink}
                      onChange={e => setWhatsappLink(e.target.value)}
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Telegram Link */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Lien Telegram
                    </label>
                    <input
                      type="url"
                      value={telegramLink}
                      onChange={e => setTelegramLink(e.target.value)}
                      placeholder="https://t.me/..."
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Save button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={saveConfig}
                    disabled={configSaving}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#ff6b2b] to-[#ff4500] text-white font-medium text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50"
                  >
                    {configSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : configSaved ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {configSaving ? 'Enregistrement...' : configSaved ? 'Enregistre !' : 'Enregistrer'}
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: typeof Users; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
