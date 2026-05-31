import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

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

export default function HoldingsTable({ holdings, deletingId, savingId, showOwner = false, onDelete, onUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ quantity: "", avg_cost: "" });

  function startEdit(holding) {
    setEditingId(holding.id);
    setEditForm({
      quantity: String(holding.quantity ?? ""),
      avg_cost: String(holding.avg_cost ?? "")
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ quantity: "", avg_cost: "" });
  }

  async function saveEdit(holding) {
    await onUpdate(holding, {
      quantity: Number(editForm.quantity),
      avg_cost: Number(editForm.avg_cost)
    });
    cancelEdit();
  }

  return (
    <section className="panel" id="holdings">
      <div className="panel-header">
        <div>
          <h2>持股庫存</h2>
          <p>{showOwner ? "整合顯示所有持有人的股票，並保留個別歸屬。" : "顯示目前持有人的股票庫存與損益。"}</p>
        </div>
        <span className="status pill">{holdings.length} 筆持股</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {showOwner ? <th>持有人</th> : null}
              <th>代號</th>
              <th>名稱</th>
              <th>數量（股）</th>
              <th>平均成本</th>
              <th>現價</th>
              <th>市值</th>
              <th>未實現損益</th>
              <th>更新時間</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => {
              const trendClass = holding.unrealized_pnl >= 0 ? "gain" : "loss";
              const isDeleting = deletingId === holding.id;
              const isSaving = savingId === holding.id;
              const isEditing = editingId === holding.id;

              return (
                <tr key={holding.id}>
                  {showOwner ? <td data-label="持有人">{holding.owner_name}</td> : null}
                  <td data-label="代號">
                    <div className="symbol">{holding.symbol}</div>
                    <div className="subtle">{holding.currency}</div>
                  </td>
                  <td data-label="名稱">{holding.name}</td>
                  <td data-label="數量（股）">
                    {isEditing ? (
                      <input
                        className="edit-input"
                        min="0"
                        name="quantity"
                        onChange={(event) => setEditForm((current) => ({ ...current, quantity: event.target.value }))}
                        step="0.0001"
                        type="number"
                        value={editForm.quantity}
                      />
                    ) : (
                      number(holding.quantity)
                    )}
                  </td>
                  <td data-label="平均成本">
                    {isEditing ? (
                      <input
                        className="edit-input"
                        min="0"
                        name="avg_cost"
                        onChange={(event) => setEditForm((current) => ({ ...current, avg_cost: event.target.value }))}
                        step="0.01"
                        type="number"
                        value={editForm.avg_cost}
                      />
                    ) : (
                      money(holding.avg_cost, holding.currency)
                    )}
                  </td>
                  <td data-label="現價">{money(holding.current_price, holding.currency)}</td>
                  <td data-label="市值">{money(holding.market_value, holding.currency)}</td>
                  <td data-label="未實現損益" className={trendClass}>
                    {money(holding.unrealized_pnl, holding.currency)}
                    <div className="subtle">{number(holding.unrealized_pnl_percent)}%</div>
                  </td>
                  <td data-label="更新時間">
                    <span className="subtle">{new Date(holding.quote_time).toLocaleTimeString("zh-TW")}</span>
                  </td>
                  <td data-label="操作">
                    {isEditing ? (
                      <div className="row-actions">
                        <button className="icon-button" type="button" onClick={() => saveEdit(holding)} disabled={isSaving}>
                          <Check size={16} aria-hidden="true" />
                          <span>{isSaving ? "儲存中" : "儲存"}</span>
                        </button>
                        <button className="icon-button" type="button" onClick={cancelEdit} disabled={isSaving}>
                          <X size={16} aria-hidden="true" />
                          <span>取消</span>
                        </button>
                      </div>
                    ) : (
                      <div className="row-actions">
                        <button className="icon-button" type="button" onClick={() => startEdit(holding)} disabled={isDeleting}>
                          <Pencil size={16} aria-hidden="true" />
                          <span>編輯</span>
                        </button>
                        <button className="icon-button danger" type="button" onClick={() => onDelete(holding)} disabled={isDeleting} title={`刪除 ${holding.symbol}`}>
                          <Trash2 size={16} aria-hidden="true" />
                          <span>{isDeleting ? "刪除中" : "刪除"}</span>
                        </button>
                      </div>
                    )}
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
