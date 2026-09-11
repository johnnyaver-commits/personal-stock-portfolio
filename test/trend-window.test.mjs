import assert from "node:assert/strict";
import test from "node:test";
import { latestCalendarMonths } from "../lib/trendWindow.js";

function point(snapshotDate) {
  return { snapshot_date: snapshotDate };
}

test("daily trend keeps the latest six calendar months", () => {
  const rows = [
    point("2026-02-27"),
    point("2026-03-31"),
    point("2026-04-01"),
    point("2026-04-30"),
    point("2026-05-29"),
    point("2026-06-30"),
    point("2026-07-31"),
    point("2026-08-31"),
    point("2026-09-01")
  ];

  assert.deepEqual(
    latestCalendarMonths(rows).map((row) => row.snapshot_date),
    ["2026-04-01", "2026-04-30", "2026-05-29", "2026-06-30", "2026-07-31", "2026-08-31", "2026-09-01"]
  );
});

test("six-month trend window works across year boundaries", () => {
  const rows = [
    point("2025-08-31"),
    point("2025-09-01"),
    point("2025-12-31"),
    point("2026-01-30"),
    point("2026-02-27")
  ];

  assert.deepEqual(
    latestCalendarMonths(rows).map((row) => row.snapshot_date),
    ["2025-09-01", "2025-12-31", "2026-01-30", "2026-02-27"]
  );
});

test("empty trend input stays empty", () => {
  assert.deepEqual(latestCalendarMonths([]), []);
});
