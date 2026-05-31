export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calculateHoldingMetrics(holding, quote) {
  const currentPrice = Number(quote?.price ?? holding.current_price ?? holding.avg_cost);
  const quantity = Number(holding.quantity);
  const avgCost = Number(holding.avg_cost);
  const marketValue = roundMoney(quantity * currentPrice);
  const costBasis = roundMoney(quantity * avgCost);
  const unrealizedPnL = roundMoney(marketValue - costBasis);
  const unrealizedPnLPercent = costBasis === 0 ? 0 : roundMoney((unrealizedPnL / costBasis) * 100);

  return {
    ...holding,
    current_price: roundMoney(currentPrice),
    market_value: marketValue,
    cost_basis: costBasis,
    unrealized_pnl: unrealizedPnL,
    unrealized_pnl_percent: unrealizedPnLPercent,
    quote_time: quote?.timestamp ?? new Date().toISOString()
  };
}

export function applyTransactionToHolding(holding, transaction) {
  const type = transaction.type;
  const quantity = Number(transaction.quantity);
  const price = Number(transaction.price);
  const fee = Number(transaction.fee ?? 0);
  const currentQuantity = Number(holding.quantity);
  const currentCost = Number(holding.avg_cost) * currentQuantity;

  if (type === "buy") {
    const newQuantity = currentQuantity + quantity;
    const newCost = currentCost + quantity * price + fee;
    return {
      ...holding,
      quantity: newQuantity,
      avg_cost: newQuantity === 0 ? 0 : roundMoney(newCost / newQuantity)
    };
  }

  const newQuantity = Math.max(0, currentQuantity - quantity);
  return {
    ...holding,
    quantity: newQuantity
  };
}
