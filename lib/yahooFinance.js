import { roundMoney } from "@/lib/calculations";

const YAHOO_CHART_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search";
const QUOTE_CACHE_TTL_MS = 60_000;
const QUOTE_TIMEOUT_MS = 4_000;

const quoteCache = new Map();

const TAIWAN_SYMBOLS = [
  { symbol: "2330.TW", name: "台積電" },
  { symbol: "2317.TW", name: "鴻海" },
  { symbol: "2454.TW", name: "聯發科" },
  { symbol: "2308.TW", name: "台達電" },
  { symbol: "2412.TW", name: "中華電" },
  { symbol: "2881.TW", name: "富邦金" },
  { symbol: "2882.TW", name: "國泰金" },
  { symbol: "2891.TW", name: "中信金" },
  { symbol: "2886.TW", name: "兆豐金" },
  { symbol: "2884.TW", name: "玉山金" },
  { symbol: "2303.TW", name: "聯電" },
  { symbol: "2603.TW", name: "長榮" },
  { symbol: "2615.TW", name: "萬海" },
  { symbol: "1301.TW", name: "台塑" },
  { symbol: "1303.TW", name: "南亞" },
  { symbol: "2002.TW", name: "中鋼" },
  { symbol: "1216.TW", name: "統一" },
  { symbol: "2912.TW", name: "統一超" },
  { symbol: "5871.TW", name: "中租-KY" },
  { symbol: "3008.TW", name: "大立光" },
  { symbol: "3711.TW", name: "日月光投控" },
  { symbol: "2382.TW", name: "廣達" },
  { symbol: "2357.TW", name: "華碩" },
  { symbol: "2356.TW", name: "英業達" },
  { symbol: "2327.TW", name: "國巨" },
  { symbol: "3034.TW", name: "聯詠" },
  { symbol: "2395.TW", name: "研華" },
  { symbol: "3045.TW", name: "台灣大" },
  { symbol: "4904.TW", name: "遠傳" },
  { symbol: "5880.TW", name: "合庫金" }
];

function hasChinese(value) {
  return /[\u4e00-\u9fff]/.test(String(value ?? ""));
}

export function currencyForSymbol(symbol, market = "") {
  const normalizedSymbol = String(symbol ?? "").trim().toUpperCase();
  if (/^\d{4,6}$/.test(normalizedSymbol)) return "TWD";
  if (market === "台股" || normalizedSymbol.endsWith(".TW") || normalizedSymbol.endsWith(".TWO")) return "TWD";
  return "USD";
}

export function normalizePortfolioSymbol(symbol, market = "") {
  const normalizedSymbol = String(symbol ?? "").trim().toUpperCase();
  if (/^\d{4,6}$/.test(normalizedSymbol)) return `${normalizedSymbol}.TW`;
  return normalizedSymbol;
}

function fallbackQuote(symbol, fallbackPrice) {
  return {
    price: roundMoney(fallbackPrice ?? 0),
    currency: currencyForSymbol(symbol),
    timestamp: new Date().toISOString(),
    source: "fallback-demo"
  };
}

function parseYahooQuote(symbol, data, fallbackPrice) {
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  const quote = result?.indicators?.quote?.[0];
  const closes = Array.isArray(quote?.close) ? quote.close.filter((value) => Number.isFinite(value)) : [];
  const latestClose = closes.length ? closes[closes.length - 1] : null;
  const price = meta?.regularMarketPrice ?? latestClose;

  if (!Number.isFinite(price)) {
    return fallbackQuote(symbol, fallbackPrice);
  }

  return {
    price: roundMoney(price),
    currency: meta?.currency ?? currencyForSymbol(symbol),
    timestamp: meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
    source: "yahoo-finance-chart",
    exchange: meta?.fullExchangeName ?? meta?.exchangeName ?? "",
    market_state: meta?.marketState ?? "",
    delayed: true
  };
}

function cachedQuote(symbol) {
  const cached = quoteCache.get(symbol);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > QUOTE_CACHE_TTL_MS) return null;
  return cached.quote;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUOTE_TIMEOUT_MS);

  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 portfolio-dashboard"
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchYahooQuote(symbol, fallbackPrice) {
  const normalizedSymbol = String(symbol ?? "").trim().toUpperCase();
  if (!normalizedSymbol) return fallbackQuote(normalizedSymbol, fallbackPrice);

  const cached = cachedQuote(normalizedSymbol);
  if (cached) return cached;

  const url = `${YAHOO_CHART_BASE_URL}/${encodeURIComponent(normalizedSymbol)}?range=1d&interval=1m`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      return fallbackQuote(normalizedSymbol, fallbackPrice);
    }

    const quote = parseYahooQuote(normalizedSymbol, await response.json(), fallbackPrice);
    quoteCache.set(normalizedSymbol, { createdAt: Date.now(), quote });
    return quote;
  } catch {
    return fallbackQuote(normalizedSymbol, fallbackPrice);
  }
}

