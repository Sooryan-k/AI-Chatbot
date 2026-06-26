// supabase client for the browser. it reads the session from cookies and is
// used by every client component and store. the anon key is safe to ship to
// the browser because row level security guards the data.
import { createBrowserClient } from "@supabase/ssr";
import { AUTH_COOKIE_OPTIONS } from "./cookie-options";

let client: ReturnType<typeof createBrowserClient> | null = null;

// returns the shared browser supabase client, creating it on first use. safe to
// call from any client component or hook.
export function getBrowserClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookieOptions: AUTH_COOKIE_OPTIONS },
    );
  }
  return client;
}
