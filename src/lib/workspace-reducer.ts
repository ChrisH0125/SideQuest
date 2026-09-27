import type { Card, PipTurnResponse, ProposedAction, WorkspaceState } from "./contracts";
import { buyDecoration, rewardIdeaAccepted, type DecorationId } from "./rewards";

export type WorkspaceCommand =
  | { type: "add-card"; card: Card }
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
  | { type: "apply-pip-turn"; userText: string; response: PipTurnResponse }
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
  return {
    ok: true,
    workspace: { ...workspace, ...changes, revision: workspace.revision + 1 },
  };
}

export function applyWorkspaceCommand(
  workspace: WorkspaceState,
  command: WorkspaceCommand,
): CommandResult {
  const cardIds = new Set(workspace.cards.map(({ id }) => id));

  switch (command.type) {
    case "add-card": {
      const text = command.card.text.trim();
      if (!text || text.length > 500) return unchanged(workspace, "Card text must be 1–500 characters.");
      if (cardIds.has(command.card.id)) return unchanged(workspace, "That card already exists.");

      const card = { ...command.card, text };
      return accepted(workspace, {
        cards: [...workspace.cards, card],
        outlineOrder: card.kind === "idea" ? [...workspace.outlineOrder, card.id] : workspace.outlineOrder,
        selectedCardIds: [card.id],
      });
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
      if (cardIds.has(command.cardId)) return unchanged(workspace, "That card already exists.");

      const card: Card = {
        id: command.cardId,
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
      if (command.response.basedOnRevision !== workspace.revision) {
        return unchanged(workspace, "Pip answered an older version of the workspace.");
      }
      const highlightedCardIds = command.response.highlightedCardIds.filter((id) => cardIds.has(id));
      return accepted(workspace, {
        selectedCardIds:
          highlightedCardIds.length > 0 ? highlightedCardIds : workspace.selectedCardIds,
        conversation: [
          ...workspace.conversation,
          { role: "user" as const, text: command.userText },
          { role: "pip" as const, text: command.response.replyText },
        ].slice(-20),
        pending: {
          requirements: mergeSuggestions(
            workspace.pending.requirements,
            command.response.suggestedRequirements,
          ).slice(-20),
          cards: mergeSuggestions(workspace.pending.cards, command.response.suggestedCards).slice(-20),
          nextStep: command.response.suggestedNextStep ?? workspace.pending.nextStep,
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
        coins: state.workspace.coins,
        rewardEventIds: state.workspace.rewardEventIds,
        ownedDecorations: state.workspace.ownedDecorations,
        revision: state.workspace.revision + 1,
      },
      past: state.past.slice(0, -1),
    };
  }

  const result = applyWorkspaceCommand(state.workspace, action.command);
  if (!result.ok) return state;

  if (action.command.type === "update-notebook" || action.command.type === "buy-decoration") {
    return { ...state, workspace: result.workspace };
  }

  return {
    workspace: result.workspace,
    past: [...state.past, state.workspace].slice(-HISTORY_LIMIT),
  };
}
