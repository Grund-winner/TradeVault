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
}
