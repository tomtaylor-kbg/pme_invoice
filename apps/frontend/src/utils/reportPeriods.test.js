import { test } from "node:test";
import assert from "node:assert/strict";
import { shiftReportPeriod } from "./reportPeriods.js";

test("shiftReportPeriod navigue entre les rapports journaliers", () => {
  assert.equal(shiftReportPeriod("2026-10-01", "day", -1), "2026-09-30");
  assert.equal(shiftReportPeriod("2026-09-30", "day", 1), "2026-10-01");
});

test("shiftReportPeriod navigue entre les rapports mensuels", () => {
  assert.equal(shiftReportPeriod("2026-01", "month", -1), "2025-12");
  assert.equal(shiftReportPeriod("2025-12", "month", 1), "2026-01");
});

test("shiftReportPeriod conserve une valeur invalide", () => {
  assert.equal(shiftReportPeriod("date-invalide", "day", 1), "date-invalide");
});
