const YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote";
const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

export const MORNING_SYMBOLS = {
  indices: [["^DJI", "道瓊"], ["^GSPC", "S&P 500"], ["^IXIC", "NASDAQ"], ["^SOX", "費半"]],
  tech: [["AMZN", "Amazon"], ["GOOGL", "Google"], ["META", "Meta"], ["MSFT", "Microsoft"], ["NVDA", "NVIDIA"], ["TSM", "台積電 ADR"], ["MU", "Micron"], ["AAPL", "Apple"]],
  macro: [["BZ=F", "布蘭特原油"], ["^TNX", "美債10年殖利率"], ["DX-Y.NYB", "美元指數"], ["GC=F", "黃金"], ["^VIX", "VIX"], ["^TWII", "台股加權"]],
};

export const EVENING_SYMBOLS = [["009826.TW", "009826"], ["VT", "VT"], ["QQQ", "QQQ"], ["0050.TW", "0050"], ["006208.TW", "006208"], ["^TWII", "台股加權"], ["^GSPC", "S&P 500"], ["^SOX", "費半"]];

function blankQuote(symbol, label) {
  return { symbol, label, price: null, changePercent: null, volume: null, marketTime: null, currency: "" };
}

function normalizeQuote(raw, label, fallbackSymbol = "") {
  const price = raw?.regularMarketPrice;
  const changePercent = raw?.regularMarketChangePercent;
  return {
    symbol: raw?.symbol || fallbackSymbol,
    label,
    price: Number.isFinite(price) ? price : null,
    changePercent: Number.isFinite(changePercent) ? changePercent : null,
    volume: Number.isFinite(raw?.regularMarketVolume) ? raw.regularMarketVolume : null,
    marketTime: raw?.regularMarketTime || null,
    currency: raw?.currency || "",
  };
}

async function fetchChartQuote(symbol, label) {
  try {
    const response = await fetch(`${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?interval=1d&range=5d`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JohnnyInvestmentAgent/1.0)" },
      cache: "no-store",
    });
    if (!response.ok) return blankQuote(symbol, label);
    const result = (await response.json())?.chart?.result?.[0];
    const meta = result?.meta || {};
    const price = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose;
    const changePercent = Number.isFinite(price) && Number.isFinite(previousClose) && previousClose !== 0
      ? ((price - previousClose) / previousClose) * 100
      : null;
    const volumes = result?.indicators?.quote?.[0]?.volume || [];
    const volume = [...volumes].reverse().find(Number.isFinite) ?? null;
    return {
      symbol,
      label,
      price: Number.isFinite(price) ? price : null,
      changePercent,
      volume,
      marketTime: meta.regularMarketTime || null,
      currency: meta.currency || "",
    };
  } catch {
    return blankQuote(symbol, label);
  }
}

export async function fetchQuotes(symbolPairs) {
  const symbols = symbolPairs.map(([symbol]) => symbol).join(",");
  try {
    const response = await fetch(`${YAHOO_QUOTE_URL}?symbols=${encodeURIComponent(symbols)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JohnnyInvestmentAgent/1.0)" },
      cache: "no-store",
    });
    if (response.ok) {
      const result = (await response.json())?.quoteResponse?.result || [];
      const bySymbol = new Map(result.map((item) => [item.symbol, item]));
      const quotes = symbolPairs.map(([symbol, label]) => normalizeQuote(bySymbol.get(symbol), label, symbol));
      if (quotes.some((q) => q.price != null)) return quotes;
    }
  } catch {}
  return Promise.all(symbolPairs.map(([symbol, label]) => fetchChartQuote(symbol, label)));
}

export async function getMorningReportData() {
  const allPairs = [...MORNING_SYMBOLS.indices, ...MORNING_SYMBOLS.tech, ...MORNING_SYMBOLS.macro];
  const quotes = await fetchQuotes(allPairs);
  const byLabel = new Map(quotes.map((q) => [q.label, q]));
  const indices = MORNING_SYMBOLS.indices.map(([, label]) => byLabel.get(label));
  const tech = MORNING_SYMBOLS.tech.map(([, label]) => byLabel.get(label));
  const macro = MORNING_SYMBOLS.macro.map(([, label]) => byLabel.get(label));
  const validTech = tech.filter((q) => q?.changePercent != null);
  const techAverage = validTech.length ? validTech.reduce((sum, q) => sum + q.changePercent, 0) / validTech.length : 0;
  const sentiment = techAverage > 1 ? "偏多" : techAverage < -1 ? "偏空" : "震盪";
  return { generatedAt: new Date().toISOString(), indices, tech, macro, sentiment };
}

export async function getEveningReportData() {
  const quotes = await fetchQuotes(EVENING_SYMBOLS);
  const etf = quotes.filter((q) => ["009826", "VT", "QQQ", "0050", "006208"].includes(q.label));
  const markets = quotes.filter((q) => !etf.includes(q));
  const target = etf.find((q) => q.label === "009826");
  return { generatedAt: new Date().toISOString(), etf, markets, target, premiumDiscount: null, nav: null };
}

export function formatNumber(value, digits = 2) {
  if (value == null) return "—";
  return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: digits }).format(value);
}

export function formatPercent(value) {
  if (value == null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatVolume(value) {
  if (value == null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}
