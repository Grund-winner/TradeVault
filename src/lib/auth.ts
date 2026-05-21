import { cookies } from 'next/headers';
import { db, ensureDatabase } from './db';

export interface AuthUser {
  id: string;
  email: string;
  siteName: string;
  siteSubtitle: string;
  theme: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    await ensureDatabase();
    const cookieStore = await cookies();
    const session = cookieStore.get('tv_session');
    if (!session?.value) return null;

    const users = await db.$queryRawUnsafe<Array<AuthUser>>(
      `SELECT id, email, "siteName", "siteSubtitle", theme FROM users WHERE "sessionToken" = $1`,
      session.value
    );
    return users[0] || null;
  } catch (error) {
    console.error('[Auth] getCurrentUser error:', error);
    return null;
  }
}
