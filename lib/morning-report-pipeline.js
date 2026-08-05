import { createHash, randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import OpenAI from "openai";
import { getMorningReportData } from "./market-data.js";
import { prepareLineImages, taipeiDate } from "./evening-report-pipeline.js";
import { pushLineMessages } from "./line-push.js";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function compactQuote(item) {
  return {
    label: item?.label ?? "未知",
    symbol: item?.symbol ?? "",
    price: item?.price ?? null,
    changePercent: item?.changePercent ?? null,
    currency: item?.currency ?? "",
    marketTime: item?.marketTime ?? null,
  };
}

export function compactMorningMarketData(data) {
  return {
    generatedAt: data.generatedAt,
    usIndices: data.indices.map(compactQuote),
    technologyStocks: data.tech.map(compactQuote),
    commoditiesAndIndicators: data.macro.map(compactQuote),
    computedTechnologySentiment: data.sentiment,
  };
}

export function buildMorningReportPrompt(reportDate, marketData) {
  return `
你是台灣財經早報編輯。請製作 ${reportDate} 早上 8 點發布的繁體中文「老爸早安・股市快報」文字底稿，供單張 9:16 手機資訊圖使用。

先使用 web search 查核「最近一個已完成交易日」的台指期夜盤收盤點數、漲跌點數與漲跌幅。優先採台灣期貨交易所或大型財經媒體，必須說明資料日期與來源；若無法可靠查到，三項均寫「資料待補」，絕對不可猜測。

美國四大指數、重要科技股、商品與指標的數字只能使用下方 JSON。null 寫「資料待補」，不得自行補值或混用不同交易日。新聞與今日事件可用 web search 補充，但需附來源名稱與日期。

全文約 450 至 700 個繁體中文字，短句、重點式、1 至 3 分鐘讀完，不用 Markdown 表格。請依下列六段輸出：
1. 台指期夜盤：收盤點數、漲跌點數、漲跌幅、資料日期與來源、一句氣氛判讀。
2. 美國四大指數：道瓊、S&P 500、NASDAQ、費城半導體的收盤點數與漲跌幅。
3. 重要科技股：Amazon、Google、Meta、Microsoft、NVIDIA、台積電 ADR、Micron、Apple 的收盤價與漲跌幅。
4. 重要商品與指標：布蘭特原油、美國 10 年期公債殖利率、美元指數；有空間再放黃金與 VIX。
5. 今日台股觀察：列出 2 至 4 個利多因素、留意事項，以及對電子、AI、半導體等族群的可能影響。只寫情境，不保證開盤方向。
6. 一句話總結與風險提醒。

台股慣例：上漲用紅色語意、下跌用綠色語意。不得給個股買賣指令；最後加註「資料僅供參考，不構成投資建議」。

市場資料 JSON：
${JSON.stringify(marketData)}
  `.trim();
}

export async function generateMorningReportContent(now = new Date()) {
  const reportDate = taipeiDate(now);
  const data = await getMorningReportData();
  const marketData = compactMorningMarketData(data);
  const openai = new OpenAI({ apiKey: requiredEnv("OPENAI_API_KEY") });
  const response = await openai.responses.create({
    model: process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5.6-luna",
    input: buildMorningReportPrompt(reportDate, marketData),
    tools: [{ type: "web_search" }],
  });
  const content = response.output_text?.trim();
  if (!content) throw new Error("OpenAI morning report response was empty");

  return {
    reportDate,
    title: "老爸早安・股市快報",
    content,
  };
}

export function buildMorningInfographicPrompt(report) {
  return `
製作一張可直接發布到 LINE 群組的單頁 9:16 直式繁體中文早晨股市資訊圖，不是網頁截圖，也不是草稿。

視覺請貼近高質感台灣財經早報：純白背景、深海軍藍標題與圓角細框、科技感結合溫暖手繪插畫；頁首有可愛太陽、機器人與台北城市線稿。卡片式資訊階層清楚，留白充足，手機閱讀時數字仍清晰。台股慣例使用紅色代表上漲、綠色代表下跌，其他文字深藍或黑色。

尺寸 2160×3840。全文只用繁體中文，股票名稱、指數與英文縮寫除外。不要水印、QR code、虛構 Logo、錯別字、亂碼或未提供的數字。

由上而下固定排版：
- 大標題「老爸早安 股市快報」、日期與製圖時間。
- 右上主卡「台指期夜盤」，放收盤、漲跌點數與幅度。
- 「美國四大指數」四張並排卡：道瓊、S&P 500、NASDAQ、費城半導體。
- 「重要科技股表現」2×4 卡片：Amazon、Google、Meta、Microsoft、NVIDIA、台積電 ADR、Micron、Apple。
- 右側直欄「重要商品與指標」：布蘭特原油、美債 10 年殖利率、美元指數，空間足夠再放黃金或 VIX。
- 「台股市場觀察重點」分成利多因素與留意事項。
- 「今日台股可能影響」分成今日情境、關注族群、風險提醒。
- 底部用醒目細框放「一句話總結」與資料來源。

必須忠實照抄下方底稿中的所有金融數字、正負號、日期與「資料待補」，不得推算、改寫或新增。資訊過長時先刪除形容詞，優先保留所有數字、今日台股觀察、一句話總結與風險提醒。

標題：${report.title}
日期：${report.reportDate}

早報底稿：
${report.content}
  `.trim();
}

export async function generateMorningInfographic(report) {
  const openai = new OpenAI({ apiKey: requiredEnv("OPENAI_API_KEY") });
  const allowedQualities = new Set(["low", "medium", "high", "auto"]);
  const requestedQuality = process.env.OPENAI_IMAGE_QUALITY?.trim() || "high";
  const quality = allowedQualities.has(requestedQuality) ? requestedQuality : "high";
  const result = await openai.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2",
    prompt: buildMorningInfographicPrompt(report),
    size: "2160x3840",
    quality,
    output_format: "jpeg",
    output_compression: 90,
  });
  const base64 = result.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI morning image response did not contain image data");
  return Buffer.from(base64, "base64");
}

export async function uploadMorningInfographic(report, images) {
  requiredEnv("BLOB_READ_WRITE_TOKEN");
  const safeDate = report.reportDate.replace(/[^0-9-]/g, "") || Date.now().toString();
  const suffix = randomUUID();
  const [originalBlob, previewBlob] = await Promise.all([
    put(`morning-reports/${safeDate}-${suffix}.jpg`, images.original, {
      access: "public",
      contentType: "image/jpeg",
    }),
    put(`morning-reports/${safeDate}-${suffix}-preview.jpg`, images.preview, {
      access: "public",
      contentType: "image/jpeg",
    }),
  ]);
  return {
    originalContentUrl: originalBlob.url,
    previewImageUrl: previewBlob.url,
  };
}

export function morningLineRetryKey(reportDate) {
  const hex = createHash("sha256")
    .update(`morning-report:${reportDate}`)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export async function runMorningReportPipeline(now = new Date()) {
  const report = await generateMorningReportContent(now);
  const generated = await generateMorningInfographic(report);
  const images = await prepareLineImages(generated);
  const urls = await uploadMorningInfographic(report, images);
  const line = await pushLineMessages(
    [{ type: "image", ...urls }],
    { retryKey: morningLineRetryKey(report.reportDate) },
  );
  return { report, urls, line };
}
