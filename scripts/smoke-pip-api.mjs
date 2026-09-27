// Smoke test for POST /api/pip/turn against a running server.
// Usage: start the app (npm run dev), then run: npm run smoke:api
// Sends 7 POST requests; the limit is 8 per minute per client, so wait a minute between runs.
// With a Gemini key in .env.local, 2 of them are real Gemini calls.
import { readFile } from "node:fs/promises";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const URL_PATH = `${BASE_URL}/api/pip/turn`;
const sample = JSON.parse(await readFile(new URL("../docs/samples/pip-turn-request.json", import.meta.url), "utf8"));

const withText = (userText) => ({ ...sample, userText });
const cases = [
  { name: "valid sample request", body: sample, expect: [200, 502] },
  {
    name: "valid request with a large notebook (49,000 characters)",
    body: { ...sample, workspace: { ...sample.workspace, notebookText: "My neighborhood. ".repeat(2882) } },
    expect: [200, 502],
  },
  { name: "not JSON", raw: "hello pip", expect: [400], code: "invalid_request" },
  { name: "empty message", body: withText(""), expect: [400], code: "invalid_request" },
  { name: "message too long (2,001 characters)", body: withText("a".repeat(2001)), expect: [400], code: "invalid_request" },
  {
    name: "request over the size limit (600 KB)",
    raw: JSON.stringify(withText("x".repeat(600 * 1024))),
    expect: [413],
    code: "invalid_request",
  },
  {
    name: "connection to a card that doesn't exist",
    body: {
      ...sample,
      workspace: { ...sample.workspace, connections: [{ id: "c1", fromCardId: "card-gardens", toCardId: "card-missing" }] },
    },
    expect: [400],
    code: "invalid_request",
  },
  { name: "wrong method (GET)", method: "GET", expect: [405] },
];

// Signs of a raw validator message leaking through, like "expected string to have >=1 characters".
const jargon = /expected|invalid_type|>=|<=|zod/i;
let failures = 0;

for (const test of cases) {
  const method = test.method ?? "POST";
  const response = await fetch(URL_PATH, {
    method,
    headers: method === "POST" ? { "content-type": "application/json" } : {},
    body: method === "POST" ? (test.raw ?? JSON.stringify(test.body)) : undefined,
  });
  const json = await response.json().catch(() => null);
  const problems = [];

  if (response.status === 429) {
    console.log("STOP  Rate limit reached. Wait one minute and run again.");
    process.exit(1);
  }
  if (!test.expect.includes(response.status)) problems.push(`status ${response.status}, expected ${test.expect.join(" or ")}`);
  if (response.status !== 200 && method === "POST") {
    if (!json?.error?.code || !json?.error?.message) problems.push("error is missing code or message");
    if (test.code && json?.error?.code !== test.code) problems.push(`code ${json?.error?.code}, expected ${test.code}`);
    if (jargon.test(json?.error?.message ?? "")) problems.push("message contains developer jargon");
  }

  const summary =
    response.status === 200
      ? `Pip said: ${json?.replyText}`
      : (json?.error ? `${json.error.code}: ${json.error.message}` : `HTTP ${response.status}`);
  console.log(`${problems.length ? "FAIL" : "PASS"}  ${test.name} -> ${summary}`);
  for (const problem of problems) console.log(`        ${problem}`);
  failures += problems.length ? 1 : 0;
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
