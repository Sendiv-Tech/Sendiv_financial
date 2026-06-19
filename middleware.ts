import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const OTP_VERIFIED_COOKIE = "stf_otp_verified";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isAuthApi = request.nextUrl.pathname.startsWith("/api/auth");

  // A request only counts as "fully signed in" if BOTH are true:
  // 1. Supabase has a valid user session (password or OTP step succeeded)
  // 2. The otp-verified cookie exists AND belongs to that same user id.
  // This second check is what actually enforces "OTP required every time" —
  // without it, a Supabase session alone (e.g. right after password check)
  // would be enough to reach the dashboard, which defeats the point of 2FA.
  const otpCookie = request.cookies.get(OTP_VERIFIED_COOKIE)?.value;
  const isFullyVerified = !!data.user && !!otpCookie && otpCookie === data.user.id;

  if (!isFullyVerified && !isLoginPage && !isAuthApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isFullyVerified && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
