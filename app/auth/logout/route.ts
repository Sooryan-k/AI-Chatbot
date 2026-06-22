import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

// signs the user out and redirects to the login page. it is a post route so the
// sign out is triggered by a form submit from the account menu, not by a plain
// link a crawler could follow.
//
// the supabase client writes its cleared cookies directly onto the redirect
// response so the browser actually drops the session. setting them on the
// next/headers store instead is not guaranteed to attach to a hand-built
// NextResponse.redirect.
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/auth/login", request.url));
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.signOut();
  return response;
}
