// POST /api/pip/turn: one coaching turn with Pip.
// Request and response shapes are defined in src/lib/schemas.ts.
import { handlePipTurn } from "@/lib/pip-turn";
import { checkPipRateLimit } from "@/lib/pip-rate-limit";

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "invalid_request", message: "The request body must be JSON." } },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  const result = await handlePipTurn(body);
  return Response.json(result.body, { status: result.status, headers: rateLimitHeaders });
}
