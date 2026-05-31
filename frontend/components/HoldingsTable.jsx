import { Trash2 } from "lucide-react";

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

export default function HoldingsTable({ holdings, deletingId, onDelete }) {
  return (
    <section className="panel" id="holdings">
      <div className="panel-header">
        <div>
          <h2>持股清單</h2>
          <p>以最新報價計算市值與未實現損益</p>
        </div>
        <span className="status pill">{holdings.length} 檔股票</span>
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
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => {
              const trendClass = holding.unrealized_pnl >= 0 ? "gain" : "loss";
              const isDeleting = deletingId === holding.id;

              return (
                <tr key={holding.id}>
                  <td data-label="代號">
                    <div className="symbol">{holding.symbol}</div>
                    <div className="subtle">{holding.currency}</div>
                  </td>
                  <td data-label="名稱">{holding.name}</td>
                  <td data-label="數量">{number(holding.quantity)}</td>
                  <td data-label="平均成本">{money(holding.avg_cost, holding.currency)}</td>
                  <td data-label="現價">{money(holding.current_price, holding.currency)}</td>
                  <td data-label="市值">{money(holding.market_value, holding.currency)}</td>
                  <td data-label="未實現損益" className={trendClass}>
                    {money(holding.unrealized_pnl, holding.currency)}
                    <div className="subtle">{number(holding.unrealized_pnl_percent)}%</div>
                  </td>
                  <td data-label="報價時間">
                    <span className="subtle">{new Date(holding.quote_time).toLocaleTimeString("zh-TW")}</span>
                  </td>
                  <td data-label="操作">
                    <button className="icon-button danger" type="button" onClick={() => onDelete(holding)} disabled={isDeleting} title={`刪除 ${holding.symbol}`}>
                      <Trash2 size={16} aria-hidden="true" />
                      <span>{isDeleting ? "刪除中" : "刪除"}</span>
                    </button>
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
