import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, ensureDatabase } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/ai/chat — Chat with AI trading assistant
export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { message, conversationId } = await request.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 });
    }

    // Fetch user's recent trades for context
    const trades = await db.trade.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 50,
    });

    // Build trading context
    const recentTrades = trades.slice(0, 10);
    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
    const winRate = trades.length > 0 ? ((trades.filter(t => t.status === 'Win').length / trades.length) * 100).toFixed(1) : '0';

    const tradingContext = `Contexte du trader:
- ${trades.length} trades au total, P&L net: $${totalPnl.toFixed(2)}, Win Rate: ${winRate}%
- 10 derniers trades: ${recentTrades.map(t => `${t.instrument} ${t.direction} ${t.status} $${t.pnl.toFixed(0)}`).join(', ')}`;

    // Load previous messages if conversationId provided
    let messages: Array<{ role: string; content: string }> = [];

    if (conversationId) {
      const convos = await db.$queryRawUnsafe<Array<{ messages: unknown }>>(
        `SELECT messages FROM ai_conversations WHERE id = $1 AND "userId" = $2`,
        conversationId, user.id
      );
      if (convos.length > 0) {
        messages = (convos[0].messages as Array<{ role: string; content: string }>) || [];
      }
    }

    // Add user message
    messages.push({ role: 'user', content: message });

    // Call AI with context
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Tu es TradeVault AI, un assistant de trading intelligent. Tu aides les traders à analyser leurs performances, améliorer leurs stratégies et prendre de meilleures décisions. Tu as accès aux statistiques de trading de l'utilisateur. Tu réponds toujours en français de manière concise et actionnable. ${tradingContext}`
        },
        ...messages.slice(-20), // Keep last 20 messages for context
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Je ne peux pas répondre pour le moment.';

    // Add AI response
    messages.push({ role: 'assistant', content: aiResponse });

    // Save to DB
    let savedConversationId = conversationId;
    try {
      if (conversationId) {
        await db.$executeRawUnsafe(
          `UPDATE ai_conversations SET messages = $1, "updatedAt" = NOW() WHERE id = $2 AND "userId" = $3`,
          JSON.stringify(messages),
          conversationId,
          user.id
        );
      } else {
        const result = await db.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO ai_conversations ("userId", messages, "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) RETURNING id`,
          user.id,
          JSON.stringify(messages)
        );
        savedConversationId = result[0]?.id;
      }
    } catch (e) {
      console.error('[AI] Failed to save conversation:', e);
    }

    return NextResponse.json({
      message: aiResponse,
      conversationId: savedConversationId,
    });

  } catch (error) {
    console.error('[TradeVault] AI chat error:', error);
    return NextResponse.json({ error: 'Erreur lors de la conversation IA' }, { status: 500 });
  }
}
