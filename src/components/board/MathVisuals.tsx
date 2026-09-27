"use client";

import { createElement, memo, useId, useMemo, useState, type ReactNode } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { evaluateExpression, formatNumber, MATH_HELP, parseEquation, parseFunction, sampleFunction, type MathExpression } from "@/lib/math";
import { mathItemSchema, nextMathPosition, type MathItem } from "@/lib/math-items";
import { useWorkspace } from "./workspace-provider";
import styles from "./workspace.module.css";

const m = (tag: string, ...children: ReactNode[]) => createElement(tag, null, ...children);
function renderExpression(tree: MathExpression): ReactNode {
  const group = (value: MathExpression) => value.type === "binary" || value.type === "unary" ? m("mrow", m("mo", "("), renderExpression(value), m("mo", ")")) : renderExpression(value);
  switch (tree.type) {
    case "number": return m("mn", String(tree.value));
    case "symbol": return m("mi", tree.name === "pi" ? "π" : tree.name);
    case "unary": return m("mrow", m("mo", tree.sign === "-" ? "−" : "+"), group(tree.value));
    case "function": return tree.name === "sqrt" ? m("msqrt", renderExpression(tree.argument)) : m("mrow", m("mi", tree.name), m("mo", "("), renderExpression(tree.argument), m("mo", ")"));
    case "binary":
      if (tree.op === "/") return m("mfrac", renderExpression(tree.left), renderExpression(tree.right));
      if (tree.op === "^") return m("msup", group(tree.left), renderExpression(tree.right));
      return m("mrow", tree.op === "*" ? group(tree.left) : renderExpression(tree.left), m("mo", tree.op === "*" ? "·" : tree.op === "-" ? "−" : "+"), tree.op === "+" ? renderExpression(tree.right) : group(tree.right));
  }
}

export function MathFormula({ expression, graph = false }: { expression: string; graph?: boolean }) {
  try {
    const trees = graph ? [parseFunction(expression)] : parseEquation(expression);
    return <div className={styles.mathFormula}>{createElement("math", { xmlns: "http://www.w3.org/1998/Math/MathML", display: "block", "aria-label": expression },
      m("mrow", ...(graph ? [m("mi", "y"), m("mo", "=")] : []), ...trees.flatMap((tree, index) => index === 0 ? [renderExpression(tree)] : [m("mo", "="), renderExpression(tree)])),
    )}</div>;
  } catch { return null; }
}

