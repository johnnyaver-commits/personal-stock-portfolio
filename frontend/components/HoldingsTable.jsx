function money(value, currency = "USD") {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number(value ?? 0));
}

function number(value) {
  return new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 4 }).format(Number(value ?? 0));
}

export default function HoldingsTable({ holdings }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>持股清單</h2>
          <p>以最新報價計算市值與未實現損益</p>
        </div>
        <span className="status">{holdings.length} 檔股票</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>代號</th>
              <th>名稱</th>
              <th>數量</th>
              <th>平均成本</th>
              <th>現價</th>
              <th>市值</th>
              <th>未實現損益</th>
              <th>報價時間</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => {
              const trendClass = holding.unrealized_pnl >= 0 ? "gain" : "loss";
              return (
                <tr key={holding.id}>
                  <td>
                    <div className="symbol">{holding.symbol}</div>
                    <div className="subtle">{holding.currency}</div>
                  </td>
                  <td>{holding.name}</td>
                  <td>{number(holding.quantity)}</td>
                  <td>{money(holding.avg_cost, holding.currency)}</td>
                  <td>{money(holding.current_price, holding.currency)}</td>
                  <td>{money(holding.market_value, holding.currency)}</td>
                  <td className={trendClass}>
                    {money(holding.unrealized_pnl, holding.currency)}
                    <div className="subtle">{number(holding.unrealized_pnl_percent)}%</div>
                  </td>
                  <td>
                    <span className="subtle">{new Date(holding.quote_time).toLocaleTimeString("zh-TW")}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
