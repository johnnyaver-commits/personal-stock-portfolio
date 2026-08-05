import { NextResponse } from "next/server";

const TEST_KEY = "7f3a9c2d-5b11-4e83-9d3a-2b7b6f20e941";
const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("key") !== TEST_KEY) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const groupId = process.env.LINE_GROUP_ID;
  if (!token || !groupId) {
    return NextResponse.json(
      { ok: false, error: "Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_GROUP_ID" },
      { status: 500 },
    );
  }

  const response = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: groupId,
      messages: [
        {
          type: "text",
          text: "✅ LINE 主動推播測試成功！\nJohnny AI Investment Agent 已連線。",
        },
      ],
    }),
  });

  const details = await response.text();
  if (!response.ok) {
    return NextResponse.json(
      { ok: false, status: response.status, details },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, message: "Test push sent" });
}
