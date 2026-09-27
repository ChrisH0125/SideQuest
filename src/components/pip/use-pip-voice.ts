"use client";

import { useEffect, useRef, useState } from "react";
import type Vapi from "@vapi-ai/web";
import { z } from "zod";
import type { WorkspaceState } from "@/lib/contracts";
import type { WorkspaceCommand } from "@/lib/workspace-reducer";
import type { CommandReceipt } from "@/components/board/workspace-provider";
import { parseVoiceActions, pipVoiceTools, voiceWorkspaceContext } from "@/lib/pip-voice-tools";
import { isOptionalVoiceError, voiceError } from "@/lib/pip-voice-errors";
import { parseVapiAssistantId } from "@/lib/pip-voice-config";

const transcriptSchema = z.object({
  type: z.literal("transcript"),
  role: z.enum(["user", "assistant"]),
  transcriptType: z.enum(["partial", "final"]),
  transcript: z.string().min(1).max(10000),
});
type VoiceState = "idle" | "starting" | "listening" | "speaking" | "stopping";

export function usePipVoice(workspace: WorkspaceState, runCommand: (command: WorkspaceCommand) => CommandReceipt, getWorkspace: () => WorkspaceState) {
  const [state, setState] = useState<VoiceState>("idle");
  const [muted, setMuted] = useState(false);
  const [caption, setCaption] = useState("");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [micHeard, setMicHeard] = useState(false);
  const client = useRef<Vapi | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  const latest = useRef({ runCommand, getWorkspace });
  latest.current = { runCommand, getWorkspace };
  const active = useRef(false);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const available = Boolean(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY && process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID);

  function clearWatchdog() {
    if (watchdog.current) clearTimeout(watchdog.current);
    watchdog.current = null;
  }
  async function dispose(instance: Vapi) {
    try { await instance.stop(); } catch { /* cleanup is best effort */ }
    instance.removeAllListeners();
    // EventEmitter requires an error listener even during late SDK teardown.
    instance.on("error", () => {});
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      clearWatchdog();
      if (client.current) void dispose(client.current);
    };
  }, []);

  useEffect(() => {
    if (!active.current) return;
    const timer = setTimeout(() => {
      try {
        client.current?.send({ type: "add-message", message: { role: "system", content: voiceWorkspaceContext(latest.current.getWorkspace()) }, triggerResponseEnabled: false });
      } catch { /* a call may end between render and this update */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [workspace]);

  async function start() {
    if (busy.current || !available) return;
    const assistantId = parseVapiAssistantId(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID);
    if (!assistantId) {
      setError("Pip's voice setup needs attention: the assistant ID is invalid. You can keep typing here.");
      return;
    }
    busy.current = true;
    const attempt = ++generation.current;
    const sessionId = crypto.randomUUID();
    const isCurrent = () => mounted.current && generation.current === attempt;
    setState("starting"); setError(""); setActionError(""); setCaption(""); setTranscript(""); setMicHeard(false); setMuted(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("microphone-unavailable");
      // Request permission before creating a billed call. Release probe tracks.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      if (!isCurrent()) return;
      const { default: VapiClient } = await import("@vapi-ai/web");
      if (!isCurrent()) return;
      const instance = new VapiClient(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY!.trim());
      client.current = instance;
      let callId: string | undefined;
      let endedReason: string | undefined;
      const fail = (issue: unknown) => {
        if (!isCurrent()) return;
        clearWatchdog();
        active.current = false;
        setError(voiceError(issue, callId)); setState("idle");
        generation.current += 1;
        const failedGeneration = generation.current;
        void dispose(instance).finally(() => {
          if (mounted.current && generation.current === failedGeneration) {
            if (client.current === instance) client.current = null;
            busy.current = false;
          }
        });
      };
      instance.on("call-start-progress", progress => {
        if (!isCurrent()) return;
        if (typeof progress.metadata?.callId === "string") callId = progress.metadata.callId;
      });
      instance.on("call-start", () => {
        if (!isCurrent()) { void dispose(instance); return; }
        clearWatchdog();
        active.current = true;
        setState("listening");
        try {
          instance.send({ type: "add-message", message: { role: "system", content: voiceWorkspaceContext(latest.current.getWorkspace()) }, triggerResponseEnabled: false });
        } catch { setActionError("Pip could not receive your workspace. Reconnect before asking for a board change."); }
      });
      instance.on("call-end", () => {
        if (!isCurrent()) return;
        clearWatchdog();
        if (!active.current || (endedReason && /error|failed|not.receive|exceeded/.test(endedReason))) setError(voiceError(endedReason, callId));
        generation.current += 1;
        active.current = false; busy.current = false; setState("idle");
      });
      instance.on("speech-start", () => { if (isCurrent()) setState("speaking"); });
      instance.on("speech-end", () => { if (isCurrent()) setState("listening"); });
      instance.on("local-volume-level", level => { if (isCurrent() && level > 0.02) setMicHeard(true); });
      instance.on("message", (message: unknown) => {
        if (!isCurrent()) return;
        if (message && typeof message === "object" && "type" in message && message.type === "status-update" && "status" in message && message.status === "ended" && "endedReason" in message) {
          if (typeof message.endedReason === "string" && /error|failed|not.receive|exceeded/.test(message.endedReason)) {
            endedReason = message.endedReason;
            setError(voiceError(endedReason, callId));
          }
        }
        const tools = parseVoiceActions(message, sessionId, () => crypto.randomUUID());
        if (tools.kind !== "ignored") {
          if (!active.current) return;
          if (tools.kind === "invalid") { setActionError(tools.reason); return; }
          for (const call of tools.calls) {
            const result = "batch" in call ? latest.current.runCommand({ type: "apply-pip-actions", batch: call.batch }) : { ok: false as const, reason: call.reason };
            setActionError(result.ok ? "" : result.reason);
            // Client tools have no native result channel. Inject an honest receipt and
            // freshly committed context; do not spoof a server tool acknowledgement.
            try {
              instance.send({ type: "add-message", message: { role: "system", content:
                "APP_ACTION_RECEIPT\n" + JSON.stringify({ callId: call.callId, status: result.ok ? result.duplicate ? "duplicate" : "applied" : "rejected", ...(!result.ok ? { reason: result.reason } : {}) }) +
                "\n" + voiceWorkspaceContext(latest.current.getWorkspace()),
              }, triggerResponseEnabled: false });
            } catch { setActionError("The board result is shown below, but Pip could not receive the update. End the call and reconnect before trying another action."); }
          }
          return;
        }
        const parsed = transcriptSchema.safeParse(message);
        if (!parsed.success) return;
        const turn = parsed.data;
        setCaption((turn.role === "user" ? "You: " : "Pip: ") + turn.transcript);
        if (turn.role === "user" && turn.transcriptType === "final") {
          setTranscript(previous => ((previous ? previous + " " : "") + turn.transcript).slice(-2000));
        }
      });
      instance.on("error", issue => { if (!isOptionalVoiceError(issue)) fail(issue); });
      instance.on("call-start-failed", fail);
      watchdog.current = setTimeout(() => fail(new Error("connection-timeout")), 30_000);
      const call = await instance.start(assistantId, {
        firstMessage: "Hi, I’m Pip. What part of your task would you like to untangle?",
        "tools:append": pipVoiceTools,
      });
      if (!isCurrent()) { await dispose(instance); return; }
      if (!call) fail(null);
    } catch (issue) {
      if (isCurrent()) {
        clearWatchdog(); active.current = false;
        setState("idle"); setError(voiceError(issue));
        if (client.current) await dispose(client.current);
        busy.current = false;
      }
    }
  }

  async function stop() {
    generation.current += 1;
    clearWatchdog(); active.current = false;
    setState("stopping");
    if (client.current) await dispose(client.current);
    client.current = null; busy.current = false;
    if (mounted.current) { setState("idle"); setMuted(false); }
  }
  function toggleMuted() {
    const next = !muted;
    client.current?.setMuted(next);
    setMuted(next);
  }
  return { state, available, muted, caption, transcript: transcript.slice(-2000), error, actionError, micHeard, start, stop, toggleMuted, clearTranscript: () => setTranscript("") };
}
