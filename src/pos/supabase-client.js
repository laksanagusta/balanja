import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local",
  );
}

export function createSupabaseClient(clerkToken) {
  const options = clerkToken
    ? { global: { headers: { Authorization: `Bearer ${clerkToken}` } } }
    : {};

  return createClient(supabaseUrl, supabaseAnonKey, options);
}
