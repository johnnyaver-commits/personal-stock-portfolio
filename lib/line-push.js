const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const LINE_QUOTA_URL = "https://api.line.me/v2/bot/message/quota";
const LINE_QUOTA_CONSUMPTION_URL = "https://api.line.me/v2/bot/message/quota/consumption";

function requiredLineToken() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN");
  return token;
}

export function hasLinePushQuota(quota, consumption, requiredMessages = 1) {
  if (quota?.type !== "limited") return true;
  return Number.isFinite(quota?.value)
    && Number.isFinite(consumption?.totalUsage)
    && Number.isFinite(requiredMessages)
    && requiredMessages > 0
    && consumption.totalUsage + requiredMessages <= quota.value;
}

export async function assertLinePushQuota() {
  const groupId = process.env.LINE_GROUP_ID;
  if (!groupId) throw new Error("Missing LINE_GROUP_ID");
  const headers = { Authorization: `Bearer ${requiredLineToken()}` };
  const groupCountUrl = `https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/members/count`;
  const [quotaResponse, consumptionResponse, groupCountResponse] = await Promise.all([
    fetch(LINE_QUOTA_URL, { headers, cache: "no-store" }),
    fetch(LINE_QUOTA_CONSUMPTION_URL, { headers, cache: "no-store" }),
    fetch(groupCountUrl, { headers, cache: "no-store" }),
  ]);
  if (!quotaResponse.ok || !consumptionResponse.ok || !groupCountResponse.ok) {
    throw new Error(`Unable to verify LINE monthly quota (${quotaResponse.status}/${consumptionResponse.status}/${groupCountResponse.status})`);
  }
  const [quota, consumption, group] = await Promise.all([
    quotaResponse.json(),
    consumptionResponse.json(),
    groupCountResponse.json(),
  ]);
  if (!hasLinePushQuota(quota, consumption, group.count)) {
    const remaining = Math.max(0, quota.value - consumption.totalUsage);
    throw new Error(`LINE monthly push quota insufficient (remaining ${remaining}, group members ${group.count}); OpenAI generation skipped`);
  }
  return { quota, consumption, group };
}

export async function pushLineMessages(messages, options = {}) {
  const token = requiredLineToken();
  const groupId = process.env.LINE_GROUP_ID;
  if (!groupId) throw new Error("Missing LINE_GROUP_ID");

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
