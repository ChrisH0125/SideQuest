// Run with node scripts/check-workspace.cjs. Compile TS in memory; no build artifacts.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(source, filename);
};
const { demoWorkspace, demoPipResponse } = require("../src/lib/fixtures.ts");
const { applyWorkspaceCommand, workspaceHistoryReducer } = require("../src/lib/workspace-reducer.ts");
const { pipTurnResponseForRequestSchema, workspaceStateSchema } = require("../src/lib/schemas.ts");
const { saveWorkspace, loadWorkspace, STORAGE_KEY, BROKEN_SAVE_KEY } = require("../src/lib/storage.ts");
const initial = () => ({ workspace: structuredClone(demoWorkspace), past: [] });
const execute = (state, command) => workspaceHistoryReducer(state, { type: "execute", command });

let state = execute(initial(), { type: "edit-card", cardId: "card-grandma", text: "Edited example" });
state = execute(state, { type: "update-notebook", text: "New writing after a board change" });
const conversation = [...state.workspace.conversation, { role: "pip", text: "A newer reply" }];
state.workspace = { ...state.workspace, conversation };
state = workspaceHistoryReducer(state, { type: "undo" });
assert.equal(state.workspace.cards[1].text, demoWorkspace.cards[1].text);
assert.equal(state.workspace.notebookText, "New writing after a board change");
assert.deepEqual(state.workspace.conversation, conversation);

const accept = { type: "accept-card", suggestionId: "sugg-card-cost", cardId: "ignored-caller-id", position: { x: 0, y: 0 } };
state = execute(initial(), accept);
assert.equal(state.workspace.coins, demoWorkspace.coins + 1);
state = workspaceHistoryReducer(state, { type: "undo" });
state = execute(state, accept);
assert.equal(state.workspace.coins, demoWorkspace.coins + 1, "undo/reaccept must not pay twice");
assert.equal(state.workspace.cards.at(-1).id, "sugg-card-cost");

const longIdA = "a".repeat(63) + "x", longIdB = "a".repeat(63) + "y";
state = initial();
state.workspace.pending.cards = [longIdA, longIdB].map(suggestionId => ({ suggestionId, text: "Different identities", kind: "idea" }));
for (const suggestionId of [longIdA, longIdB]) state = execute(state, { ...accept, suggestionId });
assert.equal(state.workspace.cards.length, 4, "full-length IDs must not collide");
assert(workspaceStateSchema.safeParse(state.workspace).success);

state = initial();
state.workspace.cards = Array.from({ length: 100 }, (_, i) => ({ id: "card-" + i, kind: "idea", text: "Idea", position: { x: i, y: 0 }, status: "active" }));
state.workspace.selectedCardIds = []; state.workspace.outlineOrder = []; state.workspace.connections = [];
assert.equal(applyWorkspaceCommand(state.workspace, { type: "add-card", card: { ...state.workspace.cards[0], id: "overflow" } }).ok, false);
assert.equal(applyWorkspaceCommand(state.workspace, accept).ok, false);
state = initial();
state.workspace.requirements = Array.from({ length: 20 }, (_, i) => ({ id: "req-" + i, text: "Requirement", checked: false }));
assert.equal(applyWorkspaceCommand(state.workspace, { type: "accept-requirement", suggestionId: "sugg-req-audience", requirementId: "overflow" }).ok, false);
assert.equal(applyWorkspaceCommand(demoWorkspace, { type: "move-card", cardId: "card-grandma", position: { x: NaN, y: 0 } }).ok, false);

assert.equal(applyWorkspaceCommand(demoWorkspace, { type: "apply-pip-turn", userText: "Test", response: { ...demoPipResponse, basedOnRevision: 0 } }).ok, false);
const request = { requestId: demoPipResponse.requestId, revision: demoWorkspace.revision, workspace: demoWorkspace, userText: "Test" };
assert(pipTurnResponseForRequestSchema(request).safeParse(demoPipResponse).success);
assert.equal(pipTurnResponseForRequestSchema(request).safeParse({ ...demoPipResponse, requestId: "wrong-request" }).success, false);
assert.equal(pipTurnResponseForRequestSchema(request).safeParse({ ...demoPipResponse, highlightedCardIds: ["missing"] }).success, false);

const data = new Map();
const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
assert(saveWorkspace(demoWorkspace, storage).ok);
assert.deepEqual(loadWorkspace(storage).workspace, demoWorkspace);
assert.equal(saveWorkspace(demoWorkspace, { setItem() { throw new Error("quota"); } }).ok, false);
storage.setItem(STORAGE_KEY, "unreadable draft");
assert.equal(loadWorkspace(storage).status, "unreadable");
assert.equal(storage.getItem(BROKEN_SAVE_KEY), "unreadable draft");
console.log("PASS: undo/draft, reward replay, full-length IDs, schema caps, invalid positions, stale and mismatched responses, storage round-trip and recovery.");
