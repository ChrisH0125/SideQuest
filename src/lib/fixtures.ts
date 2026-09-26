// Mock data from the demo story, so teammates can build UI before Gemini works.
// These are fake examples, not real AI output.
import type { PipTurnRequest, PipTurnResponse, WorkspaceState } from "./contracts";

export const demoWorkspace: WorkspaceState = {
  projectId: "demo-neighborhood-essay",
  title: "Persuasive essay: improving my neighborhood",
  assignment:
    "Write a persuasive essay about improving your neighborhood. Include two examples and a counterargument.",
  requirements: [
    { id: "req-persuasive", text: "Argue for one improvement", checked: false },
    { id: "req-examples", text: "Include two examples", checked: false },
    { id: "req-counter", text: "Address a counterargument", checked: false },
  ],
  cards: [
    {
      id: "card-gardens",
      text: "Community gardens",
      kind: "idea",
      position: { x: 0, y: 0 },
      status: "active",
      sourceUtterance: "Maybe community gardens.",
    },
    {
      id: "card-grandma",
      text: "Grandma trades vegetables with her neighbor",
      kind: "idea",
      position: { x: 240, y: 80 },
      status: "active",
      sourceUtterance: "My grandma trades vegetables with her neighbor.",
    },
  ],
  connections: [{ id: "conn-gardens-grandma", fromCardId: "card-gardens", toCardId: "card-grandma" }],
  outlineOrder: ["card-gardens", "card-grandma"],
  selectedCardIds: ["card-grandma"],
  currentStepId: null,
  notebookText: "",
  conversation: [
    { role: "user", text: "Maybe community gardens. My grandma trades vegetables with her neighbor." },
  ],
  revision: 3,
  coins: 2,
  rewardEventIds: ["idea-accepted:card-gardens", "idea-accepted:card-grandma"],
  ownedDecorations: [],
  pending: {
    requirements: [{ suggestionId: "sugg-req-audience", text: "Write for your neighbors as the audience" }],
    cards: [{ suggestionId: "sugg-card-cost", text: "Gardens are cheap to start", kind: "idea" }],
    nextStep: null,
  },
};

export const demoPipRequest: PipTurnRequest = {
  requestId: "req-demo-1",
  revision: demoWorkspace.revision,
  workspace: demoWorkspace,
  userText: "How does this fit?",
};

export const demoPipResponse: PipTurnResponse = {
  requestId: "req-demo-1",
  basedOnRevision: demoWorkspace.revision,
  replyText: "This could be one of your two examples. Did they know each other before?",
  highlightedCardIds: ["card-grandma", "card-gardens"],
  suggestedRequirements: [],
  suggestedCards: [],
  suggestedNextStep: null,
  proposedActions: [{ type: "highlight", cardIds: ["card-grandma", "card-gardens"] }],
};
