# 個人股票庫存即時網站

Next.js 個人投資組合儀表板，支援持股清單、交易新增、即時報價輪詢、市值配置與損益計算。

## 快速開始

```bash
npm install
npm run dev
```

開啟 `http://localhost:3000`。

## 主要功能

- 持股清單：股票代號、名稱、數量、成本、現價、市值、未實現損益。
- 新增交易：買進更新平均成本，賣出估算已實現損益。
- 即時報價：目前使用 demo realtime quote provider，每 15 秒刷新。
- API：`/api/holdings`、`/api/transactions`、`/api/quotes`。
- 部署：可由 GitHub 連動 Vercel 自動部署。

## 正式環境建議

目前 demo 版使用記憶體 store，適合展示與開發驗證。正式上線請接 PostgreSQL，並套用 `db/migrations/001_create_tables.sql`。

行情 provider 可替換為 Fugle、Fubon、Finnhub 或 IEX Cloud，API key 應放在 Vercel Environment Variables，不要 commit 到 repo。
