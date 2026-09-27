// Checks a Pip turn request, asks Pip, and checks the reply before it reaches the browser.
// Kept separate from the route file so the logic can be tested without a server.
import type { ApiError, PipTurnResponse } from "./contracts";
import { getPipReply, InvalidPipModelOutputError } from "./ai/pip";
import { pipTurnRequestSchema, pipTurnResponseForRequestSchema } from "./schemas";
import type { z } from "zod";

export type PipTurnResult =
  | { status: 200; body: PipTurnResponse }
  | { status: 400 | 502; body: ApiError };

function apiError(status: 400 | 502, code: ApiError["error"]["code"], message: string): PipTurnResult {
  return { status, body: { error: { code, message } } };
}

export async function handlePipTurn(body: unknown): Promise<PipTurnResult> {
  const request = pipTurnRequestSchema.safeParse(body);
  if (!request.success) {
    return apiError(400, "invalid_request", describeRequestProblem(request.error.issues[0]));
  }

  let reply: unknown;
  try {
    reply = await getPipReply(request.data);
  } catch (error) {
    // Server log only: says what failed without printing the student's work or any keys.
    console.error("Pip turn failed:", error instanceof Error ? error.message.slice(0, 200) : "unknown error");
    if (error instanceof InvalidPipModelOutputError) {
      return apiError(
        502,
        "invalid_ai_output",
        "Pip's answer was not usable, so nothing was changed. Try again.",
      );
    }
    return apiError(502, "ai_unavailable", "Pip could not answer right now. Your work is safe. Try again.");
  }

  const checked = pipTurnResponseForRequestSchema(request.data).safeParse(reply);
  if (!checked.success) {
    return apiError(502, "invalid_ai_output", "Pip's answer did not match your board, so nothing was changed. Try again.");
  }
  return { status: 200, body: checked.data };
}

// Turns a validation problem into a sentence a student (or teammate) can act on.
function describeRequestProblem(issue: z.core.$ZodIssue): string {
  const [field, subfield] = issue.path;
  if (field === "userText") {
    return issue.code === "too_big"
      ? "Your message is too long. Keep it under 2,000 characters."
      : "Type a message for Pip first.";
  }
  if (field === "workspace" && subfield === "notebookText" && issue.code === "too_big") {
    return "Your notebook is too long for Pip to read. The limit is 50,000 characters.";
  }
  if (field === "revision") {
    return "Your board changed while this was being sent. Try again.";
  }
  const where = issue.path.length > 0 ? ` (problem at ${issue.path.join(".")})` : "";
  return `Pip couldn't read this request${where}. Refresh the page and try again.`;
}
