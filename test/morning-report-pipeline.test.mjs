import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMorningInfographicPrompt,
  buildMorningReportPrompt,
  compactMorningMarketData,
  morningLineRetryKey,
} from "../lib/morning-report-pipeline.js";

test("morning market data preserves required sections", () => {
  const data = compactMorningMarketData({
    generatedAt: "2026-08-05T00:00:00.000Z",
    indices: [{ label: "道瓊", price: 44193.12, changePercent: 1.03 }],
    tech: [{ label: "NVIDIA", price: 178.58, changePercent: 1.21 }],
    macro: [{ label: "美元指數", price: 98.39, changePercent: -0.13 }],
    sentiment: "偏多",
  });
  assert.equal(data.usIndices[0].price, 44193.12);
  assert.equal(data.technologyStocks[0].label, "NVIDIA");
  assert.equal(data.commoditiesAndIndicators[0].changePercent, -0.13);
});

test("morning report prompt requires all requested markets and source discipline", () => {
  const prompt = buildMorningReportPrompt("2026-08-05", {
    usIndices: [{ label: "NASDAQ", price: 21057.96 }],
  });
  assert.match(prompt, /台指期夜盤/);
  assert.match(prompt, /Amazon、Google、Meta、Microsoft、NVIDIA、台積電 ADR、Micron、Apple/);
  assert.match(prompt, /布蘭特原油、美國 10 年期公債殖利率、美元指數/);
  assert.match(prompt, /不可猜測/);
  assert.match(prompt, /21057\.96/);
});

test("morning image prompt encodes reference layout and 9:16 constraints", () => {
  const prompt = buildMorningInfographicPrompt({
    reportDate: "2026-08-05",
    title: "老爸早安・股市快報",
    content: "台指期夜盤：資料待補",
  });
  assert.match(prompt, /2160×3840/);
  assert.match(prompt, /重要科技股表現/);
  assert.match(prompt, /今日台股可能影響/);
  assert.match(prompt, /台指期夜盤：資料待補/);
});

test("morning LINE retry key is stable, distinct and UUID-shaped", () => {
  const key = morningLineRetryKey("2026-08-05");
  assert.equal(key, morningLineRetryKey("2026-08-05"));
  assert.match(key, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
});
