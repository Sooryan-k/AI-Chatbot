import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// signs the user out and redirects to the login page. it is a post route so
// the sign out is triggered by a form submit from the account menu, not by a
// plain link a crawler could follow.
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/auth/login", request.url));
}
