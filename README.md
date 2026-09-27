# SideQuest

A cozy pixel workspace for turning an overwhelming assignment into your own
writing. The Figma Make room from PR #10 is the home screen. See `AGENTS.md`.

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
values. Enable transcript client messages on the Vapi assistant for captions.

`GEMINI_LIVE_MODEL=gemini-3.8-live` is retained as requested configuration for a
future direct Gemini Live integration. It is not consumed by this application
and was not in the model-list response checked during this revision. Vapi is
the active voice layer; the published Vapi assistant selects its own voice/model.

## Demo path

1. The hero uses the teammate's exported room, cat, desk, windows, notebook and
   recorder. The sun/moon button changes the room and canvas, and remembers the
   preference in this browser.
2. Press **Canvas** or the corkboard. The canvas fills the viewport and Pip jumps
   from the room into its corner. Reduced-motion preferences skip the jump.
3. Add, select, edit, connect or move aside cards. **Tools** includes keyboard
   alternatives to dragging. **Undo** keeps newer notebook writing, conversation
   and the paid reward ledger. The workspace starts with a sample assignment.
4. Open **Notebook** to replace the task, check requirements, write and download
   your draft. Save feedback reports actual browser-storage results.
5. Press Pip to expand its compact coaching panel. Type a thought for contextual
   Gemini coaching and accept or skip suggestions. A stale response is rejected
   while preserving your input. Cards are always added by the user's choice.
6. **Talk to Pip** requests the microphone before creating a Vapi call. The call
   remains mounted across room/canvas navigation. Stop/mute, captions and a local
   microphone signal are provided. **Use transcript** lets you review your words
   before sending them through the same Gemini path as typing.

Vapi handles spoken conversation; Gemini is the sole structured suggestion
source. Vapi tools do not mutate the board. During a call Vapi receives the
assignment, cards, selection, requirements, recent coaching and a short notebook
excerpt. Do not enter sensitive material in this hackathon demo.

The shop is a simple collection using earned coins. Item placement and Pip
accessories are outside this revision.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development, default port 3000 |
| `npm run typecheck` | Generate Next.js types and check TypeScript |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `node scripts/check-workspace.cjs` | Undo, rewards, limits, stale replies and storage regression checks |
| `npm run lint` | ESLint (skipped for this revision at Chris's request) |

## Verified and remaining

- Typecheck, production build and workspace regression checks passed.
- Desktop and 390px browser checks covered hero/canvas navigation, theme,
  full-height canvas, Pip panel, card creation, notebook typing, draft-safe undo,
  modal focus, reload restoration and no horizontal overflow.
- A real Gemini 3.8 Flash coaching request succeeded through the browser route,
  using selected-card and assignment context. Initial unusable output was
  handled without losing input; the response-budget adjustment was then tested.
- A successful live Vapi microphone call has **not** been verified. Compare
  microphone permissions/input and the Vapi call log, then try a hotspot if the
  audio failure repeats. A local mic signal does not prove Vapi received audio.
- Saves are browser-local. Old notebook data is migrated without deleting its
  original key. Unreadable saves pause new writes; export your draft for recovery.

## Implementation

React 19 / Next.js 16, TypeScript, Tailwind/CSS and React Flow. One
`WorkspaceProvider` owns the validated reducer and save state. One persistent
Pip component owns voice and serial coaching requests. Exported Figma room
geometry stays at 960×720 internally and scales to fit; the interactive canvas
is independently responsive and never rendered inside a small room modal.

References: [Vapi Web SDK](https://github.com/VapiAI/client-sdk-web) and
[Gemini thinking controls](https://ai.google.dev/gemini-api/docs/generate-content/thinking).
