require("./register-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { emptyWorkspace, demoPipResponse } = require("../src/lib/fixtures.ts");
const { applyWorkspaceCommand, workspaceHistoryReducer } = require("../src/lib/workspace-reducer.ts");
const { pipTurnResponseForRequestSchema } = require("../src/lib/schemas.ts");
const { parseVoiceActions, voiceWorkspaceContext, pipVoiceTools } = require("../src/lib/pip-voice-tools.ts");
const { loadWorkspace, saveWorkspace } = require("../src/lib/storage.ts");

const initial = () => structuredClone(emptyWorkspace);
const batch = (workspace, actions, batchId = randomUUID()) => ({ type: "apply-pip-actions", batch: { batchId, basedOnRevision: workspace.revision, actions, resourceIds: actions.map(() => randomUUID()) } });
const apply = (workspace, actions) => {
  const result = applyWorkspaceCommand(workspace, batch(workspace, actions));
  assert.equal(result.ok, true, result.reason);
  return result.workspace;
};

test("Pip goal, capture, edit, connection, selection and completion share manual commands", () => {
  let workspace = { ...initial(), notebookText: "2x + 3 = 11" };
  workspace = apply(workspace, [{ type: "set_goal", text: "Learn equations" }, { type: "add_idea", text: "Balance both sides" }, { type: "add_step", text: "Subtract three" }]);
  const [idea, step] = workspace.cards;
  assert.equal(workspace.revision, 1, "a batch commits once");
  assert.equal(workspace.coins, 1);
  assert.equal(workspace.assignment, "Learn equations");
  workspace = apply(workspace, [{ type: "edit_card", cardId: idea.id, text: "Keep both sides balanced" }, { type: "connect_cards", fromCardId: idea.id, toCardId: step.id }, { type: "complete_step", cardId: step.id }, { type: "highlight_cards", cardIds: [idea.id, step.id] }]);
  assert.equal(workspace.cards[0].text, "Keep both sides balanced");
  assert.equal(workspace.cards[1].status, "done");
  assert.equal(workspace.coins, 4);
  assert.equal(workspace.connections.length, 1);
  assert.equal(workspace.notebookText, "2x + 3 = 11");
  assert.deepEqual(workspace.selectedCardIds, [idea.id, step.id]);
});

test("invalid later action rolls the entire batch back, including coins", () => {
  const workspace = initial();
  const result = applyWorkspaceCommand(workspace, batch(workspace, [{ type: "add_idea", text: "Valid first idea" }, { type: "edit_card", cardId: "missing", text: "Invalid target" }]));
  assert.equal(result.ok, false);
  assert.equal(result.workspace, workspace);
});

test("stale and malformed commands cannot mutate the board or write the draft", () => {
  const workspace = initial();
  for (const actions of [[{ type: "clear-canvas" }], [{ type: "add_idea", text: "x", coins: 999 }], [{ type: "update-notebook", text: "Replace work" }], [{ type: "add_idea", text: " " }]]) {
    assert.equal(applyWorkspaceCommand(workspace, batch(workspace, actions)).ok, false);
  }
  const stale = batch(workspace, [{ type: "add_idea", text: "Old idea" }]);
  assert.equal(applyWorkspaceCommand({ ...workspace, revision: 1 }, stale).ok, false);
  assert.equal(applyWorkspaceCommand(workspace, batch(workspace, [{ type: "highlight_cards", cardIds: ["missing"] }])).ok, false);
});

test("replayed voice delivery stays a no-op after undo and save/reload", () => {
  let history = { workspace: initial(), past: [] };
  const command = batch(history.workspace, [{ type: "add_idea", text: "Review one example" }], "voice:session:stable-call");
  history = workspaceHistoryReducer(history, { type: "execute", command });
  assert.equal(history.past.length, 1);
  const repeated = workspaceHistoryReducer(history, { type: "execute", command });
  assert.equal(repeated, history, "duplicates must not create Undo entries");
  history = workspaceHistoryReducer(history, { type: "undo" });
  assert.equal(history.workspace.cards.length, 0);
  assert.equal(history.workspace.coins, 1);
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  assert(saveWorkspace(history.workspace, storage).ok);
  const loaded = loadWorkspace(storage).workspace;
  const replay = applyWorkspaceCommand(loaded, command);
  assert.equal(replay.workspace, loaded);
  assert.equal(replay.workspace.cards.length, 0);
  assert.equal(replay.workspace.coins, 1);
});

test("voice envelopes accept object/string arguments and reject unknown/malformed tools", () => {
  const input = { basedOnRevision: 0, actions: [{ type: "add_idea", text: "Use a timer" }] };
  const event = args => ({ type: "tool-calls", toolCallList: [{ id: "call-1", function: { name: "update_workspace", arguments: args } }] });
  for (const args of [input, JSON.stringify(input)]) {
    const parsed = parseVoiceActions(event(args), "session", randomUUID);
    assert.equal(parsed.kind, "calls");
    const result = applyWorkspaceCommand(initial(), { type: "apply-pip-actions", batch: parsed.calls[0].batch });
    assert.equal(result.ok, true);
    assert.equal(result.workspace.cards[0].text, "Use a timer");
    assert.equal(result.workspace.processedPipActionIds[0], "voice:session:call-1");
  }
  assert.equal(parseVoiceActions({ type: "transcript" }, "session", randomUUID).kind, "ignored");
  assert.equal(parseVoiceActions({ type: "tool-calls" }, "session", randomUUID).kind, "invalid");
  assert.match(parseVoiceActions(event("{"), "session", randomUUID).calls[0].reason, /invalid/);
  const unknown = event(input); unknown.toolCallList[0].function.name = "buy_item";
  assert.match(parseVoiceActions(unknown, "session", randomUUID).calls[0].reason, /not available/);
  assert.equal(pipVoiceTools[0].async, true);
  assert.equal(pipVoiceTools[0].server, undefined);
});

test("typed replies apply atomically and reject invalid references before committing conversation", () => {
  const workspace = initial();
  const request = { requestId: "typed-turn", revision: 0, workspace, userText: "Capture a short study session" };
  const response = { ...demoPipResponse, requestId: request.requestId, basedOnRevision: 0, highlightedCardIds: [], suggestedCards: [], suggestedRequirements: [], suggestedNextStep: null, proposedActions: [], actions: [{ type: "add_idea", text: "Study for ten minutes" }] };
  assert(pipTurnResponseForRequestSchema(request).safeParse(response).success);
  const result = applyWorkspaceCommand(workspace, { type: "apply-pip-turn", userText: request.userText, response, resourceIds: ["new-card"] });
  assert.equal(result.ok, true);
  assert.equal(result.workspace.cards[0].id, "new-card");
  assert.equal(result.workspace.coins, 1);
  assert.equal(result.workspace.conversation.length, 2);
  const invalid = { ...response, actions: [{ type: "edit_card", cardId: "missing", text: "No" }] };
  assert.equal(pipTurnResponseForRequestSchema(request).safeParse(invalid).success, false);
  const rejected = applyWorkspaceCommand(workspace, { type: "apply-pip-turn", userText: request.userText, response: invalid, resourceIds: ["unused"] });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.workspace, workspace);
});

