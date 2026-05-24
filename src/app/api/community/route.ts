import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser, checkSubscription } from '@/lib/auth';

// GET /api/community - List all posts with user info
export async function GET() {
  try {
    await ensureDatabase();

    const posts = await db.$queryRawUnsafe<Array<{
      id: string;
      userId: string;
      content: string;
      isPinned: boolean;
      createdAt: string;
      updatedAt: string;
      email: string;
      siteName: string;
    }>>(
      `SELECT p.id, p."userId", p.content, p."isPinned", p."createdAt", p."updatedAt",
              u.email, u."siteName"
       FROM community_posts p
       JOIN users u ON u.id = p."userId"
       ORDER BY p."isPinned" DESC, p."createdAt" DESC`
    );

    return NextResponse.json(posts);
  } catch (error) {
    console.error('[TradeVault] Community GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/community - Create a new post
export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Admin/host users bypass subscription check
    const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'host';
    if (!isPrivileged) {
      const subscription = await checkSubscription(currentUser.id);
      if (!subscription.active) {
        return NextResponse.json(
          { error: 'Abonnement actif requis pour publier dans la communaute' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 });
    }

    const trimmed = content.trim();
    if (trimmed.length < 1 || trimmed.length > 5000) {
      return NextResponse.json(
        { error: 'Le contenu doit contenir entre 1 et 5000 caracteres' },
        { status: 400 }
      );
    }

    const postId = `cp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    await db.$executeRawUnsafe(
      `INSERT INTO community_posts (id, "userId", content, "isPinned", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, false, NOW(), NOW())`,
      postId,
      currentUser.id,
      trimmed
    );

    const created = await db.$queryRawUnsafe<Array<{
      id: string;
      userId: string;
      content: string;
      isPinned: boolean;
      createdAt: string;
      updatedAt: string;
      email: string;
      siteName: string;
    }>>(
      `SELECT p.id, p."userId", p.content, p."isPinned", p."createdAt", p."updatedAt",
              u.email, u."siteName"
       FROM community_posts p
       JOIN users u ON u.id = p."userId"
       WHERE p.id = $1`,
      postId
    );

    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    console.error('[TradeVault] Community POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
