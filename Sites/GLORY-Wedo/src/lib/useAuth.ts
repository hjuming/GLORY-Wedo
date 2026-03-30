'use client';

/**
 * 御之旅 Phase 6.1 — useAuth Hook
 * 提供當前使用者 session + role + 權限檢查
 */
import { useState, useEffect, useCallback } from 'react';
import { createClient, type User } from '@supabase/supabase-js';
import { type AppRole, type Permission, hasPermission, ROLE_LABELS } from './rbac';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _client: ReturnType<typeof createClient> | null = null;
function getClient() {
  if (!_client && supabaseUrl) {
    _client = createClient(supabaseUrl, supabaseKey);
  }
  return _client;
}

export interface AuthState {
  user: User | null;
  role: AppRole;
  roleLabel: string;
  loading: boolean;
  can: (permission: Permission) => boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>('client');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getClient();
    if (!client) {
      setLoading(false);
      return;
    }

    // 取得當前 session
    client.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user);
        // 取得 profile role
        const { data: profile } = await client
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        if (profile?.role) {
          setRole(profile.role as AppRole);
        }
      }
      setLoading(false);
    });

    // 監聽 auth 狀態變化
    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await client
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (profile?.role) {
          setRole(profile.role as AppRole);
        }
      } else {
        setUser(null);
        setRole('client');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const can = useCallback(
    (permission: Permission) => hasPermission(role, permission),
    [role]
  );

  const signOut = useCallback(async () => {
    const client = getClient();
    if (client) {
      await client.auth.signOut();
      setUser(null);
      setRole('client');
      window.location.href = '/login';
    }
  }, []);

  return {
    user,
    role,
    roleLabel: ROLE_LABELS[role],
    loading,
    can,
    signOut,
  };
}
