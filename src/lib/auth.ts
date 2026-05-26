import { cookies } from 'next/headers';
import { db, ensureDatabase } from './db';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

// Legacy SHA256 hash (for migrating existing passwords)
function legacyHash(password: string): string {
  return createHash('sha256').update(password + '_tv_salt_2024').digest('hex');
}

// Hash password with bcrypt (new standard)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password: try bcrypt first, fall back to SHA256 for legacy passwords
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // Try bcrypt first (new format - starts with $2a$ or $2b$)
  if (hashedPassword.startsWith('$2')) {
    return bcrypt.compare(password, hashedPassword);
  }
  // Fall back to legacy SHA256
  const legacyHashed = legacyHash(password);
  if (legacyHashed === hashedPassword) {
    return true; // Caller should re-hash with bcrypt after successful login
  }
  return false;
}

// Convert BigInt values to Number for JSON serialization
export function safeJson<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') return Number(data) as unknown as T;
  if (Array.isArray(data)) return data.map(safeJson) as unknown as T;
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = safeJson(value);
    }
    return result as T;
  }
  return data;
}

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
