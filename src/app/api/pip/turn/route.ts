// POST /api/pip/turn: one coaching turn with Pip.
// Request and response shapes are defined in src/lib/schemas.ts.
import { handlePipTurn } from "@/lib/pip-turn";
import { checkPipRateLimit } from "@/lib/pip-rate-limit";
import { readJsonBody } from "@/lib/read-json-body";

// Well above the largest valid workspace, so real users never hit it.
const MAX_BODY_BYTES = 512 * 1024;

export async function POST(request: Request) {
  const rateLimit = checkPipRateLimit(request);
  const rateLimitHeaders = {
    "RateLimit-Limit": String(rateLimit.limit),
    "RateLimit-Remaining": String(rateLimit.remaining),
  };

  if (!rateLimit.allowed) {
    return Response.json(
      { error: { code: "rate_limited", message: "Pip needs a short break. Try again in a minute." } },
      {
        status: 429,
        headers: { ...rateLimitHeaders, "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) {
    const tooLarge = body.reason === "too_large";
    return Response.json(
      {
        error: {
          code: "invalid_request",
          message: tooLarge
            ? "This project is too big to send to Pip. Try shortening your notebook."
            : "Pip couldn't read this request. Refresh the page and try again.",
        },
      },
      { status: tooLarge ? 413 : 400, headers: rateLimitHeaders },
    );
  }

  const result = await handlePipTurn(body.value);
  return Response.json(result.body, { status: result.status, headers: rateLimitHeaders });
}
