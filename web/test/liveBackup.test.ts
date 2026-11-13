import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backupLiveSnapshot } from '../scripts/live-backup.mjs';
test('live backup writes full snapshot privately and verifies exact bytes', () => {
 const dir = mkdtempSync(join(tmpdir(), 'live-backup-'));
 try {
  const snapshot = { schema: 'opentakeoff.takeoff_canvas.v1', project_name: '697', shapes: [], conditions: [{ id: 'c1' }] };
  const result = backupLiveSnapshot(snapshot, dir);
  assert.deepEqual(JSON.parse(readFileSync(result.backup_path, 'utf8')), snapshot);
  assert.equal(statSync(result.backup_path).mode & 0o777, 0o600);
  assert.match(result.backup_sha256, /^[a-f0-9]{64}$/);
 } finally { rmSync(dir, { recursive: true, force: true }); }
});
