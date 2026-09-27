# SideQuest API

The app has one server endpoint. All shapes are enforced in `src/lib/schemas.ts`;
TypeScript types with the same names are in `src/lib/contracts.ts`. If this page and
the schemas ever disagree, the schemas win. Please update this page.

## POST /api/pip/turn

One coaching turn with Pip. The browser sends the current workspace and what the
user typed; Pip replies with a short message, actions, and optional suggestions.
The browser validates and commits the actions as one undoable batch before showing
the reply. The server never writes the browser workspace itself.

- Real replies come from Gemini (`src/lib/ai/pip.ts`). Each call uses the team's
  Gemini quota.
- Send one turn at a time. Wait for the reply before sending the next one.

### Request

`Content-Type: application/json`, at most 512 KB.

| Field | Type | Rules |
| --- | --- | --- |
| `requestId` | string | 1–64 characters, new for each turn. Pip's reply echoes it back. |
| `revision` | integer | Must equal `workspace.revision`. |
| `workspace` | `WorkspaceState` | The whole current workspace. See `workspaceStateSchema`. |
| `userText` | string | What the user said. 1–2,000 characters after trimming spaces. |

`workspace` is also checked for consistency: no duplicate IDs, and connections,
outline, selection, and current step must point at cards that exist.

Full example: [`samples/pip-turn-request.json`](samples/pip-turn-request.json).

### Success response: `200 OK`

| Field | Type | Meaning |
| --- | --- | --- |
| `requestId` | string | Same as the request. |
| `basedOnRevision` | integer | The revision Pip read. If the board has changed since, treat the reply as stale and don't apply its suggestions. |
| `replyText` | string | What Pip says. 1–1,000 characters. |
| `highlightedCardIds` | string[] | Existing cards Pip is talking about (up to 10). |
| `suggestedRequirements` | `{ suggestionId, text }[]` | Requirements Pip noticed. Currently always empty from Gemini. |
| `suggestedCards` | `{ suggestionId, text, kind }[]` | New card ideas (up to 5). Show them as suggestions; add to the board only if the user accepts. |
| `suggestedNextStep` | `{ suggestionId, text }` or `null` | One small next action. |
| `actions` | array (optional for older clients) | Up to 5 validated actions from `src/lib/pip-actions.ts`: add_idea, add_step, edit_card, connect_cards, complete_step, highlight_cards, set_goal, plot_function, show_equation. References must name existing cards. The browser assigns new resource IDs and applies these atomically. |
| `proposedActions` | array | Up to 5 of `{ type: "highlight", cardIds }`, `{ type: "move-aside", cardId }`, `{ type: "connect", fromCardId, toCardId }`. Every card ID is checked to exist. |

Full example (written from the demo fixtures, not a recorded Gemini reply):
[`samples/pip-turn-response.json`](samples/pip-turn-response.json).

### Errors

Every error has the same shape, and `message` is written to be shown to the user as is:

```json
{ "error": { "code": "invalid_request", "message": "Type a message for Pip first." } }
```

| Status | `code` | When | What the page should do |
| --- | --- | --- | --- |
| 400 | `invalid_request` | Body isn't JSON, a field breaks a rule, or the workspace points at missing cards | Show `message`, keep the user's text in the input |
| 413 | `invalid_request` | Body is over 512 KB | Show `message` |
| 429 | `rate_limited` | More than 8 turns in a minute from one client. `Retry-After` header says how many seconds to wait | Show `message`, let the user retry later |
| 502 | `ai_unavailable` | Gemini is down, slow (15 s timeout), or not configured on the server | Show `message`; the board is untouched |
| 502 | `invalid_ai_output` | Gemini's answer was malformed or pointed at cards that don't exist | Show `message`; nothing was applied |
| 405 | (no body) | Any method other than POST | Fix the calling code |

`stale_revision` is defined in the schema but the server never returns it. The page
detects stale replies itself by comparing `basedOnRevision` with the current revision.

Every POST response includes `RateLimit-Limit` and `RateLimit-Remaining` headers.

Messages for the most common user mistakes:

| Situation | Message |
| --- | --- |
| Empty message | Type a message for Pip first. |
| Message over 2,000 characters | Your message is too long. Keep it under 2,000 characters. |
| Notebook over 50,000 characters | Your notebook is too long for Pip to read. The limit is 50,000 characters. |
| Body over 512 KB | This project is too big to send to Pip. Try shortening your notebook. |

### Checking it

With the app running (`npm run dev`), run `npm run smoke:api`. It sends the sample
request, a large-but-valid request, and bad, empty, oversized, and inconsistent
requests, then checks each status, error code, and that no error message leaks
validator jargon. It makes 2 real Gemini calls when a key is configured. Without a
key, use `npm run smoke:api -- --allow-ai-unavailable` to permit only
`ai_unavailable` for those two requests. The default requires real, schema-valid
replies matching the request ID, revision, and existing cards. Malformed replies
and `invalid_ai_output` always fail, including in offline mode.

Run `npm run test:pip-actions` for action validation, atomic commits, stale calls,
Undo, replay protection and save/reload. `processedPipActionIds` is an optional
workspace field for compatibility with existing saves; it retains handled call
IDs through Undo. After 2,000 action batches the app rejects new Pip mutations
instead of evicting replay protection. Manual changes remain available.

Run `npm run test:api` for local regression checks of interrupted/oversized bodies
and the smoke test's success and failure detection; no Gemini key is needed.

## Math actions and saved visuals

`plot_function` requires `expression`, `xMin`, and `xMax`. `show_equation` requires
`expression`. They are additions with app-assigned IDs; manual controls edit,
move and remove visuals. The optional `workspace.mathItems` array stores up to 12
items with `id`, `kind` (`graph` or `equation`), `expression`, `xMin`, `xMax`, and
`position`. Validation rejects unsupported expressions; a bad action rejects the
whole batch. Math items do not masquerade as card IDs or earn idea coins.

Pip receives existing math items and approximate sampled zeros through the same
context builder used for voice and text. See `math.md` for notation and limits.
