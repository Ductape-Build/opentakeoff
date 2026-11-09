import test from "node:test";
import assert from "node:assert/strict";
import { seedConditions, instantiateTemplate } from "../src/lib/canvasUtil.js";

test("new projects start with no built-in conditions", () => {
  assert.deepEqual(seedConditions(), []);
  assert.notEqual(seedConditions(), seedConditions());
});

test("saved templates remain available for explicit application", () => {
  const template = { finish_tag: "CUSTOM-1", waste_pct: 0, materials: [] };
  const condition = instantiateTemplate(template);
  assert.equal(condition.finish_tag, "CUSTOM-1");
  assert.ok(condition.id);
  assert.equal(condition.waste_pct, 0);
  assert.deepEqual(seedConditions(), []);
});
