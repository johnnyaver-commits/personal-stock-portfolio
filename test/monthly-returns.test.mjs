import assert from "node:assert/strict";
import test from "node:test";
import { calculateMonthlyPnlChanges } from "../lib/monthlyReturns.js";

const pnlKey = "twd_unrealized_pnl";

function point(snapshotDate, pnl) {
  return { snapshot_date: snapshotDate, [pnlKey]: pnl };
}

test("monthly chart calculates P&L changes by month", () => {
  const points = [
    point("2026-07-31", 100),
    point("2026-08-03", 130),
    point("2026-08-31", 90),
    point("2026-09-01", 110),
    point("2026-09-11", 150)
  ];

  assert.deepEqual(calculateMonthlyPnlChanges(points, pnlKey), [
    { month: "2026-07", value: 0 },
    { month: "2026-08", value: -10 },
    { month: "2026-09", value: 60 }
  ]);
});

test("first visible month uses its daily changes instead of showing a zero baseline", () => {
  const points = [
    point("2026-06-05", 100_000),
    point("2026-06-08", -312_000),
    point("2026-06-30", 384_000)
  ];

  assert.deepEqual(calculateMonthlyPnlChanges(points, pnlKey), [
    { month: "2026-06", value: 284_000 }
  ]);
});

test("monthly chart keeps at most six months and sorts its input", () => {
  const points = [
    point("2026-09-01", 70),
    point("2026-02-01", 10),
    point("2026-03-01", 20),
    point("2026-04-01", 30),
    point("2026-05-01", 40),
    point("2026-06-01", 50),
    point("2026-07-01", 60),
    point("2026-08-01", 65)
  ];

  assert.deepEqual(
    calculateMonthlyPnlChanges(points, pnlKey).map((item) => item.month),
    ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]
  );
});
