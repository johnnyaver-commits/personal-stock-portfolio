const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export async function pushLineMessages(messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const groupId = process.env.LINE_GROUP_ID;
  if (!token || !groupId) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_GROUP_ID");

  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: groupId, messages }),
  });
  const details = await response.text();
  if (!response.ok) throw new Error(`LINE push failed ${response.status}: ${details}`);
  return true;
}

function publicBaseUrl() {
  return (process.env.PUBLIC_BASE_URL || "https://sdd-md-github-vercel-johnnyaver-gma.vercel.app").replace(/\/$/, "");
}

export function reportImageUrls(pathname) {
  const stamp = Date.now();
  const base = publicBaseUrl();
  const previewPath = pathname.endsWith("/morning")
    ? "/api/reports/morning-preview"
    : "/api/reports/evening-preview";
  return {
    originalContentUrl: `${base}${pathname}?t=${stamp}`,
    previewImageUrl: `${base}${previewPath}?t=${stamp}`,
  };
}

export function reportImageUrl(pathname) {
  return reportImageUrls(pathname).originalContentUrl;
}
