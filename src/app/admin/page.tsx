'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, CreditCard, ArrowLeft, Shield, Search,
  Eye, Ban, CheckCircle, DollarSign, TrendingUp, UserPlus, Clock
} from 'lucide-react';
import Link from 'next/link';

type Tab = 'dashboard' | 'users' | 'trades' | 'subscriptions';

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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userDetail, setUserDetail] = useState<Record<string, unknown> | null>(null);
  const [userTrades, setUserTrades] = useState<unknown[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) setUsers(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [fetchStats, fetchUsers]);

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
      fetchUsers();
    } catch { /* silent */ }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sidebarItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'trades', label: 'Trades', icon: TrendingUp },
    { id: 'subscriptions', label: 'Abonnements', icon: CreditCard },
  ];

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

        <Link href="/" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard
        </Link>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'dashboard' && stats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Dashboard Admin</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Utilisateurs" value={stats.users.total.toString()} sub={`${stats.users.active} actifs`} color="text-blue-500" />
              <StatCard icon={CheckCircle} label="Abonnements Actifs" value={stats.subscriptions.active.toString()} sub={`${stats.subscriptions.trial} essais`} color="text-green-500" />
              <StatCard icon={DollarSign} label="Revenu Mensuel" value={`${stats.subscriptions.revenue}€`} sub="estime" color="text-primary" />
              <StatCard icon={TrendingUp} label="Total Trades" value={stats.trades.total.toString()} sub={`P&L: ${stats.trades.totalPnl > 0 ? '+' : ''}${stats.trades.totalPnl}€`} color={stats.trades.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'} />
            </div>
          </motion.div>
        )}

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

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Chargement...</div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
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
                            <span className="text-xs text-muted-foreground">Expire</span>
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
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => viewUser(user)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all" title="Voir">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button onClick={() => toggleUserActive(user.id, user.isActive)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all" title={user.isActive ? 'Desactiver' : 'Activer'}>
                              {user.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">Aucun utilisateur trouve</div>
                )}
              </div>
            )}
          </motion.div>
        )}

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
              <h3 className="text-sm font-semibold text-foreground mb-4">Trades recents</h3>
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
                <p className="text-sm text-muted-foreground">Aucun trade</p>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'trades' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">Tous les Trades</h2>
            <p className="text-sm text-muted-foreground">Selectionnez un utilisateur dans la section &quot;Utilisateurs&quot; pour voir ses trades.</p>
          </motion.div>
        )}

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
