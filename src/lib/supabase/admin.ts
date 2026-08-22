import "server-only";

import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/src/lib/supabase/config";
import type { Database } from "@/src/lib/supabase/types";

export const createSupabaseAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-only admin operations.");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};
