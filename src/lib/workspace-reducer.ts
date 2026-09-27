import type { Card, PipTurnResponse, ProposedAction, WorkspaceState } from "./contracts";
import { buyDecoration, rewardIdeaAccepted, rewardStepCompleted, type DecorationId } from "./rewards";
import { workspaceStateSchema, pipTurnResponseSchema } from "./schemas";
import { commandFromPipAction, pipActionBatchSchema, referencedCardIds, type PipActionBatch } from "./pip-actions";
import { mathItemSchema, type MathItem } from "./math-items";
import { sampleFunction } from "./math";

export type WorkspaceCommand =
  | { type: "add-math"; item: MathItem }
  | { type: "edit-math"; item: MathItem }
  | { type: "move-math"; itemId: string; position: MathItem["position"] }
  | { type: "remove-math"; itemId: string }
  | { type: "update-assignment"; text: string }
  | { type: "check-requirement"; requirementId: string; checked: boolean }
  | { type: "add-card"; card: Card }
  | { type: "clear-canvas" }
  | { type: "complete-step"; cardId: string }
  | { type: "edit-card"; cardId: string; text: string }
  | { type: "select-cards"; cardIds: string[] }
  | { type: "move-card"; cardId: string; position: Card["position"] }
  | { type: "move-aside"; cardId: string }
  | { type: "connect"; connectionId: string; fromCardId: string; toCardId: string }
  | { type: "update-notebook"; text: string }
  | { type: "accept-requirement"; suggestionId: string; requirementId: string }
  | { type: "dismiss-requirement"; suggestionId: string }
  | { type: "accept-card"; suggestionId: string; cardId: string; position: Card["position"] }
  | { type: "dismiss-card"; suggestionId: string }
  | { type: "apply-pip-turn"; userText: string; response: PipTurnResponse; resourceIds?: string[] }
  | { type: "apply-pip-actions"; batch: PipActionBatch }
  | { type: "buy-decoration"; decorationId: DecorationId };

export type WorkspaceHistory = {
  workspace: WorkspaceState;
  past: WorkspaceState[];
};

export type WorkspaceHistoryAction =
  | { type: "execute"; command: WorkspaceCommand }
  | { type: "undo" }
  | { type: "hydrate"; workspace: WorkspaceState };

export type CommandResult =
  | { ok: true; workspace: WorkspaceState }
  | { ok: false; workspace: WorkspaceState; reason: string };

const HISTORY_LIMIT = 30;

function unchanged(workspace: WorkspaceState, reason: string): CommandResult {
  return { ok: false, workspace, reason };
}

function accepted(workspace: WorkspaceState, changes: Partial<WorkspaceState>): CommandResult {
  const candidate = { ...workspace, ...changes, revision: workspace.revision + 1 };
  if (!workspaceStateSchema.safeParse(candidate).success) {
    return unchanged(workspace, "This change exceeds a workspace limit or contains invalid data. Nothing changed.");
  }
  return {
    ok: true,
    workspace: candidate,
  };
}