export const FunctionPlot = memo(function FunctionPlot({ item }: { item: MathItem }) {
  const clipId = useId();
  const [probe, setProbe] = useState((item.xMin + item.xMax) / 2);
  const plot = useMemo(() => {
    try { return { data: sampleFunction(item.expression, item.xMin, item.xMax) }; }
    catch (error) { return { error: error instanceof Error ? error.message : "Cannot draw this function." }; }
  }, [item.expression, item.xMin, item.xMax]);
  if (!plot.data) return <p role="alert">{plot.error}</p>;
  const { points, tree, yMin, yMax, yTicks, zeros } = plot.data;
  const width = 360, height = 230, pad = 34;
  const px = (x: number) => pad + (x - item.xMin) / (item.xMax - item.xMin) * (width - 2 * pad);
  const py = (y: number) => height - pad - (y - yMin) / (yMax - yMin) * (height - 2 * pad);
  let path = "", previous: (typeof points)[number] | undefined;
  for (const point of points) {
    if (point.y === null || point.y < yMin || point.y > yMax) { previous = undefined; continue; }
    const middle = previous ? evaluateExpression(tree, (previous.x + point.x) / 2) : NaN;
    const connected = previous?.y !== null && previous !== undefined && Number.isFinite(middle)
      && Math.abs(point.y - previous.y) < (yMax - yMin) * 0.45
      && Math.abs(middle - (point.y + previous.y) / 2) < (yMax - yMin) * 0.2;
    path += `${connected ? "L" : "M"}${px(point.x).toFixed(2)},${py(point.y).toFixed(2)} `;
    previous = point;
  }
  const x = Math.min(item.xMax, Math.max(item.xMin, probe));
  const y = evaluateExpression(tree, x);
  return <div className="nodrag nopan nowheel">
    <svg viewBox={`0 0 ${width} ${height}`} className={styles.functionPlot} role="img" aria-label={`Graph of ${item.expression}, x from ${item.xMin} to ${item.xMax}. Approximate sampled plot; see values below.`}>
      <defs><clipPath id={clipId}><rect x={pad} y={pad} width={width - 2 * pad} height={height - 2 * pad} /></clipPath></defs>
      {[0, 1, 2, 3, 4].map(i => {
        const gx = item.xMin + (item.xMax - item.xMin) * i / 4;
        return <g key={i}><path d={`M${px(gx)},${pad}V${height - pad}`} stroke="#ddd5e5" /><text x={px(gx)} y={height - 13} textAnchor="middle">{formatNumber(gx)}</text></g>;
      })}
      {yTicks.map(gy => <g key={gy}><path d={`M${pad},${py(gy)}H${width - pad}`} stroke="#ddd5e5" /><text x={pad - 5} y={py(gy) + 4} textAnchor="end">{formatNumber(gy)}</text></g>)}
      <path d={`M${pad},${py(0)}H${width - pad}`} stroke="#4d3b60" />
      {item.xMin <= 0 && item.xMax >= 0 && <path d={`M${px(0)},${pad}V${height - pad}`} stroke="#4d3b60" />}
      <text x={width - 12} y={py(0) - 5}>x</text><text x={pad} y={19}>y</text>
      <path d={path} stroke="#714caf" strokeWidth="2.5" fill="none" clipPath={`url(#${clipId})`} />
      {zeros.map(zero => <circle key={zero} cx={px(zero)} cy={py(0)} r={3} fill="#fffdfa" stroke="#714caf" strokeWidth={2} />)}
      {Number.isFinite(y) && y >= yMin && y <= yMax && <circle cx={px(x)} cy={py(y)} r={4} fill="#b34c2e" />}
    </svg>
    <label htmlFor={clipId + "-x"}>Explore x</label>
    <input id={clipId + "-x"} type="range" min={item.xMin} max={item.xMax} step={(item.xMax - item.xMin) / 400} value={x} onChange={event => setProbe(Number(event.target.value))} />
    <output aria-live="polite">x = {formatNumber(x)} · y = {Number.isFinite(y) ? formatNumber(y) : "undefined"}</output>
    <p className={styles.mathNote}>Sampled zeros: {zeros.length ? zeros.map(formatNumber).join(", ") : "none detected"}. Approximate, not exhaustive.</p>
    <details><summary>Values and plot limits</summary>
      <p className={styles.mathNote}>401 samples; gaps and steep jumps are not joined. The y view clips extreme values. This is a numerical plot, not an algebra proof.</p>
      <table><caption>Sampled function values</caption><thead><tr><th scope="col">x</th><th scope="col">y</th></tr></thead><tbody>{[0, 1, 2, 3, 4].map(i => {
        const sx = item.xMin + (item.xMax - item.xMin) * i / 4, sy = evaluateExpression(tree, sx);
        return <tr key={i}><td>{formatNumber(sx)}</td><td>{Number.isFinite(sy) ? formatNumber(sy) : "undefined"}</td></tr>;
      })}</tbody></table>
    </details>
  </div>;
});

