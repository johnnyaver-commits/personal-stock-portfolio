function fallbackQuote(symbol) {
  return {
    price: symbol.endsWith(".TW") ? 600 : 150,
    currency: symbol.endsWith(".TW") ? "TWD" : "USD",
    timestamp: new Date().toISOString(),
    source: "fallback-demo"
  };
}

async function createQuote(symbol) {
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 portfolio-dashboard"
      }
    });
    if (!response.ok) return fallbackQuote(symbol);
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    const price = meta?.regularMarketPrice;
    if (!Number.isFinite(price)) return fallbackQuote(symbol);
    return {
      price: Math.round(price * 100) / 100,
      currency: meta?.currency || (symbol.endsWith(".TW") ? "TWD" : "USD"),
      timestamp: meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
      source: "yahoo-finance-chart",
      delayed: true
    };
  } catch {
    return fallbackQuote(symbol);
  }
}

async function getQuotes(req, res) {
  const symbols = String(req.query.symbol || "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  if (!symbols.length) {
    return res.status(400).json({ message: "symbol query parameter is required" });
  }

  return res.json({
    quotes: Object.fromEntries(await Promise.all(symbols.map(async (symbol) => [symbol, await createQuote(symbol)])))
  });
}

module.exports = { getQuotes };