export async function fetchYahooQuotes(symbols, fallbackPriceBySymbol = new Map()) {
  const uniqueSymbols = [...new Set(symbols.map((symbol) => String(symbol ?? "").trim().toUpperCase()).filter(Boolean))];
  const entries = await Promise.all(
    uniqueSymbols.map(async (symbol) => [
      symbol,
      await fetchYahooQuote(symbol, fallbackPriceBySymbol.get(symbol))
    ])
  );
  return Object.fromEntries(entries);
}

function inferMarket(quote) {
  const symbol = String(quote.symbol ?? "").toUpperCase();
  const exchange = String(quote.exchange ?? "").toUpperCase();
  const exchangeDisplay = String(quote.exchDisp ?? quote.fullExchangeName ?? "").toLowerCase();

  if (symbol.endsWith(".TW") || symbol.endsWith(".TWO") || exchange === "TAI" || exchangeDisplay.includes("taiwan")) {
    return "台股";
  }

  if (["NMS", "NYQ", "NCM", "NGM", "NIM", "ASE", "PCX", "BTS", "NAS"].includes(exchange)) {
    return "美股";
  }

  if (exchangeDisplay.includes("nasdaq") || exchangeDisplay.includes("nyse") || exchangeDisplay.includes("american")) {
    return "美股";
  }

  return "";
}

function fallbackSymbolResults(query) {
  const trimmedQuery = String(query ?? "").trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const results = [];

  for (const stock of TAIWAN_SYMBOLS) {
    if (stock.name.includes(trimmedQuery) || stock.symbol.toLowerCase().includes(normalizedQuery)) {
      results.push({
        ...stock,
        exchange: "Taiwan",
        market: "台股",
        currency: "TWD"
      });
    }
  }

  if (/^\d{4,6}$/.test(trimmedQuery)) {
    results.push({
      symbol: `${trimmedQuery}.TW`,
      name: `台股 ${trimmedQuery}`,
      exchange: "Taiwan",
      market: "台股",
      currency: "TWD"
    });
  }

  if (/^[A-Za-z.]{1,5}$/.test(trimmedQuery)) {
    results.push({
      symbol: trimmedQuery.toUpperCase(),
      name: `美股 ${trimmedQuery.toUpperCase()}`,
      exchange: "US",
      market: "美股",
      currency: "USD"
    });
  }

  const seen = new Set();
  return results.filter((result) => {
    if (seen.has(result.symbol)) return false;
    seen.add(result.symbol);
    return true;
  });
}

export async function searchYahooSymbols(query) {
  const trimmedQuery = String(query ?? "").trim();
  if (trimmedQuery.length < 2) return [];

  const fallbackResults = fallbackSymbolResults(trimmedQuery);
  const url = `${YAHOO_SEARCH_URL}?q=${encodeURIComponent(trimmedQuery)}&quotesCount=12&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return fallbackResults.slice(0, 8);

    const data = await response.json();
    const yahooResults = (data?.quotes ?? [])
      .filter((quote) => quote.quoteType === "EQUITY")
      .map((quote) => {
        const market = inferMarket(quote);
        const symbol = String(quote.symbol ?? "").toUpperCase();
        return {
          symbol,
          name: quote.shortname ?? quote.longname ?? quote.name ?? quote.symbol,
          exchange: quote.exchDisp ?? quote.exchange ?? "",
          market,
          currency: currencyForSymbol(symbol, market)
        };
      })
      .filter((quote) => quote.symbol && ["台股", "美股"].includes(quote.market));

    const orderedResults = hasChinese(trimmedQuery) ? [...fallbackResults, ...yahooResults] : [...yahooResults, ...fallbackResults];
    const seen = new Set();

    return orderedResults
      .filter((quote) => {
        if (seen.has(quote.symbol)) return false;
        seen.add(quote.symbol);
        return true;
      })
      .slice(0, 8);
  } catch {
    return fallbackResults.slice(0, 8);
  }
}
