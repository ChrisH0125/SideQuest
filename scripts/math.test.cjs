require("./register-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { parseExpression, parseEquation, parseFunction, evaluateExpression, sampleFunction } = require("../src/lib/math.ts");
const { mathContext } = require("../src/lib/math-items.ts");
const { emptyWorkspace, demoPipResponse } = require("../src/lib/fixtures.ts");
const { workspaceStateSchema, pipTurnResponseForRequestSchema } = require("../src/lib/schemas.ts");
const { applyWorkspaceCommand, workspaceHistoryReducer } = require("../src/lib/workspace-reducer.ts");
const { parseVoiceActions } = require("../src/lib/pip-voice-tools.ts");
const { loadWorkspace, saveWorkspace } = require("../src/lib/storage.ts");
const { notebookExport } = require("../src/lib/export.ts");

const value = (source, x = 0) => evaluateExpression(parseExpression(source), x);
const graph = (expression = "x^2 - 4") => ({ id: "graph-1", kind: "graph", expression, xMin: -10, xMax: 10, position: { x: 40, y: 40 } });
const fresh = () => ({ ...structuredClone(emptyWorkspace), notebookText: "My own working stays here." });

test("math parser respects precedence, powers, unary signs and implicit multiplication", () => {
  assert.equal(value("2 + 3 * 4"), 14);
  assert.equal(value("-x^2", 3), -9);
  assert.equal(value("(-x)^2", 3), 9);
  assert.equal(value("2^3^2"), 512);
  assert.equal(value("2^-2"), 0.25);
  assert.equal(value("2(x+3)", 4), 14);
  assert.equal(value("(x+1)(x-1)", 3), 8);
  assert.equal(value("2x + .5", 2), 4.5);
  assert.equal(value("1e-3 * x", 1000), 1);
  assert.equal(value("x² − 4", 2), 0);
});

test("functions use real local arithmetic and radians", () => {
  assert(Math.abs(value("sin(pi/2)") - 1) < 1e-12);
  assert(Math.abs(value("ln(e)") - 1) < 1e-12);
  assert.equal(value("sqrt(9)+abs(-2)+log(100)"), 7);
  assert(Number.isNaN(value("1 / 0")));
  assert(Number.isNaN(value("sqrt(-1)")));
  assert.equal(evaluateExpression(parseFunction("y = x^2 - 4"), 2), 0);
  assert.equal(evaluateExpression(parseFunction("f(x) = x + 1"), 2), 3);
  assert.equal(parseEquation("2x + 6 = 14").length, 2);
  assert.equal(parseEquation("y = x^2").length, 2);
});

test("arbitrary code, unknown names, malformed and unbounded expressions are rejected", () => {
  for (const source of ["alert(1)", "constructor(1)", "Math.sin(x)", "x; process.exit()", "<script>", "x[0]", "x=2", "x+", "2 3", "(x", "sin x", "Infinity", "1e999", "y", "(".repeat(30) + "x" + ")".repeat(30), "1+".repeat(130) + "1"]) {
    assert.throws(() => parseExpression(source), undefined, source);
  }
  assert.throws(() => parseEquation("x = 1 = 2"));
});

test("sampled quadratic zeros are correct and singularities do not become roots", () => {
  const quadratic = sampleFunction("x^2 - 4", -5, 5);
  assert.equal(quadratic.points.length, 401);
  assert.deepEqual(quadratic.zeros, [-2, 2]);
  assert.equal(quadratic.points[200].y, -4);
  for (const expression of ["1/x", "1/(x-0.013)", "1e-20/(x-0.013)"]) {
    assert.equal(sampleFunction(expression, -5, 5).zeros.length, 0, expression);
  }
  assert.equal(sampleFunction("1/x", -5, 5).points[200].y, null);
  assert.throws(() => sampleFunction("sqrt(x)", -5, -1), /No plottable/);
  for (const bounds of [[1, 1], [2, 1], [-1001, 5], [-5, 1001], [0, 0.01], [NaN, 5]]) assert.throws(() => sampleFunction("x", ...bounds));
});

test("visuals use validated commands, can move/edit/remove/undo, and preserve writing", () => {
  let history = { workspace: fresh(), past: [] };
  const run = command => { history = workspaceHistoryReducer(history, { type: "execute", command }); };
  run({ type: "add-math", item: graph() });
  assert.equal(history.workspace.mathItems.length, 1);
  assert.equal(history.workspace.coins, 0, "plotting does not invent a reward");
  run({ type: "move-math", itemId: "graph-1", position: { x: 500, y: 40 } });
  assert.equal(history.workspace.mathItems[0].position.x, 500);
  run({ type: "edit-math", item: { ...history.workspace.mathItems[0], expression: "sin(x)" } });
  assert.equal(history.workspace.mathItems[0].expression, "sin(x)");
  run({ type: "remove-math", itemId: "graph-1" });
  assert.equal(history.workspace.mathItems.length, 0);
  history = workspaceHistoryReducer(history, { type: "undo" });
  assert.equal(history.workspace.mathItems[0].expression, "sin(x)");
  run({ type: "clear-canvas" });
  assert.equal(history.workspace.mathItems.length, 0);
  history = workspaceHistoryReducer(history, { type: "undo" });
  assert.equal(history.workspace.mathItems.length, 1);
  assert.equal(history.workspace.notebookText, fresh().notebookText);
});

test("legacy saves still load and new math survives save/export without storing executable data", () => {
  assert(workspaceStateSchema.safeParse(emptyWorkspace).success);
  const workspace = applyWorkspaceCommand(fresh(), { type: "add-math", item: graph() }).workspace;
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  assert(saveWorkspace(workspace, storage).ok);
  assert.deepEqual(loadWorkspace(storage).workspace, workspace);
  assert.match(notebookExport(workspace).text, /Graph: x\^2 - 4/);
  assert.deepEqual(mathContext(workspace.mathItems)[0].sampledZeros, [-2, 2]);
  assert.equal(applyWorkspaceCommand(workspace, { type: "add-math", item: graph() }).ok, false);
  assert.equal(applyWorkspaceCommand(workspace, { type: "edit-math", item: graph("eval(x)") }).ok, false);
  assert.equal(applyWorkspaceCommand(workspace, { type: "edit-math", item: graph("sqrt(-1)") }).ok, false);
  const full = { ...fresh(), mathItems: Array.from({ length: 12 }, (_, i) => ({ ...graph(), id: `g-${i}` })) };
  assert.equal(applyWorkspaceCommand(full, { type: "add-math", item: graph() }).ok, false);
});

test("typed and voice graph actions are atomic and deduplicated like card actions", () => {
  const workspace = fresh();
  const actions = [{ type: "plot_function", expression: "x^2 - 4", xMin: -5, xMax: 5 }, { type: "show_equation", expression: "x^2 - 4 = 0" }];
  const voice = parseVoiceActions({ type: "tool-calls", toolCallList: [{ id: "graph-call", function: { name: "update_workspace", arguments: JSON.stringify({ basedOnRevision: workspace.revision, actions }) } }] }, "session", randomUUID);
  const command = { type: "apply-pip-actions", batch: voice.calls[0].batch };
  const applied = applyWorkspaceCommand(workspace, command);
  assert.equal(applied.ok, true);
  assert.equal(applied.workspace.mathItems.length, 2);
  assert.equal(applyWorkspaceCommand(applied.workspace, command).workspace, applied.workspace);
  const invalid = { ...command, batch: { ...command.batch, actions: [...actions.slice(0, 1), { type: "show_equation", expression: "bad(x)" }] } };
  assert.equal(applyWorkspaceCommand(workspace, invalid).workspace, workspace);
  const request = { requestId: "math-turn", revision: workspace.revision, workspace, userText: "Graph x squared minus four" };
  const response = { ...demoPipResponse, requestId: request.requestId, basedOnRevision: request.revision, highlightedCardIds: [], suggestedCards: [], suggestedRequirements: [], proposedActions: [], suggestedNextStep: null, actions };
  assert(pipTurnResponseForRequestSchema(request).safeParse(response).success);
  const typed = applyWorkspaceCommand(workspace, { type: "apply-pip-turn", userText: request.userText, response, resourceIds: actions.map(() => randomUUID()) });
  assert.equal(typed.ok, true);
  assert.equal(typed.workspace.mathItems.length, 2);
});