test("freshly committed context supports a sequential edit without another render", () => {
  let workspace = apply(initial(), [{ type: "add_idea", text: "Start small" }]);
  const context = JSON.parse(voiceWorkspaceContext(workspace).split("\nWORKSPACE_DATA\n")[1]);
  assert.equal(context.revision, workspace.revision);
  assert.equal(context.cards[0].kind, "idea");
  const command = batch(workspace, [{ type: "edit_card", cardId: context.cards[0].id, text: "Start with five minutes" }]);
  workspace = applyWorkspaceCommand(workspace, command).workspace;
  assert.equal(workspace.cards[0].text, "Start with five minutes");
  assert.equal(workspace.coins, 1);
});

test("full action ledger fails closed instead of evicting replay protection", () => {
  const workspace = { ...initial(), processedPipActionIds: Array.from({ length: 2000 }, (_, i) => `call-${i}`) };
  const result = applyWorkspaceCommand(workspace, batch(workspace, [{ type: "add_idea", text: "At capacity" }]));
  assert.equal(result.ok, false);
  assert.equal(result.workspace, workspace);
});

test("undo then a new completion call never awards the same step twice", () => {
  let history = { workspace: apply(initial(), [{ type: "add_step", text: "Work through one problem" }]), past: [] };
  const cardId = history.workspace.cards[0].id;
  history = workspaceHistoryReducer(history, { type: "execute", command: batch(history.workspace, [{ type: "complete_step", cardId }]) });
  assert.equal(history.workspace.coins, 3);
  history = workspaceHistoryReducer(history, { type: "undo" });
  assert.equal(history.workspace.cards[0].status, "active");
  history = workspaceHistoryReducer(history, { type: "execute", command: batch(history.workspace, [{ type: "complete_step", cardId }]) });
  assert.equal(history.workspace.cards[0].status, "done");
  assert.equal(history.workspace.coins, 3);
});

test("typed goal changes do not restore the previous goal's checklist", () => {
  const workspace = { ...initial(), assignment: "Old goal", requirements: [{ id: "old", text: "Old requirement", checked: false }], pending: { ...initial().pending, requirements: [{ suggestionId: "pending-old", text: "Old suggestion" }] } };
  const response = { ...demoPipResponse, requestId: "new-goal", basedOnRevision: 0, highlightedCardIds: [], suggestedCards: [], suggestedRequirements: [], suggestedNextStep: null, proposedActions: [], actions: [{ type: "set_goal", text: "Study algebra" }] };
  const result = applyWorkspaceCommand(workspace, { type: "apply-pip-turn", userText: "Change my goal to study algebra", response, resourceIds: ["unused-id"] });
  assert.equal(result.ok, true);
  assert.equal(result.workspace.assignment, "Study algebra");
  assert.deepEqual(result.workspace.requirements, []);
  assert.deepEqual(result.workspace.pending.requirements, []);
});
