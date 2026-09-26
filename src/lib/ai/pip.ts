// Real Pip adapter: asks Gemini for one coaching turn.
// Keep the function name and signature so the /api/pip/turn route does not need to change.
import { GoogleGenAI } from "@google/genai";
import type { PipTurnRequest } from "../contracts";

type ModelOutput = {
  replyText?: string;
  highlightedCardIds?: string[];
  suggestedCards?: { text?: string; kind?: string }[];
  suggestedNextStep?: string | null;
};

function buildPrompt(request: PipTurnRequest): string {
  const { workspace, userText } = request;
  const board = {
    assignment: workspace.assignment,
    requirements: workspace.requirements.map(({ id, text, checked }) => ({ id, text, checked })),
    cards: workspace.cards.map(({ id, text, kind, status }) => ({ id, text, kind, status })),
    selectedCardIds: workspace.selectedCardIds,
    draft: workspace.notebookText.slice(-2000),
    recentConversation: workspace.conversation.slice(-8),
  };

  return `You are Pip, a cozy pixel cat who coaches students through writing assignments.
Rules:
- Ask at most one question. Suggest at most one small next step.
- Never write the essay or full sentences of it for the student.
- Connect ideas to the assignment requirements when it helps.
- If the student says they are ready to write, stop asking questions and just encourage them.
- Keep replyText to 1-2 short, warm sentences.
- Only use card ids that appear in the workspace below.

Workspace:
${JSON.stringify(board, null, 2)}

Student says: "${userText}"

Reply ONLY with JSON in this shape:
{"replyText": string, "highlightedCardIds": string[], "suggestedCards": [{"text": string, "kind": "idea" | "step"}], "suggestedNextStep": string | null}`;
}

// Returns unknown on purpose: model output is untrusted until the route validates it.
export async function getPipReply(request: PipTurnRequest): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_TEXT_MODEL;
  if (!apiKey || !model) {
    throw new Error("Gemini is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: buildPrompt(request),
    config: { responseMimeType: "application/json" },
  });

  const output = JSON.parse(response.text ?? "") as ModelOutput;
  const idBase = request.requestId.slice(0, 50);
  const cardIds = new Set(request.workspace.cards.map(({ id }) => id));
  const highlighted = [...new Set(output.highlightedCardIds ?? [])]
    .filter((id) => cardIds.has(id))
    .slice(0, 10);

  return {
    requestId: request.requestId,
    basedOnRevision: request.revision,
    replyText: String(output.replyText ?? "").slice(0, 1000),
    highlightedCardIds: highlighted,
    suggestedRequirements: [],
    suggestedCards: (output.suggestedCards ?? []).slice(0, 5).map((card, index) => ({
      suggestionId: `${idBase}-card-${index}`,
      text: String(card.text ?? "").slice(0, 500),
      kind: card.kind === "step" ? "step" : "idea",
    })),
    suggestedNextStep: output.suggestedNextStep
      ? { suggestionId: `${idBase}-next`, text: String(output.suggestedNextStep).slice(0, 200) }
      : null,
    proposedActions: highlighted.length > 0 ? [{ type: "highlight", cardIds: highlighted }] : [],
  };
}
