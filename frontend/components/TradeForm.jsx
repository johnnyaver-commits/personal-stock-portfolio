"use client";

import { PlusCircle } from "lucide-react";
import { useState } from "react";

const initialForm = {
  trade_date: new Date().toISOString().slice(0, 10),
  symbol: "2330.TW",
  type: "buy",
  price: "600",
  quantity: "100",
  fee: "20"
};

export default function TradeForm({ onSubmit }) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("");

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setStatus("儲存中...");
    try {
      await onSubmit({
        ...form,
        price: Number(form.price),
        quantity: Number(form.quantity),
        fee: Number(form.fee)
      });
      setStatus("交易已新增");
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>新增交易</h2>
          <p>買進會更新平均成本，賣出會估算已實現損益</p>
        </div>
      </div>
      <form className="form" onSubmit={submit}>
        <div className="form-row">
          <div className="field">
            <label htmlFor="trade_date">交易日期</label>
            <input id="trade_date" name="trade_date" type="date" value={form.trade_date} onChange={updateField} />
          </div>
          <div className="field">
            <label htmlFor="type">類型</label>
            <select id="type" name="type" value={form.type} onChange={updateField}>
              <option value="buy">買進</option>
              <option value="sell">賣出</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="symbol">股票代號</label>
          <input id="symbol" name="symbol" value={form.symbol} onChange={updateField} required />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="price">價格</label>
            <input id="price" name="price" type="number" step="0.01" min="0" value={form.price} onChange={updateField} required />
          </div>
          <div className="field">
            <label htmlFor="quantity">數量</label>
            <input id="quantity" name="quantity" type="number" step="0.0001" min="0" value={form.quantity} onChange={updateField} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="fee">手續費</label>
          <input id="fee" name="fee" type="number" step="0.01" min="0" value={form.fee} onChange={updateField} />
        </div>
        <div className="actions">
          <button className="button" type="submit">
            <PlusCircle size={16} aria-hidden="true" />
            新增交易
          </button>
          <span className="status">{status}</span>
        </div>
      </form>
    </section>
  );
}
