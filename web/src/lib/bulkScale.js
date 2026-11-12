// Bulk scale is deliberately fill-only: never silently replace a calibration.
export const sameScale = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9;

export function bulkScaleRow(row, upp, scales, shapes, openKeys) {
  if (!(Number.isFinite(upp) && upp > 0)) return { blocked: true, reason: "Choose a scale" };
  if (row.error) return { blocked: true, reason: row.error };
  if (scales[row.key] != null) return { blocked: true, reason: "Already set — kept unchanged" };
  if (!openKeys.has(row.key) && shapes.some(s => s.sheet_id === row.key && s.measure_role !== "count")) {
    return { blocked: true, reason: "Open this sheet to recalculate existing measurements" };
  }
  if (!row.detected) return { blocked: false, warning: true, reason: "No printed scale found — verify before selecting" };
  if (row.detected.multi) return { blocked: false, warning: true, reason: `Multiple scales; detected ${row.detected.label} — verify before selecting` };
  if (!sameScale(row.detected.upp, upp)) return { blocked: false, warning: true, reason: `Printed scale differs: ${row.detected.label}` };
  return { blocked: false, warning: false, reason: `Matches ${row.detected.label}` };
}

// Revalidate at Apply time: a stale dialog must never overwrite a scale.
export function planBulkScale(rows, selected, upp, scales, shapes, openKeys) {
  const chosen = new Set(selected), keys = [], skipped = [];
  for (const row of rows) {
    if (!chosen.has(row.key)) continue;
    const state = bulkScaleRow(row, upp, scales, shapes, openKeys);
    if (state.blocked) skipped.push({ key: row.key, reason: state.reason });
    else keys.push(row.key);
  }
  return { keys: [...new Set(keys)], skipped };
}
