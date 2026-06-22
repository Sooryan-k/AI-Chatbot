// supabase client for the server. it bridges supabase auth to next request
// cookies so route handlers and the proxy can read and refresh the session.
// note that cookies() is async in next 16, so this helper is async too.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server-side Supabase client (Route Handlers, Server Components). */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // called during a server component render where cookies cannot be
            // set. the proxy refreshes the session instead, so this is safe to
            // ignore.
          }
        },
      },
    },
  );
}
