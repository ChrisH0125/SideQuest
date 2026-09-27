# SideQuest

A cozy pixel workspace for making progress on math, writing, studying, projects,
and everyday tasks. The Figma Make room from PR #10 is the home screen. See `AGENTS.md`.

Docs: [Refinement plan](docs/refinement-plan.md) · [Voice prompt](docs/vapi-pip-instructions.md) · [Math](docs/math.md) · [API](docs/api.md) · [Deployment](docs/deployment.md)

## Setup

Node.js 20.9 or newer (24 LTS recommended), npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `GEMINI_API_KEY` in ignored `.env.local`. The requested text model is
`gemini-3.8-flash`, with `gemini-3.5-flash-lite` as the fallback for timeout,
rate-limit and server errors. Gemini 3 uses low thinking effort and a 2,048-token
budget so its reasoning has room alongside the structured reply.

Set `NEXT_PUBLIC_VAPI_PUBLIC_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID` for voice.
Use a Vapi **public** key restricted to your assistant and app origins; private
keys never belong in browser variables. Restart after changing environment
values. Keep `transcript` and `tool-calls` client messages enabled. Paste the
[updated Pip prompt](docs/vapi-pip-instructions.md) into the assistant. The app
supplies its browser tool at call start; no tool webhook or private key is needed.

`GEMINI_LIVE_MODEL=gemini-3.8-live` is retained as requested configuration for a
future direct Gemini Live integration. It is not consumed by this application
and was not in the model-list response checked during this revision. Vapi is
the active voice layer; the published Vapi assistant selects its own voice/model.

## Demo path

1. The room fills the viewport with the original pixel artwork and persisted
   sun/moon theme. New saves start empty; existing saves remain untouched.
2. **Canvas** opens the board. The notebook opens **Your work**, with a goal
   field and a saved writing area. On desktop this sits beside the board; on
   phones use the **Work area / Canvas only** control to switch.
3. Add an idea (+1 coin), or add a step and complete it (+3 coins). Replaying or
   undoing/repeating the same action never pays twice. Edit, connect, or move
   cards aside. Clear opens a confirmation; Undo restores cleared cards.
4. **Clear** preserves the goal, written work, coins, and purchases. A changed
   goal replaces its previous checklist, while preserving cards and work.
5. The recorder opens Pip's **Speak** controls; clicking Pip opens **Type**.
   Both use one persistent companion. Voice calls still require **Talk to Pip**.
6. Tell Pip to capture an idea, add a step, edit/connect existing cards, or mark
   a finished step done. Typed Gemini and Vapi tool events use the same validated
   commands. Successful batches show a receipt and Undo; stale or invalid batches
   leave everything unchanged. Advice can still appear as an optional suggestion.
7. Buy an item in the shop and return to the room to see it. Items have previews
   and fixed room positions; ownership, coins, cards, and written work persist.

Voice tool execution is implemented. Chris confirmed live voice conversation
works on 2026-09-27; graph tool calls still need a live check. Vapi client tools cannot return native results: the app injects a
receipt and refreshed context after applying them. Use the visible receipt as
the source of truth. **Canvas → Math** now adds editable equations and function
graphs. Pip can also plot functions and show equations through typed or voice
actions. See [math notation and limits](docs/math.md).

