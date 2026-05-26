import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabase } from '@/lib/db';
import { createHash } from 'crypto';

// GET /api/auth/setup-admin?email=xxx&password=xxx
// Simple way to setup admin by visiting a URL in the browser
export async function GET(request: NextRequest) {
  try {
    await ensureDatabase();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const password = searchParams.get('password');

    if (!email) {
      // Show a helpful HTML page
      return new NextResponse(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TradeVault - Setup Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0b; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: #1a1a1b; border: 1px solid #2a2a2b; border-radius: 16px; padding: 40px; max-width: 440px; width: 90%; }
    .logo { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #ff6b2b, #ff4500); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 20px; }
    h1 { text-align: center; font-size: 20px; margin-bottom: 8px; }
    p { text-align: center; font-size: 13px; color: #94a3b8; margin-bottom: 24px; line-height: 1.6; }
    .info { background: #ff6b2b/10; border: 1px solid #ff6b2b/20; border-radius: 12px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #ff8f5e; text-align: center; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; }
    input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid #2a2a2b; background: #0a0a0b; color: #e2e8f0; font-size: 14px; outline: none; }
    input:focus { border-color: #ff6b2b; }
    .btn { width: 100%; padding: 14px; border: none; border-radius: 12px; background: linear-gradient(135deg, #ff6b2b, #ff4500); color: white; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px; }
    .btn:hover { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #result { margin-top: 16px; text-align: center; font-size: 13px; display: none; }
    #result.success { color: #22c55e; }
    #result.error { color: #ef4444; }
    .note { margin-top: 16px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">TV</div>
    <h1>Setup Admin</h1>
    <p>Creez ou promouvez un compte en tant qu'administrateur TradeVault.</p>
    <div id="result"></div>
    <div id="formArea">
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="emailInput" placeholder="votre@email.com" required>
      </div>
      <div class="form-group">
        <label>Mot de passe (8 caracteres minimum)</label>
        <input type="password" id="passwordInput" placeholder="MotDePasse123" required>
      </div>
      <button class="btn" id="submitBtn" onclick="setupAdmin()">Creer le compte Admin</button>
      <p class="note">Si un compte avec cet email existe, il sera promu admin.<br>Si un admin existe deja, cette operation sera refusee.</p>
    </div>
  </div>
  <script>
    async function setupAdmin() {
      const email = document.getElementById('emailInput').value.trim();
      const password = document.getElementById('passwordInput').value;
      const result = document.getElementById('result');
      const btn = document.getElementById('submitBtn');

      if (!email || password.length < 8) {
        result.style.display = 'block';
        result.className = 'error';
        result.textContent = 'Email et mot de passe (8+ caracteres) requis.';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Creation en cours...';
      result.style.display = 'none';

      try {
        const res = await fetch('/api/auth/setup-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        result.style.display = 'block';

        if (res.ok) {
          result.className = 'success';
          result.innerHTML = data.message === 'User promoted to admin'
            ? 'Compte promu admin avec succes ! <br><a href="/admin" style="color:#ff6b2b">Aller au panneau admin</a>'
            : 'Compte admin cree avec succes ! <br><a href="/login" style="color:#ff6b2b">Se connecter</a>';
          document.getElementById('formArea').style.display = 'none';
        } else {
          result.className = 'error';
          result.textContent = data.error || 'Erreur lors de la creation.';
          btn.disabled = false;
          btn.textContent = 'Creer le compte Admin';
        }
      } catch (e) {
        result.style.display = 'block';
        result.className = 'error';
        result.textContent = 'Erreur de connexion au serveur.';
        btn.disabled = false;
        btn.textContent = 'Creer le compte Admin';
      }
    }
  </script>
</body>
</html>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Direct URL with email but no password - show form pre-filled
    if (email && !password) {
      return new NextResponse(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TradeVault - Setup Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0b; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: #1a1a1b; border: 1px solid #2a2a2b; border-radius: 16px; padding: 40px; max-width: 440px; width: 90%; }
    .logo { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #ff6b2b, #ff4500); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 20px; }
    h1 { text-align: center; font-size: 20px; margin-bottom: 8px; }
    p { text-align: center; font-size: 13px; color: #94a3b8; margin-bottom: 24px; line-height: 1.6; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; }
    input { width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid #2a2a2b; background: #0a0a0b; color: #e2e8f0; font-size: 14px; outline: none; }
    input:focus { border-color: #ff6b2b; }
    .btn { width: 100%; padding: 14px; border: none; border-radius: 12px; background: linear-gradient(135deg, #ff6b2b, #ff4500); color: white; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px; }
    .btn:hover { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #result { margin-top: 16px; text-align: center; font-size: 13px; display: none; }
    #result.success { color: #22c55e; }
    #result.error { color: #ef4444; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">TV</div>
    <h1>Setup Admin</h1>
    <p>Definissez un mot de passe pour le compte admin : <strong>${email}</strong></p>
    <div id="result"></div>
    <div id="formArea">
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="emailInput" value="${email}" readonly style="opacity:0.6">
      </div>
      <div class="form-group">
        <label>Mot de passe (8 caracteres minimum)</label>
        <input type="password" id="passwordInput" placeholder="MotDePasse123" required>
      </div>
      <button class="btn" id="submitBtn" onclick="setupAdmin()">Creer le compte Admin</button>
    </div>
  </div>
  <script>
    async function setupAdmin() {
      const email = document.getElementById('emailInput').value.trim();
      const password = document.getElementById('passwordInput').value;
      const result = document.getElementById('result');
      const btn = document.getElementById('submitBtn');

      if (password.length < 8) {
        result.style.display = 'block';
        result.className = 'error';
        result.textContent = 'Mot de passe de 8+ caracteres requis.';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Creation en cours...';
      result.style.display = 'none';

      try {
        const res = await fetch('/api/auth/setup-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        result.style.display = 'block';

        if (res.ok) {
          result.className = 'success';
          result.innerHTML = data.message === 'User promoted to admin'
            ? 'Compte promu admin avec succes ! <br><a href="/admin" style="color:#ff6b2b">Aller au panneau admin</a>'
            : 'Compte admin cree avec succes ! <br><a href="/login" style="color:#ff6b2b">Se connecter</a>';
          document.getElementById('formArea').style.display = 'none';
        } else {
          result.className = 'error';
          result.textContent = data.error || 'Erreur.';
          btn.disabled = false;
          btn.textContent = 'Creer le compte Admin';
        }
      } catch (e) {
        result.style.display = 'block';
        result.className = 'error';
        result.textContent = 'Erreur de connexion.';
        btn.disabled = false;
        btn.textContent = 'Creer le compte Admin';
      }
    }
  </script>
</body>
</html>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Both email and password provided - redirect to setup page (security: don't show password in URL)
    return NextResponse.redirect(new URL('/api/auth/setup-admin?email=' + encodeURIComponent(email), request.url));
  } catch (error) {
    console.error('[TradeVault] Setup admin GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/auth/setup-admin — Create or promote admin
export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();

    const admins = await db.$queryRawUnsafe<Array<{ id: string; email: string }>>(
      `SELECT id, email FROM users WHERE role IN ('admin', 'host') LIMIT 1`
    );

    if (admins.length > 0) {
      return NextResponse.json({
        error: 'Un admin existe deja',
        adminEmail: admins[0].email,
        message: `Le compte ${admins[0].email} est deja admin. Connectez-vous avec ce compte.`,
      }, { status: 403 });
    }

    const { email, password } = await request.json();
    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: 'Email et mot de passe (min 8 caracteres) requis' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const hashedPassword = createHash('sha256').update(password + '_tv_salt_2024').digest('hex');

    // Check if user already exists
    const existing = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM users WHERE email = $1`, emailLower
    );

    let userId: string;
    const sessionToken = createHash('sha256').update(`admin_${Date.now()}_session`).digest('hex');

    if (existing.length > 0) {
      // Promote existing user
      userId = existing[0].id;
      await db.$executeRawUnsafe(
        `UPDATE users SET role = 'admin', "sessionToken" = $1, "isActive" = true WHERE id = $2`,
        sessionToken, userId
      );
    } else {
      // Create new admin user
      userId = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await db.$executeRawUnsafe(
        `INSERT INTO users (id, email, password, "siteName", "siteSubtitle", theme, "sessionToken", role, locale, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin', 'fr', true, NOW(), NOW())`,
        userId, emailLower, hashedPassword, 'TradeVault', 'Analytics Pro', 'dark', sessionToken
      );
    }

    // Ensure admin has a subscription
    const existingSub = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM subscriptions WHERE "userId" = $1 AND status = 'active' LIMIT 1`, userId
    );
    if (existingSub.length === 0) {
      await db.$executeRawUnsafe(
        `INSERT INTO subscriptions (id, "userId", plan, status, "paymentMethod", "paymentRef", amount, currency, "startDate", "endDate", "createdAt", "updatedAt")
         VALUES ($1, $2, 'pro', 'active', 'admin', '', 0, 'EUR', NOW(), NOW() + INTERVAL '10 years', NOW(), NOW())`,
        `sub_admin_${Date.now()}`, userId
      );
    }

    const response = NextResponse.json({
      user: { id: userId, email: emailLower, role: 'admin' },
      message: existing.length > 0 ? 'User promoted to admin' : 'Admin account created',
    }, { status: 201 });

    response.cookies.set('tv_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[TradeVault] Setup admin error:', error);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}
