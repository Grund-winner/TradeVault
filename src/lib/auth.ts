import { cookies } from 'next/headers';
import { db, ensureDatabase } from './db';

export interface AuthUser {
  id: string;
  email: string;
  siteName: string;
  siteSubtitle: string;
  theme: string;
  role: string;
  phone: string;
  initialBalance: number;
  locale: string;
  isActive: boolean;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    await ensureDatabase();
    const cookieStore = await cookies();
    const session = cookieStore.get('tv_session');
    if (!session?.value) return null;

    const users = await db.$queryRawUnsafe<Array<AuthUser>>(
      `SELECT id, email, "siteName", "siteSubtitle", theme, role, phone, "initialBalance", locale, "isActive" FROM users WHERE "sessionToken" = $1 AND "isActive" = true`,
      session.value
    );
    return users[0] || null;
  } catch (error) {
    console.error('[Auth] getCurrentUser error:', error);
    return null;
  }
}

export async function requireAdmin(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'host')) return null;
  return user;
}

export async function checkSubscription(userId: string): Promise<{ active: boolean; endDate: string | null }> {
  try {
    await ensureDatabase();
    const subs = await db.$queryRawUnsafe<Array<{ endDate: string }>>(
      `SELECT "endDate" FROM subscriptions WHERE "userId" = $1 AND status = 'active' AND "endDate" > NOW() ORDER BY "endDate" DESC LIMIT 1`,
      userId
    );
    if (subs.length === 0) return { active: false, endDate: null };
    return { active: true, endDate: subs[0].endDate };
  } catch (error) {
    console.error('[Auth] checkSubscription error:', error);
    return { active: false, endDate: null };
  }
}
