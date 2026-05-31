const express = require("express");

const router = express.Router();
let holdings = [
  { id: 1, symbol: "2330.TW", name: "台積電", quantity: 100, avg_cost: 500, current_price: 600, currency: "TWD" }
];

router.get("/", (_req, res) => {
  res.json({ holdings });
});

router.post("/", (req, res) => {
  const holding = {
    id: holdings.length ? Math.max(...holdings.map((item) => item.id)) + 1 : 1,
    symbol: String(req.body.symbol || "").toUpperCase(),
    name: req.body.name || req.body.symbol,
    quantity: Number(req.body.quantity || 0),
    avg_cost: Number(req.body.avg_cost || 0),
    current_price: Number(req.body.current_price || req.body.avg_cost || 0),
    currency: req.body.currency || "USD"
  };
  holdings.push(holding);
  res.status(201).json(holding);
});

router.put("/:id", (req, res) => {
  const index = holdings.findIndex((item) => item.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Holding not found" });
  holdings[index] = { ...holdings[index], ...req.body, id: holdings[index].id };
  return res.json(holdings[index]);
});

router.delete("/:id", (req, res) => {
  const before = holdings.length;
  holdings = holdings.filter((item) => item.id !== Number(req.params.id));
  if (before === holdings.length) return res.status(404).json({ message: "Holding not found" });
  return res.json({ deleted: true });
});

module.exports = router;