Vapi receives current task/card context during a call. Private keys remain on
servers. Saves are local to this browser; download your work for a portable copy.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development, default port 3000 |
| `npm run typecheck` | Generate Next.js types and check TypeScript |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run test:api` | Request reader and smoke validation regression checks |
| `npm run test:pip-actions` | Typed/voice actions, atomicity, replay, Undo and persistence |
| `npm run test:math` | Bounded math parsing, sampling, visual commands and persistence |
| `npm run smoke:api` | Check the running API with real replies; append `-- --allow-ai-unavailable` for offline checks |
| `node scripts/check-workspace.cjs` | Undo, rewards, limits, stale replies and storage regression checks |
| `npm run lint` | ESLint (skipped for this revision at Chris's request) |

## Verified and remaining

Release preparation (2026-09-27): all three refinement passes are included.
Tests, workspace regressions, typecheck and production build passed again.
Vercel and `sidequestspace.com` are the selected hosting/domain; follow
[deployment setup](docs/deployment.md). Earlier pass notes below record the state
at the time of each implementation.

Pass 3 verification (2026-09-27): 7 math tests, 10 action tests, 4 API tests,
workspace regressions, TypeScript and production build passed. Production browser
QA covered quadratic roots, native equation rendering, keyboard x exploration,
invalid-expression recovery, edit/Undo, button movement, and graph/draft reload.
A real typed Pip request created a sine graph and equation in one batch; a follow-up
correctly explained the app's sampled zeros near -pi, 0 and pi as approximate.
At 390px the Work/Math controls fit without horizontal overflow, and browser
warning/error logs were empty. Chris confirmed live voice conversation works;
new voice graph delivery still needs a call after publishing the updated prompt.
Lint remains skipped at Chris's request. Changes remain local and uncommitted.

Pass 2 verification (2026-09-27): 10 action regressions, 4 API regressions,
workspace regressions, TypeScript and production build passed. A real production
browser journey created an idea and step, edited/connected existing cards,
completed a step (+3), undid completion, completed it again without another payout,
and reloaded with cards/coins/work intact. Idea creation awarded +1. At 390px,
Pip's voice panel fit without horizontal overflow; no new browser errors were
reported. Live microphone transport was unverified during that pass; Chris subsequently
confirmed voice conversation works. No dashboard settings were changed by the agent. Lint remains skipped at Chris's request. Nothing was committed or
pushed.

The first live action request exposed Zod's oneOf/const output not constraining
Gemini action names. The adapter now emits anyOf/enum while keeping the same
runtime validation; the corrected real requests succeeded. A standalone corrected
request used fallback after a primary 503. Rejected output preserved input and
left the board unchanged.

Refinement pass 1 (2026-09-27, local changes): API/workspace regression checks,
typecheck and production build passed. Browser QA covered blank start, manual
idea rewards, step completion, shop purchase and placement after reload, work
persistence, clear confirmation, recorder/type entry, night mode, and a 390px
viewport with no horizontal overflow. A real Gemini request on `2x = 8` returned
a contextual hint and a divide-by-two step suggestion; the primary returned 503
and the configured fallback succeeded. Graphs were added in Pass 3. Existing saved essay examples are retained as user data; edit
the goal and use Clear canvas to replace them without losing written work.

Earlier MVP checks:

- Typecheck, production build and workspace regression checks passed.
- Desktop and 390px browser checks covered hero/canvas navigation, theme,
  full-height canvas, Pip panel, card creation, notebook typing, draft-safe undo,
  modal focus, reload restoration and no horizontal overflow.
- A real Gemini 3.8 Flash coaching request succeeded through the browser route,
  using selected-card and assignment context. Initial unusable output was
  handled without losing input; the response-budget adjustment was then tested.
- Chris confirmed that live voice conversation works on 2026-09-27. The new
  voice graph tools still need a live test after publishing the updated prompt.
- Saves are browser-local. Old notebook data is migrated without deleting its
  original key. Unreadable saves pause new writes; export your draft for recovery.

## Implementation

React 19 / Next.js 16, TypeScript, Tailwind/CSS and React Flow. One
`WorkspaceProvider` owns the validated reducer and save state. One persistent
Pip component owns voice and serial coaching requests. The Figma artwork keeps its
proportions while the room extends to the viewport. The canvas and Work area use
a responsive split layout, with separate views on smaller screens.

References: [Vapi Web SDK](https://github.com/VapiAI/client-sdk-web) and
[Gemini thinking controls](https://ai.google.dev/gemini-api/docs/generate-content/thinking).
