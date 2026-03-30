/**
 * Browser-only Supabase client (no next/headers dependency)
 * Safe to import from client components
 */
import { createClient } from "@supabase/supabase-js";

let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowser() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}
