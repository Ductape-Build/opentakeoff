import test from "node:test";
import assert from "node:assert/strict";
import { bulkScaleRow, planBulkScale, sameScale } from "../src/lib/bulkScale.js";

const upp = 1 / 36;
const match = { key: "plans.pdf", detected: { upp, label: '1/4" = 1\'-0"' } };
const different = { key: "plans.pdf#2", detected: { upp: 1 / 18, label: '1/8" = 1\'-0"' } };
const open = new Set<string>();

test("matching unscaled sheets can be bulk selected; other scales warn", () => {
  assert.equal(bulkScaleRow(match, upp, {}, [], open).warning, false);
  assert.equal(bulkScaleRow(different, upp, {}, [], open).warning, true);
  assert.equal(bulkScaleRow({ key: "unknown" }, upp, {}, [], open).warning, true);
  assert.equal(bulkScaleRow({ ...match, detected: { ...match.detected, multi: true } }, upp, {}, [], open).warning, true);
});

test("every existing scale is protected, including matching and custom calibrations", () => {
  for (const prior of [upp, 0.012345, 1 / 18]) {
    const scales = { [match.key]: prior };
    assert.equal(bulkScaleRow(match, upp, scales, [], open).blocked, true);
    assert.deepEqual(planBulkScale([match], [match.key], upp, scales, [], open).keys, []);
    assert.equal(scales[match.key], prior);
  }
});

test("closed dimensional measurements are protected; counts do not need recalculation", () => {
  const shape = { sheet_id: match.key, measure_role: "floor_area" };
  assert.equal(bulkScaleRow(match, upp, {}, [shape], open).blocked, true);
  assert.equal(bulkScaleRow(match, upp, {}, [shape], new Set([match.key])).blocked, false);
  assert.equal(bulkScaleRow(match, upp, {}, [{ ...shape, measure_role: "count" }], open).blocked, false);
});

test("apply revalidates selection, skips errors/stale scales, ignores unknown keys and deduplicates", () => {
  const broken = { key: "bad.pdf", error: "PDF unreadable" };
  const rows = [match, different, broken, match];
  const result = planBulkScale(rows, [match.key, different.key, broken.key, "not-a-sheet"], upp, { [different.key]: 1 / 18 }, [], open);
  assert.deepEqual(result.keys, [match.key]);
  assert.equal(result.skipped.length, 2);
  assert.deepEqual(planBulkScale(rows, [], upp, {}, [], open).keys, []);
});

test("invalid scales never apply; explicit warning-row selection is supported", () => {
  for (const value of [NaN, Infinity, 0, -1]) {
    assert.equal(bulkScaleRow(match, value, {}, [], open).blocked, true);
    assert.deepEqual(planBulkScale([match], [match.key], value, {}, [], open).keys, []);
  }
  assert.deepEqual(planBulkScale([different], [different.key], upp, {}, [], open).keys, [different.key]);
  assert.equal(sameScale(upp, upp + 1e-12), true);
  assert.equal(sameScale(NaN, NaN), false);
});
