const TransactionRecordModel = {
  tableName: "transaction_records",
  fields: {
    id: "bigserial primary key",
    holding_id: "bigint references holdings(id)",
    user_id: "bigint references users(id)",
    symbol: "varchar(32)",
    type: "buy | sell",
    trade_date: "date",
    price: "numeric(20, 6)",
    quantity: "numeric(20, 6)",
    fee: "numeric(20, 6)",
    realized_pnl: "numeric(20, 6)"
  }
};

module.exports = TransactionRecordModel;
