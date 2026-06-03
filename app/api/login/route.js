import { NextResponse } from "next/server";

const AUTH_COOKIE = "portfolio_session";

function expectedCredentials() {
  const username = process.env.PORTFOLIO_AUTH_USERNAME?.trim().toLowerCase();
  const password = process.env.PORTFOLIO_AUTH_PASSWORD?.trim();
  if (!username || !password) return null;
  return { username, password };
}

export async function POST(request) {
  const expected = expectedCredentials();
  if (!expected) {
    return NextResponse.json({ message: "Login is not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "").trim();

  if (username !== expected.username || password !== expected.password) {
    return NextResponse.json({ message: "帳號或密碼不正確" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: btoa(`${expected.username}:${expected.password}`),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  });

  return response;
}
