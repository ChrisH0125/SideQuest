// Reads a JSON request body, but stops early if it is bigger than maxBytes,
// so one huge request cannot tie up the server.
export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: "too_large" | "not_json" };

export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBodyResult> {
  const declaredSize = Number(request.headers.get("content-length"));
  if (declaredSize > maxBytes) return { ok: false, reason: "too_large" };

  const text = await readTextUpTo(request, maxBytes);
  if (text === null) return { ok: false, reason: "too_large" };

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, reason: "not_json" };
  }
}

// Returns null as soon as the body passes maxBytes (the size header can be missing or wrong).
async function readTextUpTo(request: Request, maxBytes: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
