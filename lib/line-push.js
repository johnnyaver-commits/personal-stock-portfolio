const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export async function pushLineMessages(messages, options = {}) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const groupId = process.env.LINE_GROUP_ID;
  if (!token || !groupId) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_GROUP_ID");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (options.retryKey) headers["X-Line-Retry-Key"] = options.retryKey;

  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ to: groupId, messages }),
  });
  const details = await response.text();
  if (response.status === 409 && response.headers.get("x-line-accepted-request-id")) {
    return { duplicate: true, requestId: response.headers.get("x-line-request-id") };
  }
  if (!response.ok) throw new Error(`LINE push failed ${response.status}: ${details}`);
  return { duplicate: false, requestId: response.headers.get("x-line-request-id") };
}

function publicBaseUrl() {
  return (process.env.PUBLIC_BASE_URL || "https://sdd-md-github-vercel-johnnyaver-gma.vercel.app").replace(/\/$/, "");
}

function uniqueToken() {
  const uuid = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  return `${Date.now()}-${uuid}`;
}

export function reportImageUrls(pathname) {
  const base = publicBaseUrl();
  const token = uniqueToken();
  const fullImageUrl = `${base}${pathname}?v=${encodeURIComponent(token)}`;
  return { originalContentUrl: fullImageUrl, previewImageUrl: fullImageUrl };
}

export function reportImageUrl(pathname) {
  return reportImageUrls(pathname).originalContentUrl;
}
