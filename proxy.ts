import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth proxy — runs before every non-static request.
 * Unauthenticated users are redirected to /auth/login, except for:
 *   - /auth/* (login / callback)
 *   - /share/* (public read-only share links)
 *   - /api/*  (API routes handle their own auth as needed)
 *
 * Also refreshes the Supabase session cookie on every request so it doesn't
 * expire mid-session.
 *
 * NOTE: In Next.js 16, "middleware.ts" is renamed to "proxy.ts" and the
 * exported function must be named `proxy` (not `middleware`).
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: Do not add logic between createServerClient and auth.getUser().
  // A session refresh may write cookies, so supabaseResponse must carry them.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPublic =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/share") ||
    pathname.startsWith("/api");

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
