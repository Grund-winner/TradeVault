import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser, safeJson } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const admin = await getCurrentUser();
    if (!admin || (admin.role !== 'admin' && admin.role !== 'host')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    await ensureDatabase();

    const users = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, email, role, phone, locale, "initialBalance"::float, "isActive", "siteName", "siteSubtitle", "createdAt" FROM users WHERE id = $1`, id
    );
    if (users.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const stats = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COUNT(*)::int as total_trades, COALESCE(SUM(pnl), 0)::float as total_pnl FROM trades WHERE "userId" = $1`, id
    );

    const subs = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT * FROM subscriptions WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 5`, id
    );

    return NextResponse.json(safeJson({ user: users[0], stats: stats[0], subscriptions: subs }));
  } catch (error) {
    console.error('[Admin] User detail error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const admin = await getCurrentUser();
    if (!admin || (admin.role !== 'admin' && admin.role !== 'host')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    await ensureDatabase();

    const body = await request.json();
    const updates: string[] = [];
    const values: unknown[] = [];
    let pIdx = 1;

    if (body.role !== undefined) { updates.push(`role = $${pIdx}`); values.push(body.role); pIdx++; }
    if (body.isActive !== undefined) { updates.push(`"isActive" = $${pIdx}`); values.push(body.isActive); pIdx++; }
    if (body.phone !== undefined) { updates.push(`phone = $${pIdx}`); values.push(body.phone); pIdx++; }
    if (body.initialBalance !== undefined) { updates.push(`"initialBalance" = $${pIdx}`); values.push(Number(body.initialBalance)); pIdx++; }

    if (updates.length === 0) return NextResponse.json({ error: 'No updates' }, { status: 400 });

    updates.push(`"updatedAt" = NOW()`);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${pIdx} RETURNING id, email, role`;
    values.push(id);

    const result = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(query, ...values);

    if (body.grantSubscription && result.length > 0) {
      const userId = result[0].id as string;
      const existingSub = await db.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM subscriptions WHERE "userId" = $1 AND status = 'active' AND "endDate" > NOW() LIMIT 1`, userId
      );
      if (existingSub.length === 0) {
        await db.$executeRawUnsafe(
          `INSERT INTO subscriptions (id, "userId", plan, status, "paymentMethod", "paymentRef", amount, currency, "startDate", "endDate", "createdAt", "updatedAt")
           VALUES ($1, $2, 'pro', 'active', 'admin_grant', '', 0, 'EUR', NOW(), NOW() + INTERVAL '1 year', NOW(), NOW())`,
          `sub_grant_${Date.now()}`, userId
        );
      }
    }

    return NextResponse.json(safeJson({ user: result[0] }));
  } catch (error) {
    console.error('[Admin] Update user error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
