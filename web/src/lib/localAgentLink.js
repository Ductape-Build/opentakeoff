// Connect only when this local preview explicitly enables the bridge.
// Executes the existing browser agent registry: proposals retain its human gate.
export function startLocalAgentLink(execute) {
  if (location.protocol !== "http:" || location.hostname !== "127.0.0.1") return () => {};
  const controller = new AbortController();
  let timer;
  const client = crypto.randomUUID();
  const connect = async () => {
    try {
      const bootstrap = await fetch("/__agent/bootstrap", { signal: controller.signal });
      if (!bootstrap.ok || !bootstrap.headers.get("content-type")?.includes("application/json")) return;
      const { token } = await bootstrap.json();
      if (!token) return;
      const post = async (path, data) => {
        const response = await fetch(`/__agent/${path}`, {
          method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...data, client }),
        });
        if (!response.ok) throw new Error(`Local bridge: ${response.status}`);
        return response.json();
      };
      const poll = async () => {
        try {
          const { command } = await post("poll", {});
          if (command && !controller.signal.aborted) {
            let result;
            try { result = await execute(command.name, command.args); }
            catch (e) { result = { error: e.message }; }
            await post("result", { id: command.id, result });
          }
        } catch { /* reconnect only on refresh after server restart; never replay writes */ }
        if (!controller.signal.aborted) timer = setTimeout(poll, 400);
      };
      await poll();
    } catch { /* ordinary builds do not enable a bridge */ }
  };
  void connect();
  return () => { controller.abort(); clearTimeout(timer); };
}
