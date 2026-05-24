import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Main client uses pooled connection (for queries via Vercel/Neon)
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Direct client for DDL operations (CREATE TABLE, etc.) - uses unpooled connection
let directDb: PrismaClient | undefined;

function getDirectDb(): PrismaClient {
  if (!directDb) {
    const directUrl = process.env.DIRECT_URL
    directDb = new PrismaClient({
      datasources: directUrl ? { db: { url: directUrl } } : undefined,
      log: ['error'],
    })
  }
  return directDb
}

// Auto-create tables if they don't exist (safe for Neon / serverless)
// Neon pooled connections do NOT support multi-statement queries,
// so we create each table separately.
export async function ensureDatabase() {
  const client = getDirectDb()

  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        instrument TEXT NOT NULL,
        category TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry DOUBLE PRECISION NOT NULL,
        stop_loss DOUBLE PRECISION NOT NULL,
        take_profit DOUBLE PRECISION NOT NULL,
        pnl DOUBLE PRECISION NOT NULL,
        pnl_r DOUBLE PRECISION NOT NULL,
        status TEXT NOT NULL,
        strategy TEXT NOT NULL,
        type TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        notes TEXT,
        tags TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)
    console.log('[TradeVault] trades table ready')
  } catch (error) {
    console.error('[TradeVault] Failed to create trades table:', error)
  }

  // Add missing columns to trades table (table may have been created without them)
  const missingTradeColumns = ['notes TEXT', 'tags TEXT'];
  for (const colDef of missingTradeColumns) {
    try {
      await client.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE trades ADD COLUMN IF NOT EXISTS ${colDef};
        EXCEPTION WHEN OTHERS THEN NULL;
        END $$;
      `)
    } catch (error) {
      console.error(`[TradeVault] Failed to add column to trades:`, error)
    }
  }
  // userId needs separate handling due to quoting
  try {
    await client.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE trades ADD COLUMN IF NOT EXISTS "userId" TEXT DEFAULT '';
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `)
  } catch (error) {
    console.error('[TradeVault] Failed to add userId column:', error)
  }

  // Add extra trade columns (source, pips)
  const extraTradeCols = [
    'source TEXT NOT NULL DEFAULT \'manual\'',
    'pips DOUBLE PRECISION NOT NULL DEFAULT 0',
  ];
  for (const colDef of extraTradeCols) {
    try {
      await client.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE trades ADD COLUMN IF NOT EXISTS ${colDef};
        EXCEPTION WHEN OTHERS THEN NULL;
        END $$;
      `)
    } catch (error) {
      console.error('[TradeVault] Failed to add column to trades:', error)
    }
  }

  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        "siteName" TEXT NOT NULL DEFAULT 'TradeVault',
        "siteSubtitle" TEXT NOT NULL DEFAULT 'Analytics Pro',
        theme TEXT NOT NULL DEFAULT 'dark',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)
    console.log('[TradeVault] users table ready')
  } catch (error) {
    console.error('[TradeVault] Failed to create users table:', error)
  }

  // Add sessionToken column if missing
  try {
    await client.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "sessionToken" TEXT;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `)
  } catch (error) {
    console.error('[TradeVault] Failed to add sessionToken column:', error)
  }

  // Add new columns to users table
  const userColumns = [
    'role TEXT NOT NULL DEFAULT \'user\'',
    'phone TEXT NOT NULL DEFAULT \'\'',
    '"initialBalance" DOUBLE PRECISION NOT NULL DEFAULT 0',
    'locale TEXT NOT NULL DEFAULT \'fr\'',
    '"isActive" BOOLEAN NOT NULL DEFAULT true',
    '"mtApiKey" TEXT',
    '"mtAccountId" TEXT',
    '"mtServer" TEXT',
    '"mtPlatform" TEXT',
  ];
  for (const colDef of userColumns) {
    try {
      await client.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE users ADD COLUMN IF NOT EXISTS ${colDef};
        EXCEPTION WHEN OTHERS THEN NULL;
        END $$;
      `)
    } catch (error) {
      console.error('[TradeVault] Failed to add column to users:', error)
    }
  }

  // Create subscriptions table
  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan TEXT NOT NULL DEFAULT 'pro',
        status TEXT NOT NULL DEFAULT 'active',
        "paymentMethod" TEXT NOT NULL DEFAULT '',
        "paymentRef" TEXT NOT NULL DEFAULT '',
        amount DOUBLE PRECISION NOT NULL DEFAULT 25,
        currency TEXT NOT NULL DEFAULT 'EUR',
        "startDate" TIMESTAMP NOT NULL DEFAULT NOW(),
        "endDate" TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)
  } catch (error) {
    console.error('[TradeVault] Failed to create subscriptions table:', error)
  }

  // Create community_posts table
  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS community_posts (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        "isPinned" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)
  } catch (error) {
    console.error('[TradeVault] Failed to create community_posts table:', error)
  }

  // Create ai_conversations table
  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        messages JSONB NOT NULL DEFAULT '[]'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)
  } catch (error) {
    console.error('[TradeVault] Failed to create ai_conversations table:', error)
  }

  // Create admin_logs table
  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id TEXT PRIMARY KEY,
        "adminId" TEXT NOT NULL,
        action TEXT NOT NULL,
        "targetId" TEXT NOT NULL DEFAULT '',
        details TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)
  } catch (error) {
    console.error('[TradeVault] Failed to create admin_logs table:', error)
  }
}
