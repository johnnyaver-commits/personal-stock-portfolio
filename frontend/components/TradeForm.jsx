"use client";

import { PlusCircle, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/frontend/utils/api";

const initialForm = {
  trade_date: new Date().toISOString().slice(0, 10),
  owner_id: 1,
  symbol: "2330.TW",
  symbol_name: "台積電",
  market: "台股",
  currency: "TWD",
  type: "buy",
  price: "600",
  quantity: "100",
  fee: "20"
};

function hasChinese(value) {
  return /[\u4e00-\u9fff]/.test(String(value ?? ""));
}

function normalizeSymbolInput(value) {
  const nextValue = String(value ?? "").trimStart();
  return hasChinese(nextValue) ? nextValue : nextValue.toUpperCase();
}

function defaultCurrency(symbol, market) {
  const normalizedSymbol = String(symbol ?? "").toUpperCase();
  if (market === "台股" || normalizedSymbol.endsWith(".TW") || normalizedSymbol.endsWith(".TWO")) return "TWD";
  return "USD";
}

function inferMarket(symbol) {
  const normalizedSymbol = String(symbol ?? "").toUpperCase();
  if (normalizedSymbol.endsWith(".TW") || normalizedSymbol.endsWith(".TWO")) return "台股";
  return "";
}

export default function TradeForm({ owners = [], selectedOwnerId = "all", onSubmit }) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ignoreNextSearch = useRef(false);

  useEffect(() => {
    if (selectedOwnerId === "all") return;
    setForm((current) => ({ ...current, owner_id: Number(selectedOwnerId) }));
  }, [selectedOwnerId]);

  function updateField(event) {
    const { name, value } = event.target;
    const nextValue = name === "symbol" ? normalizeSymbolInput(value) : value;

    setForm((current) => {
      if (name !== "symbol") {
        return { ...current, [name]: name === "owner_id" ? Number(nextValue) : nextValue };
      }

      const market = inferMarket(nextValue);
      return {
        ...current,
        symbol: nextValue,
        symbol_name: "",
        market,
        currency: defaultCurrency(nextValue, market)
      };
    });

    if (name === "symbol") {
      setShowSuggestions(true);
    }
  }

  useEffect(() => {
    const query = form.symbol.trim();

    if (ignoreNextSearch.current) {
      ignoreNextSearch.current = false;
      return;
    }

    if (query.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.searchSymbols(query);
        setSuggestions(data.results ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [form.symbol]);

  function selectSymbol(suggestion) {
    ignoreNextSearch.current = true;
    setForm((current) => ({
      ...current,
      symbol: suggestion.symbol,
      symbol_name: suggestion.name,
      market: suggestion.market,
      currency: suggestion.currency || defaultCurrency(suggestion.symbol, suggestion.market)
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function submit(event) {
    event.preventDefault();
    if (hasChinese(form.symbol) && !form.symbol_name) {
      setStatus("請先從搜尋建議選擇股票");
      return;
    }

    setStatus("儲存中...");
    try {
      await onSubmit({
        ...form,
        owner_id: Number(form.owner_id),
        symbol: form.symbol.trim().toUpperCase(),
        name: form.symbol_name || form.symbol.trim().toUpperCase(),
        market: form.market || inferMarket(form.symbol),
        currency: form.currency || defaultCurrency(form.symbol, form.market),
        price: Number(form.price),
        quantity: Number(form.quantity),
        fee: Number(form.fee)
      });
      setStatus("已新增交易");
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="panel" id="trade">
      <div className="panel-header">
        <div>
          <h2>新增交易</h2>
          <p>選擇持有人後輸入代號或中文名稱，交易會歸到該人的庫存。</p>
        </div>
      </div>
      <form className="form" onSubmit={submit}>
        <div className="form-row">
          <div className="field">
            <label htmlFor="owner_id">持有人</label>
            <select id="owner_id" name="owner_id" value={form.owner_id} onChange={updateField}>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="trade_date">交易日期</label>
            <input id="trade_date" name="trade_date" type="date" value={form.trade_date} onChange={updateField} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="type">類型</label>
            <select id="type" name="type" value={form.type} onChange={updateField}>
              <option value="buy">買進</option>
              <option value="sell">賣出</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="quantity">數量（股）</label>
            <input id="quantity" name="quantity" type="number" step="0.0001" min="0" value={form.quantity} onChange={updateField} required />
          </div>
        </div>
        <div className="field symbol-field">
          <label htmlFor="symbol">股票代號或名稱</label>
          <div className="search-input">
            <Search size={16} aria-hidden="true" />
            <input
              autoComplete="off"
              id="symbol"
              name="symbol"
              value={form.symbol}
              onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
              onChange={updateField}
              onFocus={() => setShowSuggestions(true)}
              placeholder="輸入 AAPL、TSM、2330 或 台積電"
              required
            />
          </div>
          {showSuggestions && (searching || suggestions.length > 0) ? (
            <div className="symbol-menu" role="listbox" aria-label="股票搜尋建議">
              {searching ? <div className="symbol-menu-empty">搜尋中...</div> : null}
              {!searching
                ? suggestions.map((suggestion) => (
                    <button className="symbol-option" key={`${suggestion.market}-${suggestion.symbol}`} type="button" onMouseDown={() => selectSymbol(suggestion)}>
                      <span>
                        <strong>{suggestion.symbol}</strong>
                        <small>{suggestion.name}</small>
                      </span>
                      <em>
                        {suggestion.market} - {suggestion.currency || defaultCurrency(suggestion.symbol, suggestion.market)}
                      </em>
                    </button>
                  ))
                : null}
            </div>
          ) : null}
          <span className="status">
            {form.symbol_name ? `已選擇：${form.symbol_name} - ${form.currency}` : `目前幣別：${form.currency}`}
          </span>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="price">成交價（{form.currency}）</label>
            <input id="price" name="price" type="number" step="0.01" min="0" value={form.price} onChange={updateField} required />
          </div>
          <div className="field">
            <label htmlFor="fee">手續費（{form.currency}）</label>
            <input id="fee" name="fee" type="number" step="0.01" min="0" value={form.fee} onChange={updateField} />
          </div>
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
