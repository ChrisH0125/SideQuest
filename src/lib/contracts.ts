// Shared TypeScript types for the workspace and the Pip text endpoint.
// DRAFT: proposed for team review. Change schemas.ts and these update automatically.
import type { z } from "zod";
import type {
  apiErrorSchema,
  cardSchema,
  connectionSchema,
  conversationTurnSchema,
  pipTurnRequestSchema,
  pipTurnResponseSchema,
  nextStepSuggestionSchema,
  pendingSuggestionsSchema,
  proposedActionSchema,
  requirementSchema,
  suggestedCardSchema,
  suggestedRequirementSchema,
  workspaceStateSchema,
} from "./schemas";

export type Requirement = z.infer<typeof requirementSchema>;
export type Card = z.infer<typeof cardSchema>;
export type Connection = z.infer<typeof connectionSchema>;
export type ConversationTurn = z.infer<typeof conversationTurnSchema>;
export type WorkspaceState = z.infer<typeof workspaceStateSchema>;
export type SuggestedCard = z.infer<typeof suggestedCardSchema>;
export type SuggestedRequirement = z.infer<typeof suggestedRequirementSchema>;
export type NextStepSuggestion = z.infer<typeof nextStepSuggestionSchema>;
export type PendingSuggestions = z.infer<typeof pendingSuggestionsSchema>;
export type ProposedAction = z.infer<typeof proposedActionSchema>;
export type PipTurnRequest = z.infer<typeof pipTurnRequestSchema>;
export type PipTurnResponse = z.infer<typeof pipTurnResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
