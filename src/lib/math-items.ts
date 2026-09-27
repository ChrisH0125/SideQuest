import { z } from "zod";
import { parseEquation, parseFunction, sampleFunction } from "./math";
import type { WorkspaceState } from "./contracts";

export const mathItemSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(["equation", "graph"]),
  expression: z.string().trim().min(1).max(240),
  xMin: z.number().min(-1000).max(1000),
  xMax: z.number().min(-1000).max(1000),
  position: z.object({ x: z.number(), y: z.number() }),
}).superRefine((item, ctx) => {
  try {
    if (item.kind === "graph") {
      parseFunction(item.expression);
      if (item.xMax - item.xMin < 0.1) throw new Error("Choose an x range at least 0.1 wide.");
    }
    else parseEquation(item.expression);
  } catch (error) {
    ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Invalid math expression.", path: ["expression"] });
  }
});
export type MathItem = z.infer<typeof mathItemSchema>;

export function nextMathPosition(workspace: WorkspaceState) {
  const bottom = Math.max(0, ...workspace.cards.map(card => card.position.y + 180), ...(workspace.mathItems ?? []).map(item => item.position.y + (item.kind === "graph" ? 700 : 260)));
  return { x: 40, y: bottom + 40 };
}

export function nextIdeaPosition(workspace: WorkspaceState) {
  let slot = 0;
  while (slot < 1000) {
    const x = 40 + (slot % 3) * 280, y = 40 + Math.floor(slot / 3) * 180;
    const overlapsCard = workspace.cards.some(card => Math.abs(card.position.x - x) < 250 && Math.abs(card.position.y - y) < 150);
    const overlapsMath = workspace.mathItems?.some(item => x < item.position.x + 460 && x + 250 > item.position.x && y < item.position.y + (item.kind === "graph" ? 700 : 260) && y + 150 > item.position.y);
    if (!overlapsCard && !overlapsMath) return { x, y };
    slot++;
  }
  return nextMathPosition(workspace);
}

export function mathContext(items: MathItem[] = []) {
  return items.map(({ id, kind, expression, xMin, xMax }) => {
    const base = { id, kind, expression, xMin, xMax };
    if (kind !== "graph") return base;
    try { return { ...base, sampledZeros: sampleFunction(expression, xMin, xMax).zeros, note: "Numerically sampled zeros, not exhaustive or an algebra proof." }; }
    catch { return { ...base, plotError: "No plottable real values in this range." }; }
  });
}
