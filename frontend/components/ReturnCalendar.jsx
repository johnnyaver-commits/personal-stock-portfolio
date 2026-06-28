"use client";

import { useMemo, useState } from "react";

const text = {
  title: "\u5831\u916c\u65e5\u66c6",
  monthReturn: "\u5831\u916c",
  weeklyReturn: "\u9031\u640d\u76ca",
  noData: "\u5c1a\u7121\u5831\u916c\u65e5\u66c6\u8cc7\u6599",
  twd: "\u53f0\u80a1",
  usd: "\u7f8e\u80a1",
  weekdays: ["\u4e00", "\u4e8c", "\u4e09", "\u56db", "\u4e94"]
};

const marketModes = {
  TWD: {
    label: text.twd,
    currency: "TWD",
    costKey: "twd_cost_basis",
    pnlKey: "twd_unrealized_pnl"
  },
  USD: {
    label: text.usd,
    currency: "USD",
    costKey: "usd_cost_basis",
    pnlKey: "usd_unrealized_pnl"
  }
};

function monthKey(date) {
  return String(date ?? "").slice(0, 7);
}

function localDateParts(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return { year, month, day };
}

function weekdayIndex(value) {
  const { year, month, day } = localDateParts(value);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayIndex = date.getUTCDay();
  if (dayIndex === 0 || dayIndex === 6) return -1;
  return dayIndex - 1;
}

function isWeekday(value) {
  return weekdayIndex(value) >= 0;
}

function weekOfMonth(value) {
  const { year, month, day } = localDateParts(value);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = first.getUTCDay() === 0 ? 7 : first.getUTCDay();
  return Math.ceil((day + firstWeekday - 1) / 7);
}

function money(value, currency) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function compactMoney(value, currency) {
  const number = Number(value ?? 0);
  if (currency === "TWD" && Math.abs(number) >= 10000) return `${number >= 0 ? "+" : "-"}${(Math.abs(number) / 10000).toFixed(1)}\u842c`;
  return `${number >= 0 ? "+" : "-"}${money(Math.abs(number), currency)}`;
}

function buildCalendarPoints(points, mode, activeMonth) {
  const visiblePoints = [...points]
    .sort((a, b) => String(a.snapshot_date).localeCompare(String(b.snapshot_date)))
    .filter((point) => isWeekday(point.snapshot_date));

  return visiblePoints.map((point, index) => {
    const previous = visiblePoints[index - 1];
    const dailyReturn = previous ? Number(point[mode.pnlKey] ?? 0) - Number(previous[mode.pnlKey] ?? 0) : 0;
    return {
      date: point.snapshot_date,
      day: localDateParts(point.snapshot_date).day,
      dailyReturn
    };
  }).filter((point) => monthKey(point.date) === activeMonth);
}

function calendarRows(points) {
  const rows = Array.from({ length: 6 }, (_, index) => ({
    week: index + 1,
    days: Array(5).fill(null),
    weeklyReturn: 0
  }));

  for (const point of points) {
    const column = weekdayIndex(point.date);
    if (column < 0) continue;
    const row = rows[weekOfMonth(point.date) - 1];
    if (!row) continue;
    row.days[column] = point;
    row.weeklyReturn += point.dailyReturn;
  }

  return rows.filter((row) => row.days.some(Boolean));
}

export default function ReturnCalendar({ trends }) {
  const [modeKey, setModeKey] = useState("TWD");
  const mode = marketModes[modeKey];
  const dailyPoints = useMemo(() => trends?.daily ?? [], [trends]);
  const months = useMemo(() => [...new Set(dailyPoints.map((point) => monthKey(point.snapshot_date)))].filter(Boolean), [dailyPoints]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const activeMonth = selectedMonth || months.at(-1) || "";
  const monthPoints = useMemo(
    () => buildCalendarPoints(dailyPoints, mode, activeMonth),
    [activeMonth, dailyPoints, mode]
  );
  const rows = useMemo(() => calendarRows(monthPoints), [monthPoints]);
  const monthReturn = monthPoints.reduce((sum, point) => sum + point.dailyReturn, 0);

  if (!dailyPoints.length) {
    return (
      <section className="panel return-calendar-panel">
        <div className="panel-header">
          <div>
            <h2>{text.title}</h2>
            <p>{text.noData}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel return-calendar-panel" id="return-calendar">
      <div className="panel-header return-calendar-header">
        <div>
          <h2>{text.title}</h2>
          <div className="return-calendar-controls">
            <select value={activeMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              {months.map((item) => (
                <option key={item} value={item}>{item.replace("-", "/")} {text.monthReturn}</option>
              ))}
            </select>
            <div className="segmented" aria-label={text.title}>
              {Object.entries(marketModes).map(([key, item]) => (
                <button className={modeKey === key ? "active" : ""} key={key} type="button" onClick={() => setModeKey(key)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="return-calendar-summary">
          <span>{text.monthReturn}</span>
          <strong className={monthReturn >= 0 ? "gain" : "loss"}>{compactMoney(monthReturn, mode.currency)}</strong>
        </div>
      </div>

      <div className="return-calendar-body">
        <div className="return-calendar-weekdays">
          {text.weekdays.map((day) => <span key={day}>{day}</span>)}
          <span>{text.weeklyReturn}</span>
        </div>
        {rows.map((row) => (
          <div className="return-calendar-row" key={row.week}>
            {row.days.map((day, index) => (
              <div className={day ? `return-day ${day.dailyReturn >= 0 ? "positive" : "negative"}` : "return-day empty"} key={`${row.week}-${index}`}>
                {day ? (
                  <>
                    <span>{day.day}</span>
                    <strong>{compactMoney(day.dailyReturn, mode.currency)}</strong>
                  </>
                ) : null}
              </div>
            ))}
            <div className={`return-week ${row.weeklyReturn >= 0 ? "positive" : "negative"}`}>
              <span>{row.week}</span>
              <strong>{compactMoney(row.weeklyReturn, mode.currency)}</strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
