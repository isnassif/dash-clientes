import { createClient, SupabaseClient } from "@supabase/supabase-js";

// NOTE: this module must only ever be imported from server-side code
// (route handlers, server components, server actions) — never from a
// "use client" component or the browser bundle.

// This client uses the Supabase service role key and must NEVER be imported
// from client components. It bypasses Row Level Security entirely, so all
// access-control checks must happen in our own server code (see lib/auth.ts).
let cachedClient: SupabaseClient | null = null;

// Lazily constructed so that `next build` (which imports route handler
// modules to collect page data, without real env vars present) doesn't
// throw. The client is only actually created the first time a request
// handler calls a Supabase method at runtime, when env vars are guaranteed
// to be set.
function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cachedClient;
}

export const supabaseAdmin: SupabaseClient = new Proxy(
  {} as SupabaseClient,
  {
    get(_target, prop, receiver) {
      return Reflect.get(getSupabaseAdmin(), prop, receiver);
    },
  }
);
