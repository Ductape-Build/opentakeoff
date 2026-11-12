import { useEffect, useRef, useState } from "react";
import { STANDARD_SCALES } from "../lib/sheets";
import { bulkScaleRow } from "../lib/bulkScale.js";
import { Z } from "../lib/ui.js";

export default function BulkScaleDialog({ initialUpp, scan, scales, shapes, openKeys, onApply, onClose, onMenuDepth }) {
  const [upp, setUpp] = useState(initialUpp || STANDARD_SCALES.find(s => s.label === '1/4" = 1\'-0"')?.upp || STANDARD_SCALES[0].upp);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Reading printed scales across the set…");
  const [selected, setSelected] = useState(new Set());
  const root = useRef(null);
  const previousFocus = useRef(document.activeElement);
  const scanRef = useRef(scan);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    scanRef.current(controller.signal, text => { if (!cancelled) setMessage(text); })
      .then(result => { if (!cancelled) { setRows(result); setMessage(""); setLoading(false); } })
      .catch(error => { if (!cancelled) { setMessage(`Could not scan the set: ${error.message}`); setLoading(false); } });
    return () => { cancelled = true; controller.abort(); };
  }, []);
  useEffect(() => {
    const restoreFocus = previousFocus.current;
    onMenuDepth(true);
    root.current?.querySelector("button")?.focus();
    return () => { onMenuDepth(false); restoreFocus?.focus?.(); };
  }, [onMenuDepth]);
  const stateFor = row => bulkScaleRow(row, upp, scales, shapes, openKeys);
  const selectedRows = rows.filter(row => selected.has(row.key) && !stateFor(row).blocked);
  const warnings = selectedRows.filter(row => stateFor(row).warning).length;
  const toggle = key => setSelected(old => { const next = new Set(old); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const keys = e => {
    e.stopPropagation();
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    if (e.key === "Tab") {
      const nodes = [...root.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')];
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  };
  return <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: Z.modal + 1, background: "var(--scrim)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "5vh 16px", overflow: "auto" }}>
    <section ref={root} role="dialog" aria-modal="true" aria-labelledby="bulk-scale-title" className="panel" onKeyDown={keys} onClick={e => e.stopPropagation()}
      style={{ width: "min(850px, 100%)", padding: "var(--sp-5)", background: "var(--paper-bright)", color: "var(--ink)", border: "1px solid var(--ink-faint)", boxShadow: "var(--shadow-2)", fontFamily: "var(--f-body)" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 id="bulk-scale-title">Apply scale to sheets</h2><button type="button" onClick={onClose} aria-label="Close bulk scale">×</button>
      </header>
      <p>Choose one scale and apply it to selected unscaled sheets. Existing scales and calibrations are never overwritten.</p>
      <label>Scale to apply <select aria-label="Scale to apply" value={upp} onChange={e => { setUpp(Number(e.target.value)); setSelected(new Set()); }}>
        {initialUpp && !STANDARD_SCALES.some(s => Math.abs(s.upp - initialUpp) < 1e-9) && <option value={initialUpp}>Current sheet calibration</option>}
        {STANDARD_SCALES.map(s => <option key={s.label} value={s.upp}>{s.label}</option>)}
      </select></label>
      <p style={{ color: "var(--ink-muted)" }}>Mixed-scale details need individual verification. The printed-scale scan cannot prove every view uses the title-block scale.</p>
      <div style={{ display: "flex", gap: "var(--sp-3)", marginBlock: "var(--sp-3)" }}>
        <button type="button" disabled={loading} onClick={() => setSelected(new Set(rows.filter(row => { const state = stateFor(row); return !state.blocked && !state.warning; }).map(row => row.key)))}>Select matching sheets</button>
        <button type="button" disabled={loading} onClick={() => setSelected(new Set())}>Clear selection</button>
      </div>
      {message && <p role="status">{message}</p>}
      <div style={{ maxHeight: "45vh", overflow: "auto", borderBlock: "1px solid var(--ink-faint)" }}>
        {rows.map(row => { const state = stateFor(row); return <label key={row.key} style={{ display: "flex", gap: "var(--sp-3)", paddingBlock: "var(--sp-2)", opacity: state.blocked ? 0.65 : 1 }}>
          <input type="checkbox" disabled={state.blocked || loading} checked={selected.has(row.key) && !state.blocked} onChange={() => toggle(row.key)} aria-label={`Apply scale to ${row.label}`} />
          <span><strong>{row.label}</strong><br /><small style={{ color: state.warning ? "var(--c-warning)" : "var(--ink-muted)" }}>{state.reason}</small></span>
        </label>; })}
      </div>
      <p>{selectedRows.length} sheet(s) selected{warnings ? ` — ${warnings} need verification: selecting them explicitly applies the chosen scale despite the warning.` : ""}</p>
      <footer style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-3)" }}>
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="button" disabled={loading || !selectedRows.length} onClick={() => onApply(rows, selectedRows.map(row => row.key), upp)}>Apply to {selectedRows.length} sheet(s)</button>
      </footer>
    </section>
  </div>;
}
