import { NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser, safeJson } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getCurrentUser();
    if (!admin || (admin.role !== 'admin' && admin.role !== 'host')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    await ensureDatabase();

    const users = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT u.id, u.email, u.role, u.phone, u.locale, u."initialBalance"::float, u."isActive", u."siteName", u."createdAt",
        s.status as "subStatus", s."endDate" as "subEndDate"
       FROM users u
       LEFT JOIN LATERAL (
         SELECT status, "endDate" FROM subscriptions
         WHERE "userId" = u.id AND status = 'active'
         ORDER BY "endDate" DESC LIMIT 1
       ) s ON true
       ORDER BY u."createdAt" DESC`
    );

    return NextResponse.json(safeJson(users));
  } catch (error) {
    console.error('[Admin] Users list error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
