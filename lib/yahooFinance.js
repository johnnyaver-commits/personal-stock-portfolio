import { roundMoney } from "@/lib/calculations";

const YAHOO_CHART_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

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
