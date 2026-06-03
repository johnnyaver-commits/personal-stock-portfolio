"use client";

import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("johnny");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: "登入失敗" }));
        throw new Error(data.message ?? "登入失敗");
      }

      const nextPath = new URLSearchParams(window.location.search).get("next");
      window.location.href = nextPath || "/";
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-mark">S</div>
        <div>
          <h1>家庭股票庫存</h1>
          <p>請登入後查看持股、趨勢與損益資料。</p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <label>
            帳號
            <input autoComplete="username" inputMode="text" onChange={(event) => setUsername(event.target.value)} value={username} />
          </label>
          <label>
            密碼
            <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
          </label>
          <button className="button" disabled={submitting} type="submit">
            {submitting ? "登入中" : "登入"}
          </button>
          {error ? <p className="status error">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
