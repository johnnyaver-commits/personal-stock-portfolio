import assert from "node:assert/strict";
import test from "node:test";
import { hasLinePushQuota } from "../lib/line-push.js";

test("limited LINE plans require usage below the monthly quota", () => {
  assert.equal(hasLinePushQuota({ type: "limited", value: 200 }, { totalUsage: 189 }, 11), true);
  assert.equal(hasLinePushQuota({ type: "limited", value: 200 }, { totalUsage: 189 }, 12), false);
  assert.equal(hasLinePushQuota({ type: "limited", value: 200 }, { totalUsage: 200 }, 1), false);
});

test("non-limited LINE plans remain available", () => {
  assert.equal(hasLinePushQuota({ type: "none" }, { totalUsage: 500 }), true);
});
