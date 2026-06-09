"use client";

import { Brain, RefreshCw } from "lucide-react";

function percent(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function actionClass(action) {
  if (action === "分批加碼觀察") return "gain";
  if (action === "暫緩加碼") return "loss";
  return "";
}

export default function WeeklyAnalysis({ analysis, loading, onGenerate }) {
  return (
    <section className="panel weekly-analysis" id="weekly-analysis">
      <div className="panel-header weekly-analysis-header">
        <div>
          <h2>下週 AI 買股分析</h2>
          <p>{analysis ? `下週起始日：${analysis.week_start}` : "每週五收盤後整理下週觀察清單。"}</p>
        </div>
        <button className="icon-button" disabled={loading} onClick={onGenerate} type="button">
          {loading ? <RefreshCw className="spin" size={16} /> : <Brain size={16} />}
          <span>{loading ? "分析中" : "立即分析"}</span>
        </button>
      </div>

      {analysis ? (
        <div className="weekly-analysis-body">
          <p className="weekly-summary">{analysis.summary}</p>
          {analysis.shareholder_context ? (
            <p className="weekly-summary">
              群聯千張大戶資料日 {analysis.shareholder_context.snapshot_date}，持股比例 {percent(analysis.shareholder_context.large_percentage)}。
            </p>
          ) : null}
          <div className="analysis-list">
            {analysis.recommendations.slice(0, 8).map((item) => (
              <article className="analysis-item" key={`${item.owner_name}-${item.symbol}`}>
                <div className="analysis-item-top">
                  <div>
                    <strong>{item.symbol}</strong>
                    <span>{item.owner_name} · {item.name}</span>
                  </div>
                  <em className={actionClass(item.action)}>{item.action}</em>
                </div>
                <div className="analysis-score">
                  <span style={{ width: `${item.score}%` }} />
                </div>
                <div className="analysis-meta">
                  <span>分數 {item.score}</span>
                  <span>損益 {percent(item.unrealized_pnl_percent)}</span>
                  <span>集中度 {percent(item.concentration_percent)}</span>
                </div>
                <ul>
                  {item.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="analysis-disclaimer">{analysis.disclaimer}</p>
        </div>
      ) : (
        <div className="trend-empty">尚未產生本週分析，請按立即分析產生最新觀察清單。</div>
      )}
    </section>
  );
}
