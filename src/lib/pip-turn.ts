// Checks a Pip turn request, asks Pip, and checks the reply before it reaches the browser.
// Kept separate from the route file so the logic can be tested without a server.
import type { ApiError, PipTurnResponse } from "./contracts";
import { getPipReply, InvalidPipModelOutputError } from "./ai/pip";
import { pipTurnRequestSchema, pipTurnResponseForRequestSchema } from "./schemas";

export type PipTurnResult =
  | { status: 200; body: PipTurnResponse }
  | { status: 400 | 502; body: ApiError };

function apiError(status: 400 | 502, code: ApiError["error"]["code"], message: string): PipTurnResult {
  return { status, body: { error: { code, message } } };
}

export async function handlePipTurn(body: unknown): Promise<PipTurnResult> {
  const request = pipTurnRequestSchema.safeParse(body);
  if (!request.success) {
    const issue = request.error.issues[0];
    const where = issue.path.length > 0 ? ` (at ${issue.path.join(".")})` : "";
    return apiError(400, "invalid_request", `The request was not valid: ${issue.message}${where}.`);
  }

  let reply: unknown;
  try {
    reply = await getPipReply(request.data);
  } catch (error) {
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
