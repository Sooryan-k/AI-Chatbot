import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Magic-link / OAuth callback.
 * Supabase redirects here with ?code=... after the user clicks the email link.
 * We exchange the code for a session (sets the auth cookie) then redirect home.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send them back to login with an error hint.
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
