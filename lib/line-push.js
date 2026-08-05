const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export async function pushLineMessages(messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const groupId = process.env.LINE_GROUP_ID;
  if (!token || !groupId) {
    throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_GROUP_ID");
  }

  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: groupId, messages }),
  });

  const details = await response.text();
  if (!response.ok) {
    throw new Error(`LINE push failed ${response.status}: ${details}`);
  }
  return true;
}

export function reportImageUrl(pathname) {
  const base = process.env.PUBLIC_BASE_URL || "https://sdd-md-github-vercel-johnnyaver-gma.vercel.app";
  const separator = pathname.includes("?") ? "&" : "?";
  return `${base}${pathname}${separator}t=${Date.now()}`;
}
