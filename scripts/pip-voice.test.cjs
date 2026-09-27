require("./register-typescript.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { isOptionalVoiceError, voiceError } = require("../src/lib/pip-voice-errors.ts");
const { parseVapiAssistantId } = require("../src/lib/pip-voice-config.ts");

test('assistant configuration accepts UUIDs and extracts IDs from Vapi dashboard links', () => {
  const id = 'dd9caa08-70ae-4420-8c63-9a86b8df99cb';
  assert.equal(parseVapiAssistantId(` ${id}\n`), id);
  assert.equal(parseVapiAssistantId(`https://dashboard.vapi.ai/assistants/${id}?tab=assistant`), id);
  for (const value of [undefined, '', 'not-an-id', `https://example.com/assistants/${id}`, 'https://dashboard.vapi.ai/assistants/invalid']) {
    assert.equal(parseVapiAssistantId(value), null);
  }
});

test("optional SDK audio enhancements do not terminate the call", () => {
  for (const type of ["audio-observer-setup-error", "audio-processing-setup-error", "video-recording-setup-error"]) {
    assert.equal(isOptionalVoiceError({ type, error: { message: "Unsupported browser feature" } }), true);
  }
  for (const type of ["daily-error", "daily-call-join-error", "start-method-error", "audio-processor-recovery-error"]) {
    assert.equal(isOptionalVoiceError({ type }), false);
  }
  assert.equal(isOptionalVoiceError(null), false);
});

test("SDK-wrapped and serialized failures retain actionable categories", () => {
  assert.match(voiceError({ type: "daily-call-join-error", error: { name: "NotAllowedError" } }), /Allow microphone/);
  assert.match(voiceError({ error: JSON.stringify({ status: 403, error: { message: "Forbidden" } }) }), /rejected access/);
  assert.match(voiceError({ error: { statusCode: 400, message: "Bad Request" } }), /configuration/);
  assert.match(voiceError("pipeline-error-eleven-labs-voice-failed"), /provider could not start/);
  assert.match(voiceError(new Error("connection-timeout")), /connection could not be established/);
});

test("diagnostics expose only a validated call reference, never raw provider content", () => {
  const id = "01a0e338-a538-7cce-9231-936affba5111";
  assert.match(voiceError({ message: "secret-token private workspace" }, id), new RegExp(id));
  assert.doesNotMatch(voiceError({ message: "secret-token private workspace" }, "not-a-call-id"), /secret-token|private workspace|not-a-call-id/);
  const circular = {}; circular.error = circular;
  assert.match(voiceError(circular), /unexpectedly/);
});

// Exercise the real hook with SDK events, without opening a microphone or call.
async function runVoiceScenario(events) {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const ts = require('typescript');
  const { EventEmitter } = require('node:events');
  const states = [];
  let stops = 0;
  class FakeVapi extends EventEmitter {
    async start() {
      assert.equal(arguments[0], 'dd9caa08-70ae-4420-8c63-9a86b8df99cb');
      for (const [name, data] of events) this.emit(name, data);
      return { id: '01a0e338-a538-7cce-9231-936affba5111' };
    }
    async stop() { stops++; }
    send() {}
  }
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(require.resolve('../src/components/pip/use-pip-voice.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    exports: module.exports, module,
    require: name => {
      if (name === 'react') return {
        useState: initial => { const i = states.push(initial) - 1; return [initial, value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
        useRef: current => ({ current }), useEffect: () => {},
      };
      if (name === '@vapi-ai/web') return FakeVapi;
      if (name === '@/lib/pip-voice-tools') return { parseVoiceActions: () => ({ kind: 'ignored' }), pipVoiceTools: [], voiceWorkspaceContext: () => 'workspace' };
      if (name === '@/lib/pip-voice-errors') return { isOptionalVoiceError, voiceError };
      if (name === '@/lib/pip-voice-config') return { parseVapiAssistantId };
      return require(name);
    },
    process: { env: { NEXT_PUBLIC_VAPI_PUBLIC_KEY: 'test-public-key', NEXT_PUBLIC_VAPI_ASSISTANT_ID: 'https://dashboard.vapi.ai/assistants/dd9caa08-70ae-4420-8c63-9a86b8df99cb' } },
    navigator: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } },
    crypto: require('node:crypto').webcrypto, setTimeout, clearTimeout,
  });
  const voice = module.exports.usePipVoice({}, () => {}, () => ({}));
  await voice.start();
  const result = { state: states[0], error: states[4], stops };
  await voice.stop();
  return result;
}

test('a real hook startup survives optional processing failures and reaches listening', async () => {
  const result = await runVoiceScenario([
    ['error', { type: 'audio-processing-setup-error', error: { message: 'Not supported' } }],
    ['call-start'],
  ]);
  assert.equal(result.state, 'listening');
  assert.equal(result.error, '');
  assert.equal(result.stops, 0);
});

test('a fatal SDK startup failure stops the session and preserves the useful error', async () => {
  const result = await runVoiceScenario([
    ['call-start-failed', { error: { name: 'NotAllowedError' } }],
    ['error', { type: 'start-method-error', error: { name: 'NotAllowedError' } }],
  ]);
  assert.equal(result.state, 'idle');
  assert.match(result.error, /Allow microphone/);
  assert(result.stops > 0);
});
