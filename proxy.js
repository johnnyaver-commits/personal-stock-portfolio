import { NextResponse } from "next/server";

function unauthorized() {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Portfolio", charset="UTF-8"',
      "Cache-Control": "no-store"
    }
  });
}

function parseBasicAuth(header) {
  if (!header) return null;

  const [scheme, encoded] = header.split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encoded) return null;

  try {
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1)
    };
  } catch {
    return null;
  }
}

export function proxy(request) {
  const expectedUsername = process.env.PORTFOLIO_AUTH_USERNAME?.trim();
  const expectedPassword = process.env.PORTFOLIO_AUTH_PASSWORD?.trim();

  if (!expectedUsername || !expectedPassword) {
    return unauthorized();
  }

  const credentials = parseBasicAuth(request.headers.get("authorization"));
  const username = credentials?.username?.trim().toLowerCase();
  const password = credentials?.password?.trim();

  if (username === expectedUsername.toLowerCase() && password === expectedPassword) {
    return NextResponse.next();
  }

  return unauthorized();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};
