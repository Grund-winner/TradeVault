import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, ensureDatabase } from '@/lib/db';

// GET /api/ai/conversations — List user's AI conversations
export async function GET() {
  try {
    await ensureDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const convos = await db.$queryRawUnsafe<Array<{ id: string; messages: unknown; createdAt: string; updatedAt: string }>>(
      `SELECT id, messages, "createdAt", "updatedAt" FROM ai_conversations WHERE "userId" = $1 ORDER BY "updatedAt" DESC LIMIT 20`,
      user.id
    );

    const formatted = convos.map(c => {
      const msgs = (c.messages as Array<{ role: string; content: string }>) || [];
      const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user');
      const lastAiMsg = [...msgs].reverse().find(m => m.role === 'assistant');

      return {
        id: c.id,
        title: lastUserMsg?.content?.substring(0, 60) || 'Conversation IA',
        lastMessage: lastAiMsg?.content?.substring(0, 100) || '',
        messageCount: msgs.length,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('[TradeVault] AI conversations list error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
