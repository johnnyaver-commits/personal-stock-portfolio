import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInfographicPrompt,
  buildReportPrompt,
  lineRetryKey,
  taipeiDate,
} from "../lib/evening-report-pipeline.js";

test("Taipei report date is independent from server timezone", () => {
  assert.equal(taipeiDate(new Date("2026-08-05T16:30:00.000Z")), "2026-08-06");
});

test("report prompt contains all required sections and exact market data", () => {
  const prompt = buildReportPrompt("2026-08-05", {
    target009826: { price: 10.52, changePercent: 0.38 },
  });
  assert.match(prompt, /全球市場重點/);
  assert.match(prompt, /VT、QQQ、0050、006208/);
  assert.match(prompt, /AI、半導體與科技/);
  assert.match(prompt, /"price":10\.52/);
  assert.match(prompt, /不可自行補數字/);
});

test("image prompt preserves report content and 9:16 output constraints", () => {
  const prompt = buildInfographicPrompt({
    reportDate: "2026-08-05",
    title: "每日收盤後投資日報",
    content: "009826 收盤價 10.52 元",
  });
  assert.match(prompt, /2160×3840/);
  assert.match(prompt, /009826 收盤價 10\.52 元/);
  assert.match(prompt, /不得改寫任何數字/);
});

test("LINE retry key is stable and UUID-shaped", () => {
  const key = lineRetryKey("2026-08-05");
  assert.equal(key, lineRetryKey("2026-08-05"));
  assert.match(key, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
});
