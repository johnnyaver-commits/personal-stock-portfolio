import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const config = JSON.parse(
  await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
);

function scheduleFor(path) {
  return config.crons.find((cron) => cron.path === path)?.schedule;
}

test("morning report runs Mondays at 08:00 Asia/Taipei", () => {
  assert.equal(scheduleFor("/api/cron/morning-report"), "0 0 * * 1");
});

test("evening report runs Fridays at 20:00 Asia/Taipei", () => {
  assert.equal(scheduleFor("/api/cron/evening-report"), "0 12 * * 5");
});
