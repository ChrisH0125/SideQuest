"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useWorkspace } from "@/components/board/workspace-provider";
import { nextIdeaPosition } from "@/lib/math-items";
import { apiErrorSchema, pipTurnRequestSchema, pipTurnResponseForRequestSchema } from "@/lib/schemas";
import { Pip } from "./Pip";
import { usePipVoice } from "./use-pip-voice";
import styles from "@/components/board/workspace.module.css";
import type { PipOrigin } from "@/components/room/RoomHub";

export function PipCompanion({ canvasMode, expanded, onExpandedChange, origin, preferredMode }: {
  canvasMode: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  origin: PipOrigin;
  preferredMode: "voice" | "text";
}) {
  const { workspace, runCommand, getWorkspace, pipActionStatus, canUndo, undo } = useWorkspace();
  const voice = usePipVoice(workspace, runCommand, getWorkspace);
  const [mode, setMode] = useState(preferredMode);
  useEffect(() => setMode(preferredMode), [preferredMode, expanded]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const sprite = useRef<HTMLButtonElement>(null);
  const lastReply = workspace.conversation.findLast(turn => turn.role === "pip")?.text;
  const suggestion = workspace.pending.cards[0];
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!canvasMode || !origin || !sprite.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = sprite.current.getBoundingClientRect();
    const dx = origin.x - target.x, dy = origin.y - target.y;
    const animation = sprite.current.animate([
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: `translate(${dx / 2}px, ${Math.min(dy / 2, -140)}px) rotate(-8deg)`, offset: 0.5 },
      { transform: "translate(0, 0) rotate(0)" },
    ], { duration: 650, easing: "ease-in-out" });
    return () => animation.cancel();
  }, [canvasMode, origin]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (controller.current || !text.trim()) return;
    const request = pipTurnRequestSchema.safeParse({ requestId: crypto.randomUUID(), revision: workspace.revision, workspace, userText: text });
    if (!request.success) { setStatus("Keep your message under 2,000 characters."); return; }
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 35_000);
    setSending(true); setStatus("Pip is thinking…");
    try {
      const response = await fetch("/api/pip/turn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request.data), signal: abort.signal });
      const body: unknown = await response.json();
      if (!response.ok) {
        const error = apiErrorSchema.safeParse(body);
        throw new Error(error.success ? error.data.error.message : "Pip couldn’t answer. Your message is still here.");
      }
      const checked = pipTurnResponseForRequestSchema(request.data).safeParse(body);
      if (!checked.success) throw new Error("Pip’s response didn’t match your request. Nothing changed.");
      if (!mounted.current) return;
      const result = runCommand({ type: "apply-pip-turn", userText: request.data.userText, response: checked.data, resourceIds: checked.data.actions?.map(() => crypto.randomUUID()) });
      if (!result.ok) throw new Error(result.reason + " Your message is here; send it again with the updated board.");
      setText(""); setStatus(checked.data.actions?.length ? "Board updated. You can edit the cards or undo the change." : "Reply ready.");
    } catch (error) {
      if (mounted.current) setStatus(abort.signal.aborted ? "The request timed out. Your message is still here; try again." : error instanceof Error ? error.message : "Pip couldn’t answer. Try again.");
    } finally {
      clearTimeout(timer);
      controller.current = null;
      if (mounted.current) setSending(false);
    }
  }

  const live = voice.state === "listening" || voice.state === "speaking";
  const label = voice.state === "speaking" ? "Pip is speaking" : live ? voice.muted ? "Microphone muted" : "Listening to you" : voice.state === "starting" ? "Connecting…" : "Your study companion";
  return <aside className={styles.companion} aria-label="Pip companion" hidden={!canvasMode && !expanded} data-expanded={expanded} data-canvas={canvasMode}>
    <button ref={sprite} type="button" className={styles.pipLauncher} aria-expanded={expanded} aria-controls="pip-panel" onClick={() => onExpandedChange(!expanded)}>
      <span className={voice.state === "speaking" ? styles.speaking : ""}><Pip size={80} /></span>
      <span className={styles.pipInvitation}>{live ? label : "Pip’s here. Talk or type."}</span>
    </button>
    <div id="pip-panel" className={styles.pipPanel} hidden={!expanded}>
    <div className={styles.pipHeading}>
      <div><h2>Pip</h2><p role="status">{label}</p></div>
      <button type="button" aria-label="Minimize Pip" onClick={() => { onExpandedChange(false); requestAnimationFrame(() => canvasMode ? sprite.current?.focus() : document.querySelector<HTMLButtonElement>(".pip-hit")?.focus()); }}>−</button>
    </div>
    <div className={styles.bubble}>{lastReply ?? "You don’t need the whole answer yet. What’s one thought you want to start with?"}</div>
    <div className={styles.actions} aria-label="Talk or type"><button type="button" aria-pressed={mode === "voice"} onClick={() => setMode("voice")}>Speak</button><button type="button" aria-pressed={mode === "text"} onClick={() => setMode("text")}>Type</button></div>
    <div hidden={mode !== "voice"}>
    <div className={styles.voiceControls}>
      {voice.state === "idle" ? <button id="pip-voice-start" type="button" className={styles.primary} disabled={!voice.available} onClick={() => void voice.start()}>Talk to Pip</button> :
        <button type="button" className={styles.primary} disabled={voice.state === "stopping"} onClick={() => void voice.stop()}>{voice.state === "stopping" ? "Stopping…" : "End call"}</button>}
      {live && <button type="button" aria-pressed={voice.muted} onClick={voice.toggleMuted}>{voice.muted ? "Unmute" : "Mute"}</button>}
    </div>
    <p className={styles.hint}>{voice.available ? live ? voice.micHeard ? "Microphone audio detected on this device." : "Speak a few words to check your microphone." : "Voice uses your microphone. You can keep working during a call." : "Voice isn’t configured here yet. You can type below."}</p>
    {voice.caption && <p className={styles.caption} aria-live="polite">{voice.caption}</p>}
    {voice.error && <p role="alert" className={styles.message}>{voice.error}</p>}
    {voice.transcript && <button type="button" onClick={() => { setText(voice.transcript); voice.clearTranscript(); setMode("text"); }}>Review captured words</button>}
    <p className={styles.hint}>Say “capture this idea” or ask Pip to change a card. Successful changes appear below. Review captured words only if you need a typed retry.</p>
    {voice.actionError && <p className={styles.message} role="alert">{voice.actionError}</p>}
    </div>
    <form hidden={mode !== "text"} className={styles.composer} onSubmit={submit}>
      <label htmlFor="pip-message">Or write a thought</label>
      <textarea id="pip-message" value={text} onChange={event => setText(event.target.value)} maxLength={2000} rows={3} disabled={sending} placeholder="I’m thinking about…" />
      <div className={styles.actions}>
        {voice.transcript && <button type="button" disabled={sending} onClick={() => { setText(voice.transcript); voice.clearTranscript(); document.getElementById("pip-message")?.focus(); }}>Use transcript</button>}
        <button type="submit" disabled={sending || !text.trim()}>{sending ? "Thinking…" : "Ask Pip"}</button>
      </div>
      <p className={styles.message} role="status">{status}</p>
    </form>
    {pipActionStatus && <section className={styles.suggestion} aria-label="Pip board activity">
      <p role="status">{pipActionStatus}</p>
      <button type="button" disabled={!canUndo} onClick={undo}>Undo last board change</button>
    </section>}
    {suggestion && <section className={styles.suggestion} aria-label="Suggested idea">
      <h3>A possible next card</h3>
      <p>{suggestion.text}</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => {
          const result = runCommand({ type: "accept-card", suggestionId: suggestion.suggestionId, cardId: suggestion.suggestionId, position: nextIdeaPosition(workspace) });
          setStatus(result.ok ? "Added to your board." : result.reason);
        }}>Add to board</button>
        <button type="button" onClick={() => runCommand({ type: "dismiss-card", suggestionId: suggestion.suggestionId })}>Skip</button>
      </div>
      {workspace.pending.cards.length > 1 && <p className={styles.hint}>{workspace.pending.cards.length - 1} more to review</p>}
    </section>}
    {!suggestion && workspace.pending.nextStep && <p className={styles.suggestion}>One small step: {workspace.pending.nextStep.text}</p>}
    </div>
  </aside>;
}
