import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { assertSupabaseServerConfigured, supabaseAnonKey, supabaseUrl } from "@/src/lib/supabase/config";
import type { Database } from "@/src/lib/supabase/types";

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
