function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function formatPercent(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

export default function PriceChart({ holdings, showOwner = false }) {
  const total = holdings.reduce((sum, item) => sum + Number(item.market_value ?? 0), 0);
  let offset = 0;
  const colors = ["#0f766e", "#2563eb", "#9333ea", "#c2410c", "#a16207", "#64748b", "#be185d", "#4d7c0f"];

  return (
    <section className="panel" id="allocation">
      <div className="panel-header">
        <div>
          <h2>庫存分布</h2>
          <p>{showOwner ? "依持有人與股票顯示目前庫存占比。" : "依股票顯示目前庫存占比。"}</p>
        </div>
      </div>
      <div className="chart">
        <svg className="allocation-chart" viewBox="0 0 420 160" role="img" aria-label="庫存分布圖">
          <line x1="20" y1="82" x2="400" y2="82" stroke="#d9e2ec" strokeWidth="18" strokeLinecap="round" />
          {holdings.map((holding, index) => {
            const width = total ? (Number(holding.market_value) / total) * 360 : 0;
            const currentOffset = offset;
            offset += width;
            return <rect key={holding.id} x={20 + currentOffset} y="73" width={Math.max(width, 2)} height="18" rx="9" fill={colors[index % colors.length]} />;
          })}
        </svg>
        <div className="chart-list">
          {holdings.map((holding, index) => {
            const percent = total ? (Number(holding.market_value ?? 0) / total) * 100 : 0;
            const label = showOwner ? `${holding.owner_name} · ${holding.symbol}` : holding.symbol;

            return (
              <div className="chart-item" key={holding.id}>
                <div className="chart-item-main">
                  <span className="legend-dot" style={{ backgroundColor: colors[index % colors.length] }} />
                  <div className="chart-item-text">
                    <strong>{label}</strong>
                    <small>{holding.name}</small>
                  </div>
                </div>
                <div className="chart-item-value">
                  <strong>{formatMoney(holding.market_value, holding.currency)}</strong>
                  <span>{formatPercent(percent)}</span>
                </div>
                <div className="chart-progress" aria-hidden="true">
                  <span style={{ width: `${Math.max(percent, 2)}%`, backgroundColor: colors[index % colors.length] }} />
                </div>
              </div>
            );
          })}
          {!holdings.length ? <div className="chart-empty">目前沒有持股資料</div> : null}
        </div>
      </div>
    </section>
  );
}
