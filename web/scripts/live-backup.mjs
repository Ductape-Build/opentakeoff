import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, openSync, writeFileSync, fsyncSync, closeSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
export function backupLiveSnapshot(snapshot, dir) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.takeoff.json`);
  const bytes = JSON.stringify(snapshot, null, 2) + '\n';
  const fd = openSync(path, 'wx', 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
  if (readFileSync(path, 'utf8') !== bytes) throw new Error('Backup verification failed; nothing removed');
  return { backup_path: path, backup_sha256: createHash('sha256').update(bytes).digest('hex') };
}
