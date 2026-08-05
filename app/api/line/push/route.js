import { NextResponse } from "next/server";

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function POST(request) {
  const apiSecret = request.headers.get("x-push-secret");
  if (!process.env.PUSH_API_SECRET || apiSecret !== process.env.PUSH_API_SECRET) {
    return unauthorized();
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const groupId = process.env.LINE_GROUP_ID;
  if (!token || !groupId) {
    return NextResponse.json(
      { ok: false, error: "Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_GROUP_ID" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const imageUrl = body.imageUrl || process.env.MORNING_REPORT_IMAGE_URL;
  const title = body.title || "老爸早安股市快報";
  const summary = body.summary || "今日早晨股市重點已更新。";

  const messages = [];
  if (imageUrl) {
    messages.push({
      type: "image",
      originalContentUrl: imageUrl,
      previewImageUrl: imageUrl,
    });
  }
  messages.push({ type: "text", text: `${title}\n${summary}` });

  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: groupId, messages }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    return NextResponse.json(
      { ok: false, status: response.status, details: responseText },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
