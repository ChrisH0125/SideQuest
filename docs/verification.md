# Verification history

These dated notes describe checks performed during development. Statements about
uncommitted work refer to that point in time; all three passes were published to
GitHub main as `9d8f459` on 2026-09-27.


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


## Voice startup correction (2026-09-27)

A production browser request returned HTTP 400: `assistantId must be a UUID`. The deployed value was a full Vapi dashboard URL. A direct request using the local UUID returned HTTP 201, isolating this failure to deployment configuration rather than microphone transport. The client now normalizes Vapi assistant links, validates before requesting the microphone, distinguishes fatal SDK errors from optional audio enhancements, and preserves safe call references. Six voice regression checks and ten action checks passed; the production build and type checking passed. Live post-deployment voice verification remains pending.
