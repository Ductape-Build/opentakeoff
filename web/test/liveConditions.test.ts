import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUnusedConditionRemoval } from '../src/lib/liveConditions.js';
const state = { workspace_id: 'canvas:local', revision: '7', project_name: '697 Rhode Island', snapshot: { conditions: [{ id: 'c1', finish_tag: 'CPT-1' }], shapes: [] }, pending_proposals: [] };
const args = { expected_workspace_id: state.workspace_id, expected_revision: state.revision, expected_project_name: state.project_name, conditions: [{ id: 'c1', finish_tag: 'CPT-1' }] };
test('unused removal requires exact workspace, revision, name and id/tag pairs', () => {
  assert.deepEqual(validateUnusedConditionRemoval(state, args), ['c1']);
  for (const key of ['expected_workspace_id', 'expected_revision', 'expected_project_name']) assert.throws(() => validateUnusedConditionRemoval(state, { ...args, [key]: 'wrong' }), /changed|mismatch/);
  assert.throws(() => validateUnusedConditionRemoval(state, { ...args, conditions: [{ id: 'c1', finish_tag: 'WRONG' }] }), /mismatch/);
  assert.throws(() => validateUnusedConditionRemoval(state, { ...args, conditions: [] }), /Explicit/);
});
test('unused removal never cascades shapes or pending review work', () => {
  assert.throws(() => validateUnusedConditionRemoval({ ...state, snapshot: { ...state.snapshot, shapes: [{ condition_id: 'other' }] } }, args), /zero shapes/);
  assert.throws(() => validateUnusedConditionRemoval({ ...state, pending_proposals: [{}] }, args), /pending/);
});
