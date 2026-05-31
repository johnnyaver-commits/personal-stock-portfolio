import { roundMoney } from "@/lib/calculations";

const YAHOO_CHART_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search";

function fallbackQuote(symbol, fallbackPrice) {
  return {
    price: roundMoney(fallbackPrice ?? 0),
    currency: symbol.endsWith(".TW") ? "TWD" : "USD",
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
    currency: meta?.currency ?? (symbol.endsWith(".TW") ? "TWD" : "USD"),
    timestamp: meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
    source: "yahoo-finance-chart",
    exchange: meta?.fullExchangeName ?? meta?.exchangeName ?? "",
    market_state: meta?.marketState ?? "",
    delayed: true
  };
}

export async function fetchYahooQuote(symbol, fallbackPrice) {
  const normalizedSymbol = String(symbol ?? "").trim().toUpperCase();
  if (!normalizedSymbol) return fallbackQuote(normalizedSymbol, fallbackPrice);

  const url = `${YAHOO_CHART_BASE_URL}/${encodeURIComponent(normalizedSymbol)}?range=1d&interval=1m`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 portfolio-dashboard"
      }
    });

    if (!response.ok) {
      return fallbackQuote(normalizedSymbol, fallbackPrice);
    }

    return parseYahooQuote(normalizedSymbol, await response.json(), fallbackPrice);
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

export async function searchYahooSymbols(query) {
  const trimmedQuery = String(query ?? "").trim();
  if (trimmedQuery.length < 2) return [];

  const url = `${YAHOO_SEARCH_URL}?q=${encodeURIComponent(trimmedQuery)}&quotesCount=12&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;
  const fallbackResults = [];

  if (/^\d{4,6}$/.test(trimmedQuery)) {
    fallbackResults.push({
      symbol: `${trimmedQuery}.TW`,
      name: `台股 ${trimmedQuery}`,
      exchange: "Taiwan",
      market: "台股"
    });
  }

  if (/^[A-Za-z.]{1,5}$/.test(trimmedQuery)) {
    fallbackResults.push({
      symbol: trimmedQuery.toUpperCase(),
      name: `美股 ${trimmedQuery.toUpperCase()}`,
      exchange: "US",
      market: "美股"
    });
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 portfolio-dashboard"
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    const yahooResults = (data?.quotes ?? [])
      .filter((quote) => quote.quoteType === "EQUITY")
      .map((quote) => ({
        symbol: String(quote.symbol ?? "").toUpperCase(),
        name: quote.shortname ?? quote.longname ?? quote.name ?? quote.symbol,
        exchange: quote.exchDisp ?? quote.exchange ?? "",
        market: inferMarket(quote)
      }))
      .filter((quote) => quote.symbol && ["台股", "美股"].includes(quote.market))
      .slice(0, 8);

    const seen = new Set(yahooResults.map((quote) => quote.symbol));
    return [
      ...yahooResults,
      ...fallbackResults.filter((quote) => !seen.has(quote.symbol))
    ].slice(0, 8);
  } catch {
    return fallbackResults;
  }
}
