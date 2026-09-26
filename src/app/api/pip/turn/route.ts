// POST /api/pip/turn: one coaching turn with Pip.
// Request and response shapes are defined in src/lib/schemas.ts.
import { handlePipTurn } from "@/lib/pip-turn";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "invalid_request", message: "The request body must be JSON." } },
      { status: 400 },
    );
  }

  const result = await handlePipTurn(body);
  return Response.json(result.body, { status: result.status });
}
