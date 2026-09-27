const assistantIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseVapiAssistantId(value: string | undefined): string | null {
  const input = value?.trim();
  if (!input) return null;
  if (assistantIdPattern.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.hostname !== "dashboard.vapi.ai") return null;
    const match = /^\/assistants\/([^/]+)\/?$/.exec(url.pathname);
    return match && assistantIdPattern.test(match[1]) ? match[1] : null;
  } catch { return null; }
}
