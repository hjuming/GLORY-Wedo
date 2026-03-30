'use client';

/**
 * 御之旅 Phase 6.1 — 登入頁面
 * Supabase Auth: Email + Password / Magic Link
 * 使用 inline style 物件，與 PrototypeV4 保持一致
 */
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    fontFamily: "'Noto Sans TC', 'Hiragino Sans', sans-serif",
  } as React.CSSProperties,
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '48px 40px',
    width: 400,
    maxWidth: '90vw',
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
  } as React.CSSProperties,
  logo: {
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  logoTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  } as React.CSSProperties,
  logoSub: {
    fontSize: 13,
    color: '#64748b',
    margin: '4px 0 0',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
    marginBottom: 6,
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: 16,
    transition: 'border-color 0.15s',
  } as React.CSSProperties,
  btn: {
    width: '100%',
    padding: '12px 0',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
    marginBottom: 10,
  } as React.CSSProperties,
  btnPrimary: {
    background: '#0f172a',
    color: '#fff',
  } as React.CSSProperties,
  btnSecondary: {
    background: '#f1f5f9',
    color: '#475569',
  } as React.CSSProperties,
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
  } as React.CSSProperties,
  success: {
    background: '#f0fdf4',
    color: '#16a34a',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
  } as React.CSSProperties,
  footer: {
    textAlign: 'center' as const,
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 24,
  } as React.CSSProperties,
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseKey) : null;

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError('Supabase 尚未設定'); return; }
    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      // 登入成功 → 重導
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('next') || '/';
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError('Supabase 尚未設定'); return; }
    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) {
      setError(err.message);
    } else {
      setSuccess('已發送登入連結至您的信箱，請查收。');
    }
    setLoading(false);
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <p style={S.logoTitle}>🏯 御之旅 NOBLE HOUSE GLORY</p>
          <p style={S.logoSub}>行程規劃及報價系統</p>
        </div>

        {error && <div style={S.error}>{error}</div>}
        {success && <div style={S.success}>{success}</div>}

        <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink}>
          <label style={S.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={S.input}
          />

          {mode === 'password' && (
            <>
              <label style={S.label}>密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={S.input}
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ ...S.btn, ...S.btnPrimary, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '處理中…' : mode === 'password' ? '登入' : '發送登入連結'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'password' ? 'magic' : 'password'); setError(''); setSuccess(''); }}
          style={{ ...S.btn, ...S.btnSecondary }}
        >
          {mode === 'password' ? '改用 Magic Link 登入' : '改用密碼登入'}
        </button>

        <div style={S.footer}>
          <p>© 2026 NOBLE HOUSE GLORY</p>
        </div>
      </div>
    </div>
  );
}
