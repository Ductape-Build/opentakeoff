// Explicit live target. Never falls back to the independent Session engine.
import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { ok, fail } from './format.ts';

async function callLive(port: number, name: string, args: object = {}) {
  const path = join(homedir(), '.local/state/opentakeoff/agent-token');
  const stat = statSync(path);
  if ((stat.mode & 0o077) !== 0 || stat.uid !== process.getuid?.()) throw new Error('Live bridge token must be private and owned by this user');
  const token = readFileSync(path, 'utf8').trim();
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid live bridge token; start the opt-in preview');
  const response = await fetch(`http://127.0.0.1:${port}/__agent/${name === 'status' ? 'status' : 'call'}`, {
    method: name === 'status' ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(130000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(name === 'status' ? {} : { body: JSON.stringify({ name, args }) }),
  });
  const data: any = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || `Live bridge HTTP ${response.status}`);
  return data;
}
export function registerLiveBrowserTools(server: any) {
  const port = z.number().int().min(1024).max(65535).default(5188).describe('Pinned local preview port; desktop default 5188. Never an external host.');
  const run = (name: string) => async ({ port, ...args }: any) => { try { return ok(await callLive(port, name, args)); } catch (e) { return fail(e); } };
  server.registerTool('live_browser_status', {
    description: 'Check the opt-in authenticated loopback browser bridge (default port 5188). connected:false is NOT a live project. These live_* tools are separate from the offline engine tools and work before load_plan. Refresh the local canvas after starting the bridge.',
    inputSchema: { port }, outputSchema: { connected: z.boolean(), conflict: z.boolean(), client: z.string().nullable(), pending: z.number() },
  }, run('status'));
  server.registerTool('live_browser_state', {
    description: 'Read the actual connected browser workspace, not the independent MCP engine. Returns workspace_id, revision, project_name, source_files, sheets, conditions, shapes, pending_proposals and the full autosave/export snapshot. Compare these with the intended drawing before any write. No project replacement or human approval.',
    inputSchema: { port }, outputSchema: { workspace_id: z.string(), revision: z.string(), project_name: z.string(), status: z.string(), focused_sheet: z.string(), source_files: z.array(z.string()), sheets: z.array(z.any()), conditions: z.array(z.any()), shapes: z.array(z.any()), pending_proposals: z.array(z.any()), snapshot: z.object({}).passthrough() },
  }, run('workspace_state'));
  server.registerTool('live_remove_unused_conditions', {
    description: 'Remove only explicit id/finish_tag pairs from the connected browser after verifying its exact identity/revision/name. Requires ZERO shapes in the entire project and no pending proposals; never cascades, approves work or changes the independent MCP session. The loopback server writes, fsyncs and reads back a private full takeoff JSON backup BEFORE dispatching deletion; browser rechecks identity/revision after backup. Reuses canvas family/palette/active/annotation lifecycle. Returns backup_path and backup_sha256. Read live_browser_state afterward to verify; timeout is not proof a write failed. Backup contains annotations, not source PDFs; keep original PDFs for restore via Import takeoff.',
    inputSchema: {
      port,
      expected_workspace_id: z.string().min(1), expected_revision: z.string().min(1), expected_project_name: z.string(),
      conditions: z.array(z.object({ id: z.string().min(1), finish_tag: z.string().min(1) })).min(1),
    },
    outputSchema: { removed: z.array(z.object({ id: z.string(), finish_tag: z.string() })), workspace_id: z.string(), backup_path: z.string(), backup_sha256: z.string() },
  }, run('remove_unused_conditions'));
}
