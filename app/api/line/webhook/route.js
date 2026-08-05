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
  if (!token || !replyToken) {
    console.error("LINE reply skipped: missing access token or reply token");
    return { ok: false, reason: "missing-token" };
  }

  const response = await fetch(LINE_REPLY_URL, {
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

  const details = await response.text();
  if (!response.ok) {
    console.error("LINE reply failed", response.status, details);
    return { ok: false, status: response.status, details };
  }

  console.log("LINE reply success");
  return { ok: true };
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "line-webhook" });
}

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");
  const secret = process.env.LINE_CHANNEL_SECRET;

  if (!verifySignature(rawBody, signature, secret)) {
    console.error("LINE webhook rejected: invalid signature", {
      hasSignature: Boolean(signature),
      hasSecret: Boolean(secret),
    });
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("LINE webhook rejected: invalid JSON");
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  console.log("LINE webhook received", {
    eventCount: payload.events?.length || 0,
    eventTypes: (payload.events || []).map((event) => event.type),
    sourceTypes: (payload.events || []).map((event) => event.source?.type),
  });

  for (const event of payload.events || []) {
    const source = event.source || {};
    const groupId = source.groupId;
    const text = event.message?.type === "text" ? event.message.text.trim() : "";

    console.log("LINE event", {
      type: event.type,
      sourceType: source.type,
      hasGroupId: Boolean(groupId),
      text,
    });

    if (groupId && ["綁定", "綁定早報", "groupid", "group id"].includes(text.toLowerCase())) {
      await replyMessage(
        event.replyToken,
        `✅ LINE 群組綁定成功\n\n請將以下值設定到 Vercel 的 LINE_GROUP_ID：\n${groupId}\n\n設定後請重新部署。`,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
