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
export async function ensureDatabase() {
  try {
    const client = getDirectDb()
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
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)
    console.log('[TradeVault] Database tables ready')
  } catch (error) {
    console.error('[TradeVault] Failed to ensure database tables:', error)
  }
}
