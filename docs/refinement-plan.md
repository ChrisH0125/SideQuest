# SideQuest refinement plan

Approved direction, 2026-09-27: help students turn spoken or typed problems into
manageable action across math, writing, studying, projects, and everyday tasks.
Cards are an optional organization aid, not the product's main interaction.

## User journey

1. Start with “What are you working on?” No preloaded essay or fake AI reply.
2. Speak or type to one persistent Pip. The recorder opens voice controls; Pip
   opens coaching; the board opens the workspace; the notebook opens actual work.
3. Pip captures useful ideas and breaks a problem into small steps on the canvas.
4. Work in the adjacent editor; enter equations and generate numerical function
   graphs in the same workspace. Keep the student's work editable.
5. Completing real actions earns predictable coins; purchases appear in the room.

## Pass 1 — implemented locally, 2026-09-27

- Blank initial workspace and subject-neutral coaching/copy. Preserve existing saves.
- Room fills the viewport, keeping the sun/moon and original pixel artwork.
- Persistent Work area beside the board on desktop; explicit Work/Canvas views
  on smaller screens. Goal and draft have separate, clear labels.
- Clear canvas requires confirmation, can be undone, and preserves written work,
  goal, currency, and purchases. Changing the goal removes the old goal's checklist.
- +1 for a newly added/accepted idea; +3 for the first completion of a step.
  Retries and undo/reapply never pay twice; text edits do not earn coins.
- Shop previews and immediate, persisted room decorations.
- Validate new/legacy saves, coin replay, clear/undo, purchase/reload, keyboard,
  and desktop/mobile layout. Do not claim voice actions or graphs are implemented.

Verification: API/workspace regressions, typecheck, build, desktop/390px browser
checks, purchase/reload, and a real contextual math reply passed. Primary Gemini
returned 503; fallback succeeded. Clear/undo and duplicate rewards were tested at
the reducer boundary; the browser confirmation was checked without deleting the
user's work. Existing saves (including the old essay example) remain untouched.
Changes are not committed or pushed.

## Pass 2 — implemented locally; voice conversation subsequently confirmed

One `update_workspace` client tool carries a bounded batch of `add_idea`,
`add_step`, `edit_card`, `connect_cards`, `complete_step`, `highlight_cards`, and
`set_goal` actions. Grouping related operations gives one atomic commit and Undo.
Typed Gemini uses the same schema and manual reducer commands. Draft replacement,
board clearing, coin balances, and shopping are not AI actions.

- App-owned resource IDs; stable request/tool IDs survive saves and Undo.
- Entire stale/invalid batches are rejected; rejected replies preserve typed input.
- Applied actions show a visible receipt and Undo, with deterministic coin rewards.
- Fresh context uses the provider's committed state, including exact new card IDs.
- Vapi tools are supplied via per-call `tools:append`; no dashboard tool creation
  or webhook is required. Update the dashboard prompt and keep transcript/tool-call
  client messages enabled using `vapi-pip-instructions.md`.
- Vapi browser tools are asynchronous and cannot return native results. The app
  injects `APP_ACTION_RECEIPT` and updated context. The UI receipt confirms changes;
  spoken acknowledgement timing is not verified by mock tool-event tests.
- A real microphone call, mute/end behavior against the live SDK, and the original
  audio/network failure still need hands-on verification. Dashboard configuration
  has not been edited or published by this implementation.

Pass 2 verification (2026-09-27): 10 action regressions, 4 API regressions,
workspace regressions, TypeScript and production build passed. A real production
browser journey created an idea and step, edited/connected existing cards,
completed a step (+3), undid completion, completed it again without another payout,
and reloaded with cards/coins/work intact. Idea creation awarded +1. At 390px,
Pip's voice panel fit without horizontal overflow; no new browser errors were
reported. Live microphone transport remains unverified; no dashboard settings
were changed. Lint remains skipped at Chris's request. Nothing was committed or
pushed.

The first live action request exposed Zod's oneOf/const output not constraining
Gemini action names. The adapter now emits anyOf/enum while keeping the same
runtime validation; the corrected real requests succeeded. A standalone corrected
request used fallback after a primary 503. Rejected output preserved input and
left the board unchanged.

## Pass 3 — equations and function graphs implemented locally

- **Canvas → Math** and **Your work → Equations & graphs** accept equations and
  explicit functions of x. Native MathML renders fractions, powers and roots.
- Graphs use a bounded local parser/evaluator and 401 numerical samples. No eval,
  generated JavaScript, remote graph service or LLM-generated coordinates.
- Visible axes, keyboard x exploration, sample values and approximate sampled
  zeros. Undefined values and detected jumps split the plot. See `math.md` for
  the limits; plots and formatted equations are not algebraic proofs.
- `plot_function` and `show_equation` are supported by typed Gemini and the Vapi
  client tool, using the existing atomic command/replay/receipt path. Pip receives
  current math visuals and computed sampled zeros.
- Edit expression/range, move by dragging or buttons, remove, Undo and Clear.
  Existing saves still load. Math saves and plain-text exports preserve the
  student's draft; creating a visual does not award idea coins.
- Chris confirmed live voice conversation works. The new graph tool still needs
  a live-call check after replacing the old no-graphs prompt and starting a new call.

Accepted scope for this implementation was equation input + function plots +
Pip's graph tool. Rich step-diagram automation, handwriting, implicit curves,
physics simulations and symbolic proof remain outside this pass. Existing cards
and connections still provide a simple manual step diagram.

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

## Demo acceptance

- Planning: speak a messy task → useful ideas/steps → edit and complete one →
  earn coins → buy decoration → see it in the room → reload preserves everything.
- Math: enter a problem → ask for one explanation/graph → do a step yourself →
  receive a contextual hint. Do not present a generated plot as verified algebra.
- Writing: set any goal → organize thoughts → draft in Work with Pip beside it.
- Phone and keyboard users can complete the same core actions.

## Reference

[Mimir](https://devpost.com/software/mimir-the-ai-blackboard) describes a shared
canvas, voice tutoring, handwriting, validated math, safe locally sampled graphs,
and AI annotations that preserve the student's strokes. Borrow the integrated
work-and-guidance interaction; implement and verify each capability separately.
