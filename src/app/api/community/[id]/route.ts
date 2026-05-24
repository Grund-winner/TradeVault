import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// DELETE /api/community/[id] - Delete a post (owner or admin/host only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Identifiant de publication requis' }, { status: 400 });
    }

    // Fetch the post to check ownership
    const posts = await db.$queryRawUnsafe<Array<{ id: string; userId: string }>>(
      `SELECT id, "userId" FROM community_posts WHERE id = $1`,
      id
    );

    if (posts.length === 0) {
      return NextResponse.json({ error: 'Publication introuvable' }, { status: 404 });
    }

    const post = posts[0];
    const isOwner = post.userId === currentUser.id;
    const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'host';

    if (!isOwner && !isPrivileged) {
      return NextResponse.json(
        { error: 'Vous ne pouvez supprimer que vos propres publications' },
        { status: 403 }
      );
    }

    await db.$executeRawUnsafe(`DELETE FROM community_posts WHERE id = $1`, id);

    return NextResponse.json({ success: true, message: 'Publication supprimee' });
  } catch (error) {
    console.error('[TradeVault] Community DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH /api/community/[id] - Toggle pin status (admin/host only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabase();
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'host';
    if (!isPrivileged) {
      return NextResponse.json(
        { error: 'Acces refuse. Reservé aux administrateurs.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Identifiant de publication requis' }, { status: 400 });
    }

    const body = await request.json();
    const { isPinned } = body;

    if (typeof isPinned !== 'boolean') {
      return NextResponse.json(
        { error: 'Le champ isPinned doit être un booléen' },
        { status: 400 }
      );
    }

    // Check if the post exists
    const existing = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM community_posts WHERE id = $1`,
      id
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Publication introuvable' }, { status: 404 });
    }

    await db.$executeRawUnsafe(
      `UPDATE community_posts SET "isPinned" = $1, "updatedAt" = NOW() WHERE id = $2`,
      isPinned,
      id
    );

    const updated = await db.$queryRawUnsafe<Array<{
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
      id
    );

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('[TradeVault] Community PATCH error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
