const UserSettingsModel = {
  tableName: "user_settings",
  fields: {
    id: "bigserial primary key",
    user_id: "bigint references users(id)",
    default_currency: "varchar(3)",
    timezone: "varchar(64)",
    created_at: "timestamptz",
    updated_at: "timestamptz"
  }
};

module.exports = UserSettingsModel;
