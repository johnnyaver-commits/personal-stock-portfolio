const express = require("express");

const router = express.Router();
let transactions = [];

router.get("/", (req, res) => {
  const { symbol, from, to } = req.query;
  const filtered = transactions.filter((item) => {
    if (symbol && item.symbol !== String(symbol).toUpperCase()) return false;
    if (from && item.trade_date < from) return false;
    if (to && item.trade_date > to) return false;
    return true;
  });
  res.json({ transactions: filtered });
});

router.post("/", (req, res) => {
  const transaction = {
    id: transactions.length ? Math.max(...transactions.map((item) => item.id)) + 1 : 1,
    symbol: String(req.body.symbol || "").toUpperCase(),
    type: req.body.type === "sell" ? "sell" : "buy",
    trade_date: req.body.trade_date || new Date().toISOString().slice(0, 10),
    price: Number(req.body.price || 0),
    quantity: Number(req.body.quantity || 0),
    fee: Number(req.body.fee || 0),
    realized_pnl: 0
  };
  transactions.unshift(transaction);
  res.status(201).json(transaction);
});

router.put("/:id", (req, res) => {
  const index = transactions.findIndex((item) => item.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Transaction not found" });
  transactions[index] = { ...transactions[index], ...req.body, id: transactions[index].id };
  return res.json(transactions[index]);
});

router.delete("/:id", (req, res) => {
  const before = transactions.length;
  transactions = transactions.filter((item) => item.id !== Number(req.params.id));
  if (before === transactions.length) return res.status(404).json({ message: "Transaction not found" });
  return res.json({ deleted: true });
});

module.exports = router;
