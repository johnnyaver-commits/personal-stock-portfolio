"use client";

import { Brain, RefreshCw } from "lucide-react";

function percent(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

export default function WeeklyAnalysis({ analysis, loading, onGenerate }) {
  return (
    <section className="panel weekly-analysis" id="weekly-analysis">
      <div className="panel-header weekly-analysis-header">
        <div>
          <h2>下週 AI 買股分析</h2>
          <p>{analysis ? `適用週次：${analysis.week_start}` : "每週五收盤後產生下週研究觀察清單。"}</p>
        </div>
        <button className="icon-button" disabled={loading} onClick={onGenerate} type="button">
          {loading ? <RefreshCw className="spin" size={16} /> : <Brain size={16} />}
          <span>{loading ? "分析中" : "立即分析"}</span>
        </button>
      </div>

      {analysis ? (
        <div className="weekly-analysis-body">
          <p className="weekly-summary">{analysis.summary}</p>
          <div className="analysis-list">
            {analysis.recommendations.slice(0, 8).map((item) => (
              <article className="analysis-item" key={`${item.owner_name}-${item.symbol}`}>
                <div className="analysis-item-top">
                  <div>
                    <strong>{item.symbol}</strong>
                    <span>{item.owner_name} · {item.name}</span>
                  </div>
                  <em className={item.action === "分批加碼觀察" ? "gain" : item.action === "暫緩加碼" ? "loss" : ""}>{item.action}</em>
                </div>
                <div className="analysis-score">
                  <span style={{ width: `${item.score}%` }} />
                </div>
                <div className="analysis-meta">
                  <span>信心分數 {item.score}</span>
                  <span>損益 {percent(item.unrealized_pnl_percent)}</span>
                  <span>集中度 {percent(item.concentration_percent)}</span>
                </div>
                <ul>
                  {item.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </article>
            ))}
          </div>
          <p className="analysis-disclaimer">{analysis.disclaimer}</p>
        </div>
      ) : (
        <div className="trend-empty">尚未產生週報，按「立即分析」建立第一份分析。</div>
      )}
    </section>
  );
}
