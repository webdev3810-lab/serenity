import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { assertSupabaseServerConfigured, supabaseAnonKey, supabaseUrl } from "@/src/lib/supabase/config";
import type { Database } from "@/src/lib/supabase/types";

/**
 * Public reads must not inherit an admin/browser session cookie. A stale
 * session can contain a JWT whose timestamp is rejected by PostgREST, while
 * published content should still be readable anonymously under RLS.
 */
export function createSupabasePublicClient() {
  assertSupabaseServerConfigured();

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function createSupabaseServerClient() {
  assertSupabaseServerConfigured();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always mutate cookies. Proxy refreshes sessions.
        }
      },
    },
  });
}
