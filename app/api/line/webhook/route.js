import crypto from "node:crypto";
import { NextResponse } from "next/server";

const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function replyMessage(replyToken, text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !replyToken) return;

  await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "line-webhook" });
}

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");
  const secret = process.env.LINE_CHANNEL_SECRET;

  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  for (const event of payload.events || []) {
    const source = event.source || {};
    const groupId = source.groupId;
    const text = event.message?.type === "text" ? event.message.text.trim() : "";

    if (groupId && ["綁定", "綁定早報", "groupid", "group id"].includes(text.toLowerCase())) {
      await replyMessage(
        event.replyToken,
        `✅ LINE 群組綁定成功\n\n請將以下值設定到 Vercel 的 LINE_GROUP_ID：\n${groupId}\n\n設定後請重新部署。`,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
