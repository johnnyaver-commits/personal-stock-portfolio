function createQuote(symbol) {
  const base = symbol.endsWith(".TW") ? 600 : 150;
  const factor = 1 + Math.sin(Date.now() / 45000 + symbol.length) * 0.02;
  return {
    price: Math.round(base * factor * 100) / 100,
    currency: symbol.endsWith(".TW") ? "TWD" : "USD",
    timestamp: new Date().toISOString(),
    source: "demo-realtime"
  };
}

function getQuotes(req, res) {
  const symbols = String(req.query.symbol || "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  if (!symbols.length) {
    return res.status(400).json({ message: "symbol query parameter is required" });
  }

  return res.json({
    quotes: Object.fromEntries(symbols.map((symbol) => [symbol, createQuote(symbol)]))
  });
}

module.exports = { getQuotes };