export function MathForm({ initial, onSaved }: { initial?: MathItem; onSaved?: () => void }) {
  const { workspace, runCommand } = useWorkspace();
  const prefix = useId();
  const [kind, setKind] = useState<MathItem["kind"]>(initial?.kind ?? "graph");
  const [expression, setExpression] = useState(initial?.expression ?? "");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  return <form className={styles.mathForm + " nodrag nopan nowheel"} onSubmit={event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const position = initial?.position ?? nextMathPosition(workspace);
    const parsed = mathItemSchema.safeParse({ id: initial?.id ?? crypto.randomUUID(), kind, expression, xMin: kind === "graph" ? Number(fields.get("xMin")) : -10, xMax: kind === "graph" ? Number(fields.get("xMax")) : 10, position });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check your expression."); setStatus(""); return; }
    const result = runCommand({ type: initial ? "edit-math" : "add-math", item: parsed.data });
    if (!result.ok) { setError(result.reason); setStatus(""); return; }
    setError(""); setStatus(initial ? "Visual updated." : "Added to the canvas. You can move it or undo it.");
    if (!initial) setExpression("");
    onSaved?.();
  }}>
    <label htmlFor={prefix + "-kind"}>Math visual</label>
    <select id={prefix + "-kind"} value={kind} onChange={event => { setKind(event.target.value as MathItem["kind"]); setError(""); }}><option value="graph">Function graph</option><option value="equation">Equation / working step</option></select>
    <label htmlFor={prefix + "-expression"}>{kind === "graph" ? "Function of x" : "Equation or expression"}</label>
    <input id={prefix + "-expression"} value={expression} onChange={event => { setExpression(event.target.value); setError(""); }} maxLength={240} required placeholder={kind === "graph" ? "y = x^2 - 4" : "2(x + 3) = 14"} aria-invalid={Boolean(error)} aria-describedby={prefix + "-help " + prefix + "-error"} />
    <MathFormula expression={expression} graph={kind === "graph"} />
    {kind === "graph" && <div className={styles.mathRange}>
      <label htmlFor={prefix + "-min"}>x minimum<input id={prefix + "-min"} name="xMin" type="number" min={-1000} max={1000} step="any" defaultValue={initial?.xMin ?? -10} required /></label>
      <label htmlFor={prefix + "-max"}>x maximum<input id={prefix + "-max"} name="xMax" type="number" min={-1000} max={1000} step="any" defaultValue={initial?.xMax ?? 10} required /></label>
    </div>}
    {initial && <details><summary>Position without dragging</summary><div className={styles.actions}>
      {[{ label: "← Left", x: -80, y: 0 }, { label: "Right →", x: 80, y: 0 }, { label: "↑ Up", x: 0, y: -80 }, { label: "Down ↓", x: 0, y: 80 }].map(direction => <button key={direction.label} type="button" onClick={() => runCommand({ type: "move-math", itemId: initial.id, position: { x: initial.position.x + direction.x, y: initial.position.y + direction.y } })}>{direction.label}</button>)}
    </div></details>}
    <p id={prefix + "-help"} className={styles.mathNote}>{MATH_HELP} {kind === "equation" ? "Equations may also use y. Displaying a step does not verify it." : "Graph one y = f(x) function at a time."}</p>
    <p id={prefix + "-error"} role="alert">{error}</p>
    <button type="submit">{initial ? "Update visual" : kind === "graph" ? "Plot on canvas" : "Add equation to canvas"}</button>
    <p role="status">{status}</p>
  </form>;
}

export type MathCanvasNode = Node<{ item: MathItem }, "math">;
export const MathVisualNode = memo(function MathVisualNode({ data }: NodeProps<MathCanvasNode>) {
  const { runCommand } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const item = data.item;
  return <article className={styles.mathCard}>
    <h3>{item.kind === "graph" ? "Function graph" : "Working step"}</h3>
    <MathFormula expression={item.expression} graph={item.kind === "graph"} />
    <p className={styles.mathSource}>{item.expression}</p>
    {item.kind === "graph" ? <FunctionPlot key={item.expression + item.xMin + ":" + item.xMax} item={item} /> : <p className={styles.mathNote}>Your equation, formatted. Correctness is not checked.</p>}
    <div className={styles.actions + " nodrag nopan"}>
      <button type="button" aria-expanded={editing} onClick={() => setEditing(!editing)}>Edit visual</button>
      <button type="button" aria-label={`Remove ${item.expression}`} onClick={() => runCommand({ type: "remove-math", itemId: item.id })}>Remove</button>
    </div>
    {editing && <MathForm key={item.expression + item.xMin + ":" + item.xMax} initial={item} onSaved={() => setEditing(false)} />}
  </article>;
});

export function MathTools() {
  const { workspace, runCommand } = useWorkspace();
  return <section aria-label="Math tools">
    <h2>Equations & graphs</h2>
    <p className={styles.mathNote}>Put a problem on the canvas, then work through it with Pip.</p>
    <MathForm />
    {(workspace.mathItems ?? []).map(item => <details key={item.id}><summary>{item.kind === "graph" ? "Graph" : "Equation"}: {item.expression}</summary>
      <MathForm key={item.expression + item.xMin + ":" + item.xMax} initial={item} />
      <button type="button" onClick={() => runCommand({ type: "remove-math", itemId: item.id })}>Remove visual</button>
    </details>)}
  </section>;
}
