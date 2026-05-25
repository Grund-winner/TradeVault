import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { createHash } from 'crypto';

async function hashPassword(password: string): Promise<string> {
  return createHash('sha256').update(password + '_tv_salt_2024').digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Check if user exists
    const users = await db.$queryRawUnsafe<Array<{ id: string; email: string; role: string; isActive: boolean }>>(
      `SELECT id, email, role, "isActive" FROM users WHERE email = $1`,
      email.toLowerCase().trim()
    );

    if (users.length === 0) {
      // Recreate the admin account
      const hashedPw = await hashPassword('@22Deyuktavat');
      const id = 'admin_' + Date.now();
      const sessionToken = createHash('sha256').update(id + Date.now() + '_session').digest('hex');

      await db.$executeRawUnsafe(
        `INSERT INTO users (id, email, password, "siteName", "siteSubtitle", theme, role, "isActive", "sessionToken", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'TradeVault', 'Analytics Pro', 'dark', 'admin', true, $4, NOW(), NOW())`,
        id, email.toLowerCase().trim(), hashedPw, sessionToken
      );

      return NextResponse.json({ success: true, message: 'Compte recree avec succes', role: 'admin' });
    }

    const user = users[0];

    if (user.isActive) {
      return NextResponse.json({ success: true, message: 'Compte deja actif', role: user.role, isActive: true });
    }

    // Reactivate the account
    await db.$executeRawUnsafe(
      `UPDATE users SET "isActive" = true, role = 'admin', "updatedAt" = NOW() WHERE id = $1`,
      user.id
    );

    // Also grant a 1-year subscription
    const existingSub = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM subscriptions WHERE "userId" = $1 AND status = 'active' AND "endDate" > NOW() LIMIT 1`,
      user.id
    );

    if (existingSub.length === 0) {
      await db.$executeRawUnsafe(
        `INSERT INTO subscriptions (id, "userId", plan, status, "paymentMethod", "paymentRef", amount, currency, "startDate", "endDate", "createdAt", "updatedAt")
         VALUES ($1, $2, 'pro', 'active', 'admin_grant', '', 0, 'EUR', NOW(), NOW() + INTERVAL '1 year', NOW(), NOW())`,
        `sub_fix_${Date.now()}`, user.id
      );
    }

    return NextResponse.json({ success: true, message: 'Compte reactive avec succes', role: user.role });
  } catch (error) {
    console.error('[FixAccount] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
