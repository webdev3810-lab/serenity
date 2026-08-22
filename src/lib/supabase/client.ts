"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/src/lib/supabase/config";
import type { Database } from "@/src/lib/supabase/types";

export const createSupabaseBrowserClient = () =>
  createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
