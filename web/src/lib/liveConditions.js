// Conservative live cleanup: no cascades, no review/approval authority.
export function validateUnusedConditionRemoval(state, args) {
  for (const key of ['workspace_id', 'revision', 'project_name']) {
    if (typeof args[`expected_${key}`] !== 'string' || args[`expected_${key}`] !== state[key]) throw new Error(`Workspace ${key} changed or mismatch; read live state again`);
  }
  if (!Array.isArray(args.conditions) || !args.conditions.length) throw new Error('Explicit condition id/tag pairs required');
  if (state.snapshot.shapes.length) throw new Error('Removal requires zero shapes in the entire workspace');
  if (state.pending_proposals.length || state.snapshot.proposals?.length || state.snapshot.condition_edit_proposals?.length) throw new Error('Resolve pending proposals in the browser first');
  const ids = new Set();
  for (const target of args.conditions) {
    const condition = state.snapshot.conditions.find(c => c.id === target.id);
    if (!condition || condition.finish_tag !== target.finish_tag || ids.has(target.id)) throw new Error('Condition id/tag mismatch or duplicate');
    ids.add(target.id);
  }
  return [...ids];
}
