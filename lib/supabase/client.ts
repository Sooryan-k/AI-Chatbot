// supabase client for the browser. it reads the session from cookies and is
// used by every client component and store. the anon key is safe to ship to
// the browser because row level security guards the data.
import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Singleton browser Supabase client — safe to call from client components and hooks. */
export function getBrowserClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return client;
}
