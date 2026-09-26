// Runtime validation for the shared workspace and the Pip text endpoint.
// DRAFT: proposed shapes for the team to review with Chris before anyone builds on them.
// Types for these shapes live in contracts.ts, derived from the schemas so the two never drift.
import { z } from "zod";

const id = z.string().min(1).max(64);

export const requirementSchema = z.object({
  id,
  text: z.string().min(1).max(300),
  // Set by the user. An AI assessment is only ever a suggestion.
  checked: z.boolean(),
});

export const cardSchema = z.object({
  id,
  text: z.string().min(1).max(500),
  kind: z.enum(["idea", "step"]),
  position: z.object({ x: z.number(), y: z.number() }),
  status: z.enum(["active", "aside", "done"]),
  sourceUtterance: z.string().max(1000).optional(),
});

export const connectionSchema = z.object({
  id,
  fromCardId: id,
  toCardId: id,
});

export const conversationTurnSchema = z.object({
  role: z.enum(["user", "pip"]),
  text: z.string().min(1).max(2000),
});

// A card Pip suggests. It is not on the board until the user accepts it.
export const suggestedCardSchema = z.object({
  suggestionId: id,
  text: z.string().min(1).max(500),
  kind: z.enum(["idea", "step"]),
});

// A requirement Pip found in the assignment. It is not on the checklist until the user confirms it.
export const suggestedRequirementSchema = z.object({
  suggestionId: id,
  text: z.string().min(1).max(300),
});

export const nextStepSuggestionSchema = z.object({ text: z.string().min(1).max(200) });

// Everything Pip has suggested that the user has not accepted or dismissed yet.
// Accepting moves an item into requirements/cards; dismissing removes it.
export const pendingSuggestionsSchema = z.object({
  requirements: z.array(suggestedRequirementSchema).max(20),
  cards: z.array(suggestedCardSchema).max(20),
  nextStep: nextStepSuggestionSchema.nullable(),
});

export const workspaceStateSchema = z.object({
  projectId: id,
  title: z.string().min(1).max(120),
  assignment: z.string().max(5000),
  requirements: z.array(requirementSchema).max(20),
  cards: z.array(cardSchema).max(100),
  connections: z.array(connectionSchema).max(200),
  outlineOrder: z.array(id).max(100),
  selectedCardIds: z.array(id).max(100),
  currentStepId: id.nullable(),
  notebookText: z.string().max(50000),
  conversation: z.array(conversationTurnSchema).max(20),
  // Goes up by one on every accepted change, so stale AI replies can be detected.
  revision: z.number().int().min(0),
  coins: z.number().int().min(0),
  rewardEventIds: z.array(z.string().max(100)),
  ownedDecorations: z.array(z.string().max(64)),
  pending: pendingSuggestionsSchema,
});

export const proposedActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("highlight"), cardIds: z.array(id).min(1).max(10) }),
  z.object({ type: z.literal("move-aside"), cardId: id }),
  z.object({ type: z.literal("connect"), fromCardId: id, toCardId: id }),
]);

export const pipTurnRequestSchema = z.object({
  requestId: id,
  revision: z.number().int().min(0),
  workspace: workspaceStateSchema,
  userText: z.string().trim().min(1).max(2000),
});

export const pipTurnResponseSchema = z.object({
  requestId: id,
  basedOnRevision: z.number().int().min(0),
  replyText: z.string().min(1).max(1000),
  highlightedCardIds: z.array(id).max(10),
  suggestedRequirements: z.array(suggestedRequirementSchema).max(10),
  suggestedCards: z.array(suggestedCardSchema).max(5),
  suggestedNextStep: nextStepSuggestionSchema.nullable(),
  proposedActions: z.array(proposedActionSchema).max(5),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(["invalid_request", "stale_revision", "ai_unavailable", "invalid_ai_output"]),
    message: z.string(),
  }),
});
