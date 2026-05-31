const HoldingModel = {
  tableName: "holdings",
  fields: {
    id: "bigserial primary key",
    user_id: "bigint references users(id)",
    symbol: "varchar(32)",
    name: "varchar(255)",
    quantity: "numeric(20, 6)",
    avg_cost: "numeric(20, 6)",
    currency: "varchar(3)",
    created_at: "timestamptz",
    updated_at: "timestamptz"
  }
};

module.exports = HoldingModel;
