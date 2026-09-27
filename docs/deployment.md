# Deploying SideQuest

Status: the hosting service has not been chosen yet. The environment variables and
checks below apply to any host. The Vercel section is an example, not a decision.

## Environment variables

Set these in the host's settings, never in a committed file.

| Name | Required | Value |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | The team's Gemini API key. Server-only. |
| `GEMINI_TEXT_MODEL` | Yes | The Gemini model ID the AI teammate verified on the team's account. |
| `GEMINI_TEXT_FALLBACK_MODEL` | No | Optional fallback for transient Gemini failures. |
| `GEMINI_LIVE_MODEL` | No | Not used by the code yet. |

Rules:

- Never give these a `NEXT_PUBLIC_` prefix. That would put the key in every
  visitor's browser.
- Never paste the key into GitHub, the team chat, or an AI tool. Share it privately.
- Changing a variable on the host takes effect on the next deploy.

## Before deploying

1. `npm run lint`, `npm run typecheck`, and `npm run build` all pass.
2. Start the production build locally (`npm run build`, then `npm start`) and run
   `npm run smoke:api`. Every check should pass with real Gemini replies. For local
   validation without a key only, use `npm run smoke:api -- --allow-ai-unavailable`.
3. Confirm the deployed site's Pip replies are real (not `ai_unavailable`).

## Known limits of the rate limiter

`src/lib/pip-rate-limit.ts` allows 8 Pip turns per minute per client. It is fine for
a demo but is not strong protection on a public link:

- Counts are kept in the server's memory. Hosts that run several copies of the
  server (serverless hosts like Vercel do) keep separate counts per copy, and counts
  reset when a copy restarts.
- Clients are told apart by the `X-Forwarded-For` header. Behind a host that sets
  this header itself this works; elsewhere a client could fake it.

If the demo link will be public for long, set a spending limit on the Gemini account
as a backstop.

## Example: Vercel

1. Import the GitHub repo in Vercel. It detects Next.js; no build settings needed.
2. Project Settings → Environment Variables: add `GEMINI_API_KEY` and
   `GEMINI_TEXT_MODEL` for Production (and Preview if you use preview links).
3. Deploy, then run the smoke test against the live site:
   `BASE_URL=https://your-app.vercel.app npm run smoke:api`
