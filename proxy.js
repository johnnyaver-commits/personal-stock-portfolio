import { NextResponse } from "next/server";

const AUTH_COOKIE = "portfolio_session";

function expectedSession() {
  const username = process.env.PORTFOLIO_AUTH_USERNAME?.trim().toLowerCase();
  const password = process.env.PORTFOLIO_AUTH_PASSWORD?.trim();
  if (!username || !password) return null;
  return btoa(`${username}:${password}`);
}

function isPublicPath(pathname) {
  return (
    pathname === "/login" ||
    pathname === "/api/login" ||
    pathname === "/api/cron/weekly-analysis" ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const session = expectedSession();
  const currentSession = request.cookies.get(AUTH_COOKIE)?.value;
  if (session && currentSession === session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};
