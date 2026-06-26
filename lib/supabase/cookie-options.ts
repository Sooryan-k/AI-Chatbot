// keep users signed in until they explicitly log out. without an explicit
// maxAge the supabase auth cookies can be written as short-lived/session
// cookies, so the session is lost when the browser closes or the cookie expires.
// a one-year maxAge (browsers cap cookie lifetime near 400 days) keeps the
// cookies persistent; supabase still auto-refreshes the short-lived access
// token in the background, and these options are re-applied on every refresh.
export const AUTH_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 365,
};
