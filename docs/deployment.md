# Deploying SideQuest

Hosting: Vercel, deploying the repository root from `main`.
Domain: `sidequestspace.com`, registered at GoDaddy.
Live site: https://www.sidequestspace.com (the apex redirects to www).
Verified 2026-09-27: HTTPS returns 200, both GoDaddy DNS records match Vercel,
and the production API smoke test passes with real Gemini replies. All five
active variables are present for Production and Preview. Vapi currently allows
all origins and assistants; the production origins are therefore permitted,
but the public key is not restricted to this app. A live production microphone
call has not been tested by the agent.

## Environment variables

Set these in the host's settings, never in a committed file.

| Name | Required | Value |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | The team's Gemini API key. Server-only. |
| `GEMINI_TEXT_MODEL` | Yes | The Gemini model ID the AI teammate verified on the team's account. |
| `GEMINI_TEXT_FALLBACK_MODEL` | No | Optional fallback for transient Gemini failures. |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | For voice | Vapi public key from the working local setup. |
| `NEXT_PUBLIC_VAPI_ASSISTANT_ID` | For voice | Published Pip assistant ID. |

Rules:

- Keep `GEMINI_API_KEY` server-only. Only the Vapi public key and assistant ID
  intentionally use `NEXT_PUBLIC_`; never put a Vapi private key there.
- Never paste the key into GitHub, the team chat, or an AI tool. Share it privately.
- Changing a variable on the host takes effect on the next deploy.

## Before deploying

1. Run `npm run test:api`, `npm run test:pip-actions`, `npm run test:math`,
   `node scripts/check-workspace.cjs`, `npm run typecheck`, and `npm run build`.
   Lint is skipped for this release at Chris's request.
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

## Vercel setup

1. Open [New Project](https://vercel.com/new) and import `ChrisH0125/SideQuest`.
2. Name the project `sidequestspace`, choose Next.js, and leave Root Directory
   as `./`. The GitHub repository is already the app root; do not enter the local
   worktree folder name `hero-canvas`.
3. Use `main` as the production branch. Keep the detected build/output defaults
   (`npm run build`, Next.js output) and use Node.js 22.x, matching release checks.
4. Before deploying, copy the five active environment variables above from the
   working ignored `.env.local` into Vercel for Production (Preview too if needed).
   The text model settings currently used are `gemini-3.8-flash` and fallback
   `gemini-3.5-flash-lite`. Do not add the unused `GEMINI_LIVE_MODEL`.
5. Deploy. Confirm the generated HTTPS address loads and Pip gives a real reply.
   If variables change afterward, redeploy; public Vapi variables are build-time.
6. Project Settings → Domains: add `sidequestspace.com` and
   `www.sidequestspace.com`; keep the apex redirecting to www, matching the current production setup.
7. In GoDaddy → domain → DNS, apply the exact A record for `@` and CNAME record
   for `www` shown by this project's Vercel Domains page. Leave nameservers and
   unrelated email/verification records alone. Wait for Valid Configuration.
8. In Vapi, allow the deployed HTTPS origins on the public key, including the
   custom domain and the production `vercel.app` address used for testing.
   Keep the key restricted to Pip. Publish the current prompt from
   `vapi-pip-instructions.md` and start a new call from the deployed app.
9. Run `BASE_URL=https://sidequestspace.com npm run smoke:api`, then check an idea,
   graph, work save/reload, reward, shop placement and real voice interaction.

Browser saves are origin-specific: localhost, the Vercel address and the custom
domain have separate workspaces. Local demo data does not automatically transfer.

References: [Git import](https://vercel.com/docs/git),
[environment variables](https://vercel.com/docs/environment-variables), and
[custom domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

## Current DNS

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 216.198.79.1 |
| CNAME | www | 9cc10299c97ee3e1.vercel-dns-017.com. |

These values were copied from this project's Vercel Domains page and saved in
GoDaddy. Nameservers and unrelated records were preserved. HTTPS was verified
after the records propagated.
