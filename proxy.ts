import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

const SUPPORTED_LOCALES = ["en", "ro"];
const DEFAULT_LOCALE = "en";

function detectLocale(req: Request, authLocale?: string): string {
  // 1. Authenticated user: use JWT-stored preference
  if (authLocale && SUPPORTED_LOCALES.includes(authLocale)) {
    return authLocale;
  }
  // 2. Existing cookie
  const cookieLocale = req.headers
    .get("cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith("NEXT_LOCALE="))
    ?.split("=")[1]
    ?.trim();
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }
  // 3. Accept-Language header
  const acceptLang = req.headers.get("accept-language");
  if (acceptLang) {
    const preferred = acceptLang
      .split(",")
      .map((lang) => lang.split(";")[0].trim().substring(0, 2).toLowerCase())
      .find((lang) => SUPPORTED_LOCALES.includes(lang));
    if (preferred) return preferred;
  }
  return DEFAULT_LOCALE;
}

function getBaseUrl(req: Request): string {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost =
    req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (forwardedHost) {
    const proto = forwardedProto || "https";
    return `${proto}://${forwardedHost}`;
  }
  return new URL(req.url).origin;
}

function setLocaleCookie(
  response: NextResponse,
  locale: string
): NextResponse {
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return response;
}

export const proxy = auth((req) => {
  const isAuth = !!req.auth;
  const uiLanguage = (req.auth as { user?: { uiLanguage?: string } })?.user
    ?.uiLanguage;
  const locale = detectLocale(req, uiLanguage);

  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register") ||
    req.nextUrl.pathname.startsWith("/verify-email") ||
    req.nextUrl.pathname.startsWith("/forgot-password") ||
    req.nextUrl.pathname.startsWith("/reset-password") ||
    req.nextUrl.pathname.startsWith("/invite");

  // Wizard routes require authentication (handled by the redirect below)
  // No special treatment needed - /wizard/* is a protected route like /overview

  const baseUrl = getBaseUrl(req);

  // Unauthenticated users can only access auth pages and API routes
  if (!isAuth && !isAuthPage) {
    const response = NextResponse.redirect(new URL("/login", baseUrl));
    return setLocaleCookie(response, locale);
  }

  // Authenticated users should not see auth pages
  if (isAuth && isAuthPage) {
    const response = NextResponse.redirect(new URL("/overview", baseUrl));
    return setLocaleCookie(response, locale);
  }

  // Pass-through: set locale cookie on the response
  const response = NextResponse.next();
  return setLocaleCookie(response, locale);
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
