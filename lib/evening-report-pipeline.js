import { createHash, randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import OpenAI from "openai";
import sharp from "sharp";
import { getEveningReportData } from "./market-data.js";
import { pushLineMessages } from "./line-push.js";

const ORIGINAL_MAX_BYTES = 10 * 1024 * 1024;
const PREVIEW_MAX_BYTES = 1024 * 1024;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function taipeiDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function compactMarketData(data) {
  const quote = (item) => ({
    label: item?.label ?? "未知",
    price: item?.price ?? null,
    changePercent: item?.changePercent ?? null,
    volume: item?.volume ?? null,
    currency: item?.currency ?? "",
    marketTime: item?.marketTime ?? null,
  });

  return {
    generatedAt: data.generatedAt,
    target009826: quote(data.target),
    etfComparisons: data.etf.map(quote),
    globalMarkets: data.markets.map(quote),
    nav: data.nav ?? null,
    premiumDiscount: data.premiumDiscount ?? null,
  };
}

export function buildReportPrompt(reportDate, marketData) {
  return `
你是台灣投資研究編輯。請產出 ${reportDate} 收盤後的繁體中文投資日報，供 9:16 手機資訊圖排版。

必須使用 web search 查核今天或最近一個交易日的 AI、半導體、科技產業重要新聞與市場資金流向。
市場數字只能使用下方 JSON；不可自行補數字。null 一律寫「資料待補」。新聞需標示來源名稱與日期，但不要貼長網址。
全文約 700 至 1,000 個中文字，重點式、1 至 3 分鐘讀完，不使用 Markdown 表格。

請嚴格依七段輸出：
1. 全球市場重點（美股、台股）
2. 009826 追蹤（收盤價、成交量、折溢價、淨值）
3. 與 VT、QQQ、0050、006208 表現比較
4. AI、半導體與科技重要新聞及影響
5. 市場資金流向與值得注意的現象
6. 長期投資觀點與風險提醒
7. 一句話總結

每段最多 3 個短點。不得保證報酬、不得給短線買賣指令。最後加註「資料僅供參考，不構成投資建議」。

市場資料 JSON：
${JSON.stringify(marketData)}
  `.trim();
}

export async function generateEveningReportContent(now = new Date()) {
  const reportDate = taipeiDate(now);
  const data = await getEveningReportData();
  const marketData = compactMarketData(data);
  const openai = new OpenAI({ apiKey: requiredEnv("OPENAI_API_KEY") });
  const response = await openai.responses.create({
    model: process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5.6-luna",
    input: buildReportPrompt(reportDate, marketData),
    tools: [{ type: "web_search" }],
  });
  const content = response.output_text?.trim();
  if (!content) throw new Error("OpenAI report response was empty");

  return {
    reportDate,
    title: `${reportDate} 每日收盤後投資日報`,
    content,
  };
}

export function buildInfographicPrompt(report) {
  return `
製作一張發布用的單頁 9:16 直式繁體中文投資資訊圖，不是草稿。

視覺：純白背景、乾淨留白、精緻科技感結合手繪線稿插畫；深藍與靛青主色，紅綠只標漲跌。使用卡片、細線、迷你圖表、晶片與地球線稿。手機 LINE 聊天室中必須清楚易讀。
尺寸：2160×3840。不要 Logo、水印、QR code 或未提供的數字。
排版：由上而下七個編號區塊，標題與金融數字優先清晰。全文只用繁體中文，ETF 代號與英文縮寫除外。
忠實使用原文，不得改寫任何數字；資訊過長時，優先保留全部數字、比較結論、風險提醒和一句話總結。

標題：${report.title}
日期：${report.reportDate}

日報原文：
${report.content}
  `.trim();
}

export async function generateInfographic(report) {
  const openai = new OpenAI({ apiKey: requiredEnv("OPENAI_API_KEY") });
  const allowedQualities = new Set(["low", "medium", "high", "auto"]);
  const requestedQuality = process.env.OPENAI_IMAGE_QUALITY?.trim() || "high";
  const quality = allowedQualities.has(requestedQuality) ? requestedQuality : "high";
  const result = await openai.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2",
    prompt: buildInfographicPrompt(report),
    size: "2160x3840",
    quality,
    output_format: "jpeg",
    output_compression: 90,
  });
  const base64 = result.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI image response did not contain image data");
  return Buffer.from(base64, "base64");
}

async function encodeUnderLimit(input, { maxBytes, width, initialQuality }) {
  for (let quality = initialQuality; quality >= 48; quality -= 10) {
    const output = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    if (output.byteLength <= maxBytes) return output;
  }
  throw new Error(`Unable to encode LINE image below ${maxBytes} bytes`);
}

export async function prepareLineImages(input) {
  const [original, preview] = await Promise.all([
    encodeUnderLimit(input, {
      maxBytes: ORIGINAL_MAX_BYTES,
      width: 2160,
      initialQuality: 88,
    }),
    encodeUnderLimit(input, {
      maxBytes: PREVIEW_MAX_BYTES,
      width: 720,
      initialQuality: 78,
    }),
  ]);
  return { original, preview };
}

export async function uploadInfographic(report, images) {
  requiredEnv("BLOB_READ_WRITE_TOKEN");
  const safeDate = report.reportDate.replace(/[^0-9-]/g, "") || Date.now().toString();
  const suffix = randomUUID();
  const [originalBlob, previewBlob] = await Promise.all([
    put(`evening-reports/${safeDate}-${suffix}.jpg`, images.original, {
      access: "public",
      contentType: "image/jpeg",
    }),
    put(`evening-reports/${safeDate}-${suffix}-preview.jpg`, images.preview, {
      access: "public",
      contentType: "image/jpeg",
    }),
  ]);
  return {
    originalContentUrl: originalBlob.url,
    previewImageUrl: previewBlob.url,
  };
}

export function lineRetryKey(reportDate) {
  const hex = createHash("sha256")
    .update(`evening-report:${reportDate}`)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export async function runEveningReportPipeline(now = new Date()) {
  const report = await generateEveningReportContent(now);
  const generated = await generateInfographic(report);
  const images = await prepareLineImages(generated);
  const urls = await uploadInfographic(report, images);
  const line = await pushLineMessages(
    [{ type: "image", ...urls }],
    { retryKey: lineRetryKey(report.reportDate) },
  );
  return { report, urls, line };
}
