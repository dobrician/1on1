import { auth } from "@/lib/auth/config";

export const proxy = auth((req) => {
  const isAuth = !!req.auth;
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register") ||
    req.nextUrl.pathname.startsWith("/verify-email") ||
    req.nextUrl.pathname.startsWith("/forgot-password") ||
    req.nextUrl.pathname.startsWith("/reset-password");

  // Unauthenticated users can only access auth pages and API routes
  if (!isAuth && !isAuthPage) {
    return Response.redirect(new URL("/login", req.nextUrl.origin));
  }

  // Authenticated users should not see auth pages
  if (isAuth && isAuthPage) {
    return Response.redirect(new URL("/overview", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
