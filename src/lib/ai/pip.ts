// MOCK Pip adapter. The AI teammate owns this folder and will replace the body
// of getPipReply with a real Gemini call. Keep the function name and signature
// so the /api/pip/turn route does not need to change.
import type { PipTurnRequest } from "../contracts";

// Returns unknown on purpose: model output is untrusted until the route validates it.
export async function getPipReply(request: PipTurnRequest): Promise<unknown> {
  const { workspace } = request;
  const selectedCards = workspace.cards.filter(({ id }) => workspace.selectedCardIds.includes(id));

  return {
    requestId: request.requestId,
    basedOnRevision: request.revision,
    replyText:
      selectedCards.length > 0
        ? `(Mock Pip) What made you pick "${selectedCards[0].text}"?`
        : "(Mock Pip) Which idea feels easiest to start with?",
    highlightedCardIds: selectedCards.slice(0, 10).map(({ id }) => id),
    suggestedRequirements: [],
    suggestedCards: [],
    suggestedNextStep: null,
    proposedActions: [],
  };
}