export function applyWorkspaceCommand(
  workspace: WorkspaceState,
  command: WorkspaceCommand,
): CommandResult {
  const cardIds = new Set(workspace.cards.map(({ id }) => id));

  switch (command.type) {
    case "add-math": case "edit-math": {
      const parsed = mathItemSchema.safeParse(command.item);
      if (!parsed.success) return unchanged(workspace, parsed.error.issues[0]?.message ?? "Check the math expression.");
      const items = workspace.mathItems ?? [];
      const exists = items.some(item => item.id === parsed.data.id);
      if (command.type === "edit-math" && !exists) return unchanged(workspace, "That visual no longer exists.");
      if (command.type === "add-math" && (exists || cardIds.has(parsed.data.id))) return unchanged(workspace, "That visual already exists.");
      try { if (parsed.data.kind === "graph") sampleFunction(parsed.data.expression, parsed.data.xMin, parsed.data.xMax); }
      catch (error) { return unchanged(workspace, error instanceof Error ? error.message : "Cannot plot this expression."); }
      return accepted(workspace, { selectedCardIds: command.type === "add-math" ? [] : workspace.selectedCardIds, mathItems: command.type === "add-math" ? [...items, parsed.data] : items.map(item => item.id === parsed.data.id ? parsed.data : item) });
    }
    case "move-math": {
      if (!workspace.mathItems?.some(item => item.id === command.itemId)) return unchanged(workspace, "That visual no longer exists.");
      return accepted(workspace, { mathItems: workspace.mathItems.map(item => item.id === command.itemId ? { ...item, position: command.position } : item) });
    }
    case "remove-math": {
      if (!workspace.mathItems?.some(item => item.id === command.itemId)) return unchanged(workspace, "That visual no longer exists.");
      return accepted(workspace, { mathItems: workspace.mathItems.filter(item => item.id !== command.itemId) });
    }
    case "apply-pip-actions": {
      const parsed = pipActionBatchSchema.safeParse(command.batch);
      if (!parsed.success) return unchanged(workspace, "Pip sent an invalid action. Nothing changed.");
      const batch = parsed.data;
      const processed = workspace.processedPipActionIds ?? [];
      if (processed.includes(batch.batchId)) return { ok: true, workspace };
      if (batch.basedOnRevision !== workspace.revision) return unchanged(workspace, "The workspace changed while Pip was responding. Ask Pip to try again.");
      if (processed.length >= 2000) return unchanged(workspace, "This workspace has reached its Pip action limit. You can still edit cards yourself.");
      let next = workspace;
      for (const [index, action] of batch.actions.entries()) {
        if (referencedCardIds(action).some(id => !next.cards.some(card => card.id === id))) {
          return unchanged(workspace, "Pip referred to a card that no longer exists. Nothing changed.");
        }
        const result = applyWorkspaceCommand(next, commandFromPipAction(action, batch.resourceIds[index], next));
        if (!result.ok) return unchanged(workspace, result.reason + " No Pip actions were applied.");
        next = result.workspace;
      }
      // Commit a batch as one revision and one Undo, even when it contains several actions.
      return accepted(workspace, { ...next, processedPipActionIds: [...processed, batch.batchId] });
    }
    case "update-assignment":
      return accepted(workspace, { assignment: command.text, requirements: [], pending: { ...workspace.pending, requirements: [] } });
    case "check-requirement":
      return accepted(workspace, { requirements: workspace.requirements.map((item) => item.id === command.requirementId ? { ...item, checked: command.checked } : item) });
    case "clear-canvas":
      return accepted(workspace, { cards: [], ...(workspace.mathItems ? { mathItems: [] } : {}), connections: [], outlineOrder: [], selectedCardIds: [], currentStepId: null, pending: { requirements: [], cards: [], nextStep: null } });
    case "complete-step": {
      const card = workspace.cards.find(item => item.id === command.cardId);
      if (!card || card.kind !== "step") return unchanged(workspace, "Select a step to complete.");
      if (card.status === "done") return unchanged(workspace, "This step is already complete.");
      const next = { ...workspace, cards: workspace.cards.map(item => item.id === card.id ? { ...item, status: "done" as const } : item) };
      return accepted(workspace, rewardStepCompleted(next, card.id).workspace);
    }
    case "add-card": {
      const text = command.card.text.trim();
      if (!text || text.length > 500) return unchanged(workspace, "Card text must be 1–500 characters.");
      if (cardIds.has(command.card.id)) return unchanged(workspace, "That card already exists.");

      const card = { ...command.card, text };
      const next = {
        ...workspace,
        cards: [...workspace.cards, card],
        outlineOrder: card.kind === "idea" ? [...workspace.outlineOrder, card.id] : workspace.outlineOrder,
        selectedCardIds: [card.id],
      };
      return accepted(workspace, rewardIdeaAccepted(next, card.id).workspace);
    }
    case "edit-card": {
      const text = command.text.trim();
      if (!text || text.length > 500) return unchanged(workspace, "Card text must be 1–500 characters.");
      const card = workspace.cards.find(({ id }) => id === command.cardId);
      if (!card) return unchanged(workspace, "The card no longer exists.");
      if (card.text === text) return unchanged(workspace, "The card text did not change.");

      return accepted(workspace, {
        cards: workspace.cards.map((item) =>
          item.id === command.cardId ? { ...item, text } : item,
        ),
      });
    }
    case "select-cards": {
      const selectedCardIds = [...new Set(command.cardIds)].filter((id) => cardIds.has(id));
      if (
        selectedCardIds.length === workspace.selectedCardIds.length &&
        selectedCardIds.every((id, index) => id === workspace.selectedCardIds[index])
      ) {
        return unchanged(workspace, "Those cards are already selected.");
      }
      return accepted(workspace, { selectedCardIds });
    }
    case "move-card": {
      const card = workspace.cards.find(({ id }) => id === command.cardId);
      if (!card) return unchanged(workspace, "The card no longer exists.");
      if (card.position.x === command.position.x && card.position.y === command.position.y) {
        return unchanged(workspace, "The card did not move.");
      }
      return accepted(workspace, {
        cards: workspace.cards.map((item) =>
          item.id === command.cardId ? { ...item, position: command.position } : item,
        ),
      });
    }
    case "move-aside": {
      const card = workspace.cards.find(({ id }) => id === command.cardId);
      if (!card) return unchanged(workspace, "The card no longer exists.");
      if (card.status === "aside") return unchanged(workspace, "That card is already set aside.");
      return accepted(workspace, {
        cards: workspace.cards.map((item) =>
          item.id === command.cardId ? { ...item, status: "aside" as const } : item,
        ),
        selectedCardIds: workspace.selectedCardIds.filter((id) => id !== command.cardId),
      });
    }
    case "connect": {
      if (command.fromCardId === command.toCardId) {
        return unchanged(workspace, "Choose two different cards to connect.");
      }
      if (!cardIds.has(command.fromCardId) || !cardIds.has(command.toCardId)) {
        return unchanged(workspace, "Both cards must still exist.");
      }
      const alreadyConnected = workspace.connections.some(
        ({ fromCardId, toCardId }) =>
          (fromCardId === command.fromCardId && toCardId === command.toCardId) ||
          (fromCardId === command.toCardId && toCardId === command.fromCardId),
      );
      if (alreadyConnected) return unchanged(workspace, "Those cards are already connected.");

      return accepted(workspace, {
        connections: [
          ...workspace.connections,
          {
            id: command.connectionId,
            fromCardId: command.fromCardId,
            toCardId: command.toCardId,
          },
        ],
      });
    }
    case "update-notebook": {
      if (command.text.length > 50_000) {
        return unchanged(workspace, "The notebook is limited to 50,000 characters.");
      }
      if (command.text === workspace.notebookText) {
        return unchanged(workspace, "The notebook did not change.");
      }
      return accepted(workspace, { notebookText: command.text });
    }
    case "accept-requirement": {
      const suggestion = workspace.pending.requirements.find(
        ({ suggestionId }) => suggestionId === command.suggestionId,
      );
      if (!suggestion) return unchanged(workspace, "That requirement suggestion is no longer available.");
      if (workspace.requirements.some(({ id }) => id === command.requirementId)) {
        return unchanged(workspace, "That requirement already exists.");
      }
      return accepted(workspace, {
        requirements: [
          ...workspace.requirements,
          { id: command.requirementId, text: suggestion.text, checked: false },
        ],
        pending: {
          ...workspace.pending,
          requirements: workspace.pending.requirements.filter(
            ({ suggestionId }) => suggestionId !== command.suggestionId,
          ),
        },
      });
    }
    case "dismiss-requirement": {
      if (!workspace.pending.requirements.some(({ suggestionId }) => suggestionId === command.suggestionId)) {
        return unchanged(workspace, "That requirement suggestion is no longer available.");
      }
      return accepted(workspace, {
        pending: {
          ...workspace.pending,
          requirements: workspace.pending.requirements.filter(
            ({ suggestionId }) => suggestionId !== command.suggestionId,
          ),
        },
      });
    }
    case "accept-card": {
      const suggestion = workspace.pending.cards.find(
        ({ suggestionId }) => suggestionId === command.suggestionId,
      );
      if (!suggestion) return unchanged(workspace, "That card suggestion is no longer available.");
      // The full suggestion ID is already schema-bounded; never truncate it.
      // Reaccepting after undo keeps the same reward identity.
      const acceptedId = suggestion.suggestionId;
      if (cardIds.has(acceptedId)) return unchanged(workspace, "That card already exists.");

      const card: Card = {
        id: acceptedId,
        text: suggestion.text,
        kind: suggestion.kind,
        position: command.position,
        status: "active",
      };
      const withCard = {
        ...workspace,
        cards: [...workspace.cards, card],
        outlineOrder:
          card.kind === "idea" ? [...workspace.outlineOrder, card.id] : workspace.outlineOrder,
        selectedCardIds: [card.id],
        pending: {
          ...workspace.pending,
          cards: workspace.pending.cards.filter(
            ({ suggestionId }) => suggestionId !== command.suggestionId,
          ),
        },
      };
      const rewarded = rewardIdeaAccepted(withCard, card.id).workspace;
      return accepted(workspace, rewarded);
    }
    case "dismiss-card": {
      if (!workspace.pending.cards.some(({ suggestionId }) => suggestionId === command.suggestionId)) {
        return unchanged(workspace, "That card suggestion is no longer available.");
      }
      return accepted(workspace, {
        pending: {
          ...workspace.pending,
          cards: workspace.pending.cards.filter(
            ({ suggestionId }) => suggestionId !== command.suggestionId,
          ),
        },
      });
    }
    case "apply-pip-turn": {
      if (!pipTurnResponseSchema.safeParse(command.response).success) {
        return unchanged(workspace, "Pip returned invalid data. Nothing changed.");
      }
      if (command.response.basedOnRevision !== workspace.revision) {
        return unchanged(workspace, "Pip answered an older version of the workspace.");
      }
      let next = workspace;
      if (command.response.actions?.length) {
        const result = applyWorkspaceCommand(workspace, { type: "apply-pip-actions", batch: {
          batchId: `typed:${command.response.requestId}`, basedOnRevision: command.response.basedOnRevision,
          actions: command.response.actions, resourceIds: command.resourceIds ?? [],
        } });
        if (!result.ok) return result;
        next = result.workspace;
      }
      const highlightedCardIds = command.response.highlightedCardIds.filter((id) => cardIds.has(id));
      return accepted(workspace, {
        ...next,
        selectedCardIds:
          highlightedCardIds.length > 0 ? highlightedCardIds : next.selectedCardIds,
        conversation: [
          ...workspace.conversation,
          { role: "user" as const, text: command.userText },
          { role: "pip" as const, text: command.response.replyText },
        ].slice(-20),
        pending: {
          requirements: mergeSuggestions(
            next.pending.requirements,
            command.response.suggestedRequirements,
          ).slice(-20),
          cards: mergeSuggestions(next.pending.cards, command.response.suggestedCards).slice(-20),
          nextStep: command.response.suggestedNextStep ?? next.pending.nextStep,
        },
      });
    }
    case "buy-decoration": {
      const purchase = buyDecoration(workspace, command.decorationId);
      if (!purchase.ok) return unchanged(workspace, purchase.reason);
      return accepted(workspace, {
        coins: purchase.workspace.coins,
        ownedDecorations: purchase.workspace.ownedDecorations,
      });
    }
  }
}

