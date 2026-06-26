import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";

// auth proxy that runs before every non static, non api request. it refreshes
// the supabase session cookie and redirects signed out users to /auth/login,
// except on the auth and share routes which are public. api routes are excluded
// from the matcher and do their own auth, so they are not redirected to html.
//
// note: in next 16 the middleware.ts file is renamed to proxy.ts and the
// exported function must be named proxy, not middleware.
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
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

  // auth and share pages are reachable while signed out. api is not matched
  // here at all (see the matcher) and authenticates itself.
  const isPublic =
    pathname.startsWith("/auth") || pathname.startsWith("/share");

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // run on all paths except api routes, next.js internals, generated
    // metadata routes (icons, og image, manifest) and static assets. these
    // must stay public so browsers and social crawlers can fetch them without
    // being redirected to the login page.
    "/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|manifest.webmanifest|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
