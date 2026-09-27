const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");
const path = require("node:path");
require("./register-typescript.cjs");
const { readJsonBody } = require("../src/lib/read-json-body.ts");
const sampleReply = require("../docs/samples/pip-turn-response.json");

function requestFor(body, headers) {
  return new Request("http://localhost/api/pip/turn", { method: "POST", body, headers, duplex: "half" });
}

test("JSON reader handles split UTF-8 and the exact byte limit", async () => {
  const bytes = new TextEncoder().encode('{"text":"🌻"}');
  const body = new ReadableStream({ start(c) {
    for (const byte of bytes) c.enqueue(Uint8Array.of(byte));
    c.close();
  } });
  assert.deepEqual(await readJsonBody(requestFor(body), bytes.length), { ok: true, value: { text: "🌻" } });
  assert.equal(body.locked, false);
});

test("JSON reader returns safe errors for invalid and interrupted bodies", async () => {
  assert.deepEqual(await readJsonBody(requestFor("not JSON"), 100), { ok: false, reason: "not_json" });
  const body = new ReadableStream({ start(c) { c.error(new Error("connection interrupted")); } });
  assert.deepEqual(await readJsonBody(requestFor(body), 100), { ok: false, reason: "not_json" });
  assert.equal(body.locked, false);
});

test("streamed size violations stay too_large even if cancellation fails", async () => {
  for (const contentLength of [undefined, "1"]) {
    let cancelled = false;
    const body = new ReadableStream({
      start(c) { c.enqueue(new Uint8Array(11)); },
      cancel() { cancelled = true; throw new Error("cancel failed"); },
    });
    const headers = contentLength ? { "content-length": contentLength } : {};
    assert.deepEqual(await readJsonBody(requestFor(body, headers), 10), { ok: false, reason: "too_large" });
    assert.equal(cancelled, true);
    assert.equal(body.locked, false);
  }
  assert.deepEqual(await readJsonBody(requestFor("{}", { "content-length": "11" }), 10), { ok: false, reason: "too_large" });
});

async function runSmoke(status, reply, offline = false) {
  let index = 0;
  const responses = [status, status, 400, 400, 400, 413, 400, 405];
  const server = http.createServer((req, res) => {
    req.resume();
    const current = index++;
    res.writeHead(responses[current], { "content-type": "application/json" });
    res.end(JSON.stringify(current < 2 ? reply : { error: { code: "invalid_request", message: "Check the request." } }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(__dirname, "smoke-pip-api.mjs"), ...(offline ? ["--allow-ai-unavailable"] : [])], {
        env: { ...process.env, BASE_URL: `http://127.0.0.1:${server.address().port}` },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", chunk => { output += chunk; });
      child.stderr.on("data", chunk => { output += chunk; });
      child.on("error", reject);
      child.on("exit", code => resolve({ code, output }));
    });
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

test("smoke CLI validates real responses and only explicitly permits offline errors", async () => {
  const unavailable = { error: { code: "ai_unavailable", message: "Pip is unavailable." } };
  const invalid = { error: { code: "invalid_ai_output", message: "Unreadable reply." } };
  const cases = [
    [200, sampleReply, false, 0],
    [502, unavailable, false, 1],
    [502, unavailable, true, 0],
    [502, invalid, true, 1],
    [200, {}, false, 1],
    [200, { ...sampleReply, requestId: "wrong-request" }, false, 1],
    [200, { ...sampleReply, basedOnRevision: 999 }, false, 1],
    [200, { ...sampleReply, highlightedCardIds: ["missing-card"] }, false, 1],
  ];
  for (const [status, reply, offline, expected] of cases) {
    const result = await runSmoke(status, reply, offline);
    assert.equal(result.code, expected, result.output);
  }
});