function mergeSuggestions<T extends { suggestionId: string }>(current: T[], incoming: T[]): T[] {
  const byId = new Map(current.map((item) => [item.suggestionId, item]));
  incoming.forEach((item) => byId.set(item.suggestionId, item));
  return [...byId.values()];
}

export function commandFromProposedAction(
  action: ProposedAction,
  createConnectionId: () => string,
): WorkspaceCommand {
  switch (action.type) {
    case "highlight":
      return { type: "select-cards", cardIds: action.cardIds };
    case "move-aside":
      return { type: "move-aside", cardId: action.cardId };
    case "connect":
      return {
        type: "connect",
        connectionId: createConnectionId(),
        fromCardId: action.fromCardId,
        toCardId: action.toCardId,
      };
  }
}

export function workspaceHistoryReducer(
  state: WorkspaceHistory,
  action: WorkspaceHistoryAction,
): WorkspaceHistory {
  if (action.type === "hydrate") {
    return { workspace: action.workspace, past: [] };
  }

  if (action.type === "undo") {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return {
      workspace: {
        ...previous,
        notebookText: state.workspace.notebookText,
        conversation: state.workspace.conversation,
        coins: state.workspace.coins,
        rewardEventIds: state.workspace.rewardEventIds,
        ...(state.workspace.processedPipActionIds ? { processedPipActionIds: state.workspace.processedPipActionIds } : {}),
        ownedDecorations: state.workspace.ownedDecorations,
        revision: state.workspace.revision + 1,
      },
      past: state.past.slice(0, -1),
    };
  }

  const result = applyWorkspaceCommand(state.workspace, action.command);
  if (!result.ok || result.workspace === state.workspace) return state;

  if (action.command.type === "update-notebook" || action.command.type === "buy-decoration" || action.command.type === "select-cards") {
    return { ...state, workspace: result.workspace };
  }

  return {
    workspace: result.workspace,
    past: [...state.past, state.workspace].slice(-HISTORY_LIMIT),
  };
}
