// Opt-in loopback bridge for the local desktop installation, never public hosting.
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function localAgentBridge() {
  return {
    name: "opentakeoff-local-agent",
    configurePreviewServer(server) {
      if (process.env.OPENTAKEOFF_LOCAL_AGENT !== "1") return;
      const token = randomBytes(32).toString("hex");
      const dir = join(homedir(), ".local/state/opentakeoff");
      const tokenPath = join(dir, "agent-token");
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      writeFileSync(tokenPath, token, { mode: 0o600 });
      let lastSeen = 0;
      let client = null;
      const pending = new Map();
      const queue = [];
      server.httpServer.once("close", () => {
        for (const p of pending.values()) { clearTimeout(p.timer); p.reply(503, { error: "Bridge stopped" }); }
        try { unlinkSync(tokenPath); } catch { /* already removed */ }
      });
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0];
        if (!path?.startsWith("/__agent/")) return next();
        const reply = (status, data) => {
          if (res.writableEnded) return;
          res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
          res.end(JSON.stringify(data));
        };
        // Host pinning defeats DNS rebinding. No CORS: other sites cannot read bootstrap.
        if (req.headers.host !== "127.0.0.1:5173" || (req.headers.origin && req.headers.origin !== "http://127.0.0.1:5173")) return reply(403, { error: "Local origin required" });
        if (path === "/__agent/bootstrap" && req.method === "GET") {
          if (req.headers["sec-fetch-site"] !== "same-origin") return reply(403, { error: "Same-origin browser required" });
          return reply(200, { token });
        }
        const supplied = Buffer.from(req.headers.authorization || "");
        const expected = Buffer.from(`Bearer ${token}`);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return reply(401, { error: "Token required" });
        if (path === "/__agent/status" && req.method === "GET") return reply(200, { connected: Date.now() - lastSeen < 5000, client, pending: pending.size });
        if (req.method !== "POST") return reply(405, { error: "POST required" });
        try {
          let body = "";
          for await (const chunk of req) {
            body += chunk;
            if (body.length > 8 * 1024 * 1024) return reply(413, { error: "Request too large" });
          }
          const data = JSON.parse(body || "{}");
          if (path === "/__agent/poll") {
            if (typeof data.client !== "string" || data.client.length > 80) return reply(400, { error: "Client id required" });
            if (client && client !== data.client && Date.now() - lastSeen < 5000) return reply(409, { error: "Another canvas is connected; close extra OpenTakeoff tabs" });
            client = data.client; lastSeen = Date.now();
            let command;
            while (queue.length && !command) { const id = queue.shift(); if (pending.has(id)) command = pending.get(id).command; }
            return reply(200, { command: command || null });
          }
          if (path === "/__agent/result") {
            if (data.client !== client) return reply(409, { error: "Wrong canvas" });
            const p = pending.get(data.id);
            if (p) { clearTimeout(p.timer); pending.delete(data.id); p.reply(200, data.result); }
            return reply(200, { ok: true });
          }
          if (path === "/__agent/call") {
            if (Date.now() - lastSeen >= 5000) return reply(409, { error: "No canvas connected. Refresh the local app." });
            if (pending.size >= 10) return reply(429, { error: "Too many commands" });
            if (typeof data.name !== "string" || !data.args || typeof data.args !== "object" || Array.isArray(data.args)) return reply(400, { error: "Expected name and args object" });
            const id = randomUUID();
            const timer = setTimeout(() => { pending.delete(id); reply(504, { error: "Canvas timed out; inspect state before retrying a write" }); }, 60000);
            pending.set(id, { command: { id, name: data.name, args: data.args }, reply, timer });
            queue.push(id);
            return;
          }
          return reply(404, { error: "Unknown endpoint" });
        } catch (e) { return reply(400, { error: e.message }); }
      });
    },
  };
}
