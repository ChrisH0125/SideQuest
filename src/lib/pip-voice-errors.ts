// The SDK emits these optional failures on the same channel as fatal errors.
// Its own implementation continues the call without these enhancements.
export function isOptionalVoiceError(issue: unknown): boolean {
  if (!issue || typeof issue !== "object" || !("type" in issue)) return false;
  return ["audio-observer-setup-error", "audio-processing-setup-error", "video-recording-setup-error"].includes(String(issue.type));
}

function errorDetails(issue: unknown, depth = 0): string {
  if (depth > 5 || issue == null) return "";
  if (typeof issue === "string") {
    try { return errorDetails(JSON.parse(issue), depth + 1); } catch { return issue.slice(0, 4000); }
  }
  if (typeof issue !== "object") return String(issue);
  const record = issue as Record<string, unknown>;
  return ["name", "message", "error", "errorMsg", "type", "status", "statusCode", "reason", "endedReason", "data", "response"]
    .map(key => errorDetails(record[key], depth + 1)).join(" ");
}

export function voiceError(issue: unknown, callId?: string): string {
  const details = errorDetails(issue).toLowerCase();
  let message: string;
  if (/notallowederror|permission.denied|permissions.blocked/.test(details)) {
    message = "Allow microphone access for this site in your browser and system settings, then try again.";
  } else if (/notfounderror|devices.not.found/.test(details)) {
    message = "No microphone was found. Connect one and try again.";
  } else if (/notreadableerror|could.not.start.audio/.test(details)) {
    message = "The microphone is busy. Close other recording apps, then try again.";
  } else if (/microphone-unavailable/.test(details)) {
    message = "Microphone access is unavailable. Open SideQuest in a browser over HTTPS.";
  } else if (/401|403|unauthorized|forbidden|invalid.*key|allowed.*origin|allowed.*domain/.test(details)) {
    message = "Vapi rejected access. Check the public key's allowed domains and assistant settings.";
  } else if (/402|429|credits|quota|concurren|rate.limit/.test(details)) {
    message = "Vapi or a voice provider has reached an account limit. Check credits and active calls before retrying.";
  } else if (/400|validation|voice.not.found|invalid.voice/.test(details)) {
    message = "Vapi rejected the call configuration. Check the published assistant's voice and model settings.";
  } else if (/pipeline|provider|voice.failed|llm.failed|transcriber.failed/.test(details)) {
    message = "Pip's voice provider could not start. Check the Vapi call log for the provider error.";
  } else if (/fetch|network|connection|meeting|timeout|timed.out/.test(details)) {
    message = "The voice connection could not be established. Retry, or compare another network if it keeps failing.";
  } else {
    message = "Pip's call ended unexpectedly. Retry and check the Vapi call log if it happens again.";
  }
  // Never surface raw provider responses, credentials, or workspace contents.
  const reference = callId && /^[0-9a-f-]{36}$/i.test(callId) ? ` Call ID: ${callId}.` : "";
  return message + reference + " You can keep typing here.";
}
