function formatMoney(value) {
  return new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

export default function PriceChart({ holdings }) {
  const total = holdings.reduce((sum, item) => sum + Number(item.market_value ?? 0), 0);
  let offset = 0;
  const colors = ["#0f766e", "#2563eb", "#9333ea", "#c2410c", "#a16207", "#64748b"];

  return (
    <section className="panel" id="allocation">
      <div className="panel-header">
        <div>
          <h2>市值配置</h2>
          <p>依各持股目前市值分布</p>
        </div>
      </div>
      <div className="chart">
        <svg viewBox="0 0 420 220" role="img" aria-label="市值配置長條圖">
          <line x1="20" y1="190" x2="400" y2="190" stroke="#d9e2ec" />
          {holdings.map((holding, index) => {
            const width = total ? (Number(holding.market_value) / total) * 360 : 0;
            const y = 24 + index * 31;
            const currentOffset = offset;
            offset += width;
            return (
              <g key={holding.id}>
                <rect x={20 + currentOffset} y={y} width={Math.max(width, 2)} height="22" rx="4" fill={colors[index % colors.length]} />
                <text x="20" y={y + 43} fill="#64748b" fontSize="11">
                  {holding.symbol}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="chart-list">
          {holdings.map((holding, index) => (
            <div className="chart-item" key={holding.id}>
              <span>
                <span className="legend-dot" style={{ backgroundColor: colors[index % colors.length] }} /> {holding.symbol}
              </span>
              <strong>{formatMoney(holding.market_value)}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
