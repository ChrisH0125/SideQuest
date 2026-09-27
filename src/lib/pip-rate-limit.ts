const WINDOW_MS = 60_000;
const REQUEST_LIMIT = 8;
const MAX_TRACKED_CLIENTS = 10_000;

type ClientWindow = {
  count: number;
  resetAt: number;
};

type PipRateLimitStore = Map<string, ClientWindow>;

declare global {
  var __sidequestPipRateLimits: PipRateLimitStore | undefined;
}

const windows = globalThis.__sidequestPipRateLimits ?? new Map<string, ClientWindow>();
globalThis.__sidequestPipRateLimits = windows;

function clientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown-client";
}

function pruneExpiredWindows(now: number) {
  if (windows.size < MAX_TRACKED_CLIENTS) return;

  for (const [key, value] of windows) {
    if (value.resetAt <= now) windows.delete(key);
  }
}

export type PipRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkPipRateLimit(request: Request, now = Date.now()): PipRateLimitResult {
  pruneExpiredWindows(now);

  const requestedKey = clientKey(request);
  const key =
    windows.size >= MAX_TRACKED_CLIENTS && !windows.has(requestedKey)
      ? "overflow-client"
      : requestedKey;
  const current = windows.get(key);
  const window =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + WINDOW_MS }
      : current;

  if (window.count >= REQUEST_LIMIT) {
    return {
      allowed: false,
      limit: REQUEST_LIMIT,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
    };
  }

  window.count += 1;
  windows.set(key, window);
  return {
    allowed: true,
    limit: REQUEST_LIMIT,
    remaining: REQUEST_LIMIT - window.count,
    retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
  };
}
