// Coin rules for Pip's rewards. Small, predictable, and never a penalty.
// Each function takes the workspace and returns an updated copy; it never changes the original.
//
// Every payout is recorded in rewardEventIds under a stable key like "idea-accepted:<cardId>",
// so accepting again, toggling a step, refreshing, or retrying a request never pays twice.
// These amounts are adjustable product defaults, not claims about what motivates people.
import type { WorkspaceState } from "./contracts";

export const IDEA_ACCEPTED_COINS = 1;
export const STEP_COMPLETED_COINS = 3;

export const DECORATIONS = {
  rug: { name: "Rug", cost: 5 },
  plant: { name: "Plant", cost: 3 },
  lamp: { name: "Lamp", cost: 4 },
  poster: { name: "Poster", cost: 2 },
  "rainbow-rug": { name: "Rainbow rug", cost: 10 },
  "fish-bowl": { name: "Fish bowl", cost: 6 },
} as const;
export type DecorationId = keyof typeof DECORATIONS;

export type RewardResult = { workspace: WorkspaceState; coinsEarned: number };
export type PurchaseResult =
  | { ok: true; workspace: WorkspaceState }
  | { ok: false; reason: string };

const IDEA_PREFIX = "idea-accepted:";
const STEP_PREFIX = "step-completed:";

// Call when the user accepts an idea card onto the board.
export function rewardIdeaAccepted(workspace: WorkspaceState, cardId: string): RewardResult {
  const card = workspace.cards.find(({ id }) => id === cardId);
  if (card?.kind !== "idea") return noReward(workspace);
  return payOnce(workspace, IDEA_PREFIX + cardId, IDEA_ACCEPTED_COINS);
}

// Call when the user marks a step card done.
export function rewardStepCompleted(workspace: WorkspaceState, stepId: string): RewardResult {
  const card = workspace.cards.find(({ id }) => id === stepId);
  if (card?.kind !== "step" || card.status !== "done") return noReward(workspace);
  return payOnce(workspace, STEP_PREFIX + stepId, STEP_COMPLETED_COINS);
}

export function buyDecoration(workspace: WorkspaceState, decorationId: DecorationId): PurchaseResult {
  const decoration = DECORATIONS[decorationId];
  if (!decoration) return { ok: false, reason: "That item isn't in the shop." };
  if (workspace.ownedDecorations.includes(decorationId)) {
    return { ok: false, reason: `Pip already has the ${decoration.name.toLowerCase()}.` };
  }
  if (workspace.coins < decoration.cost) {
    const short = decoration.cost - workspace.coins;
    return { ok: false, reason: `You need ${short} more coin${short === 1 ? "" : "s"}.` };
  }
  return {
    ok: true,
    workspace: {
      ...workspace,
      coins: workspace.coins - decoration.cost,
      ownedDecorations: [...workspace.ownedDecorations, decorationId],
    },
  };
}

function payOnce(workspace: WorkspaceState, eventKey: string, coins: number): RewardResult {
  if (workspace.rewardEventIds.includes(eventKey)) return noReward(workspace);
  return {
    workspace: {
      ...workspace,
      coins: workspace.coins + coins,
      rewardEventIds: [...workspace.rewardEventIds, eventKey],
    },
    coinsEarned: coins,
  };
}

function noReward(workspace: WorkspaceState): RewardResult {
  return { workspace, coinsEarned: 0 };
}
