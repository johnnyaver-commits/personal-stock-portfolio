const express = require("express");
const cors = require("cors");
const holdingsRouter = require("./routes/holdings");
const transactionsRouter = require("./routes/transactions");
const { getQuotes } = require("./controllers/quoteController");

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/holdings", holdingsRouter);
app.use("/api/transactions", transactionsRouter);
app.get("/api/quotes", getQuotes);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Portfolio API listening on ${port}`);
  });
}

module.exports = app;
