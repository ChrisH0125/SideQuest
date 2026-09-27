"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import type { WorkspaceState } from "@/lib/contracts";
import { Pip } from "@/components/pip/Pip";
import { IdeaBoard } from "@/components/board/idea-board";
import { useWorkspace } from "@/components/board/workspace-provider";
import { pipTurnResponseSchema } from "@/lib/schemas";
import { DECORATIONS, type DecorationId } from "@/lib/rewards";
import styles from "./modals.module.css";

export type ModalTarget =
  | "notebook"
  | "board"
  | "mic"
  | "pip"
  | "shop"
  | null;

type ModalHostProps = {
  open: ModalTarget;
  onClose: () => void;
  pipLine: string;
};

export function ModalHost({
  open,
  onClose,
  pipLine,
}: ModalHostProps) {
  const { workspace, runCommand } = useWorkspace();
  if (open === null) return null;
  return (
    <ModalFrame
      title={modalTitle(open, workspace)}
      onClose={onClose}
      footer={<FooterCloseButton onClose={onClose} />}
      wide={open === "board"}
    >
      {open === "notebook" && (
        <NotebookModal
          text={workspace.notebookText}
          onChange={(text) => runCommand({ type: "update-notebook", text })}
          workspace={workspace}
        />
      )}
      {open === "board" && <BoardModal />}
      {open === "mic" && <MicModal workspace={workspace} pipLine={pipLine} />}
      {open === "pip" && <PipModal />}
      {open === "shop" && <ShopModal />}
    </ModalFrame>
  );
}

function modalTitle(target: Exclude<ModalTarget, null>, workspace: WorkspaceState) {
  switch (target) {
    case "notebook":
      return "NOTEBOOK — PG 1";
    case "board":
      return "BOARD — IDEAS";
    case "mic":
      return "TAPE RECORDER — TALK TO PIP";
    case "pip":
      return "PIP";
    case "shop":
      return `SHOP — ${workspace.coins} COINS`;
  }
}

// ---------------- Shell ----------------

type ModalFrameProps = {
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
};

function ModalFrame({ title, onClose, footer, wide = false, children }: ModalFrameProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const room = document.getElementById("room-scene");
    const roomWasInert = room?.inert ?? false;
    document.body.style.overflow = "hidden";
    if (room) room.inert = true;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = windowRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    const preferred = windowRef.current?.querySelector<HTMLElement>("[data-autofocus]");
    (preferred ?? closeRef.current)?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      if (room) room.inert = roomWasInert;
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <div ref={windowRef} className={`${styles.window} ${wide ? styles.windowWide : ""}`}>
        <div className={styles.titlebar}>
          <div id={titleId} className={styles.title}>{title}</div>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}

function FooterCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <>
      <span />
      <button type="button" className={styles.btn} onClick={onClose}>
        Back to room
      </button>
    </>
  );
}

// ---------------- Notebook (fully working, with assignment + reqs at top) ----------------

type NotebookModalProps = {
  text: string;
  onChange: (next: string) => void;
  workspace: WorkspaceState;
};

function NotebookModal({ text, onChange, workspace }: NotebookModalProps) {
  const { runCommand } = useWorkspace();
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const words = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
  const doneCount = workspace.requirements.filter((r) => r.checked).length;
  const pendingReq = workspace.pending.requirements[0];

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
    setToastVisible(true);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 900);
  };

  return (
    <>
      <div className={styles.assignBlock}>
        <h3>ASSIGNMENT</h3>
        <p>{workspace.assignment}</p>
        <div className={styles.reqInline}>
          {workspace.requirements.map((req) => (
            <span key={req.id} className={styles.reqInlineItem}>
              <span className={styles.reqBoxSmall} aria-hidden>{req.checked ? "✓" : ""}</span>
              {req.text}
            </span>
          ))}
        </div>
        {pendingReq && (
          <div className={styles.reqPendingRow}>
            <div className={styles.reqPendingLabel}>PIP SUGGESTS</div>
            {pendingReq.text}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className={styles.btn}
                onClick={() => runCommand({
                  type: "accept-requirement",
                  suggestionId: pendingReq.suggestionId,
                  requirementId: `requirement-${crypto.randomUUID()}`,
                })}
              >
                ✓ Add to list
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.secondary}`}
                onClick={() => runCommand({
                  type: "dismiss-requirement",
                  suggestionId: pendingReq.suggestionId,
                })}
              >
                ✗ Skip
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.nbToolbar}>
        <div className={styles.reqSummary}>
          <b>{doneCount} / {workspace.requirements.length}</b> requirements ·
          Rev {workspace.revision}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={styles.nbWordCount}>
            {words} {words === 1 ? "word" : "words"}
          </span>
          <span className={`${styles.nbToast} ${toastVisible ? styles.nbToastVisible : ""}`}>
            Saved locally
          </span>
        </div>
      </div>
      <div className={styles.nbPage}>
        <textarea
          ref={textareaRef}
          data-autofocus
          className={styles.nbTextarea}
          value={text}
          onChange={handleChange}
          placeholder="Start writing your draft. Type freely — Pip watches from the room."
        />
      </div>
      <div className={styles.note}>
        Text is saved with this workspace in your browser, so you can leave and
        come back without losing the draft.
      </div>
    </>
  );
}

// ---------------- Board ----------------

function BoardModal() {
  return <IdeaBoard embedded />;
}

// ---------------- Mic ----------------

function MicModal({ workspace, pipLine }: { workspace: WorkspaceState; pipLine: string }) {
  const { runCommand } = useWorkspace();
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const hasPipTurn = workspace.conversation.some(({ role }) => role === "pip");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userText = text.trim();
    if (!userText || sending) return;

    setSending(true);
    setStatus("Pip is thinking…");
    try {
      const response = await fetch("/api/pip/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: `pip-${crypto.randomUUID()}`,
          revision: workspace.revision,
          workspace,
          userText,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null && "error" in body &&
          typeof body.error === "object" && body.error !== null && "message" in body.error &&
          typeof body.error.message === "string"
            ? body.error.message
            : "Pip could not answer right now. Try again.";
        throw new Error(message);
      }

      const parsed = pipTurnResponseSchema.safeParse(body);
      if (!parsed.success) throw new Error("Pip returned an answer the board could not read.");
      runCommand({ type: "apply-pip-turn", userText, response: parsed.data });
      setText("");
      setStatus("Pip added a reply to the conversation.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Pip could not answer right now.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className={styles.micConsole}>
        <form className={styles.micLeft} onSubmit={handleSubmit}>
          <div className={styles.bigRec} aria-hidden>REC</div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 12,
              letterSpacing: "1px",
            }}
          >
            HOLD TO TALK
          </div>
          <label htmlFor="pip-message" className={styles.micInputLabel}>Type an idea</label>
          <input
            id="pip-message"
            className={styles.micInput}
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={2000}
            placeholder="Type your idea and hit enter…"
            disabled={sending}
          />
          <button type="submit" className={styles.btn} disabled={sending || !text.trim()}>
            {sending ? "Sending…" : "Ask Pip"}
          </button>
          <p className={styles.micStatus} role="status" aria-live="polite">{status}</p>
        </form>
        <div className={styles.micRight} aria-label="Conversation">
          {workspace.conversation.map((turn, i) => (
            <div
              key={i}
              className={`${styles.chatTurn} ${turn.role === "pip" ? styles.pip : styles.user}`}
            >
              <div className={styles.chatWho}>
                {turn.role === "pip" ? "PIP" : "YOU"}
              </div>
              {turn.text}
            </div>
          ))}
          {!hasPipTurn && pipLine && (
            <div className={`${styles.chatTurn} ${styles.pip}`}>
              <div className={styles.chatWho}>PIP</div>
              {pipLine}
            </div>
          )}
        </div>
      </div>
      <div className={styles.note}>
        <b>Demo fallback.</b> Type an idea when voice is unavailable. Your message
        and Pip&apos;s reply are saved with the workspace.
      </div>
    </>
  );
}

// ---------------- Pip customize (stub) ----------------

function PipModal() {
  return (
    <>
      <div className={styles.pipCustomize}>
        <div className={styles.pipFrame}>
          <Pip size={160} />
        </div>
        <div className={styles.pipOptions}>
          <div className={styles.pipOptionRow}>
            <div className={styles.pipOptionLabel}>BOW</div>
            <div className={styles.swatches}>
              <span className={`${styles.swatch} ${styles.chosen}`}>None</span>
              <span className={styles.swatch} style={{ background: "var(--pinky)" }}>Pink</span>
              <span className={styles.swatch} style={{ background: "var(--sky)" }}>Sky</span>
              <span className={styles.swatch} style={{ background: "var(--mint)" }}>Mint</span>
            </div>
          </div>
          <div className={styles.pipOptionRow}>
            <div className={styles.pipOptionLabel}>HAT</div>
            <div className={styles.swatches}>
              <span className={`${styles.swatch} ${styles.chosen}`}>None</span>
              <span className={styles.swatch} style={{ background: "var(--lilac)" }}>Wiz</span>
              <span className={styles.swatch} style={{ background: "var(--sun)" }}>Cap</span>
            </div>
          </div>
          <div className={styles.pipOptionRow}>
            <div className={styles.pipOptionLabel}>MOOD (reserved)</div>
            <div className={styles.swatches}>
              <span className={`${styles.swatch} ${styles.chosen}`}>Cozy</span>
              <span className={styles.swatch} style={{ background: "var(--tomato)", color: "var(--paper)" }}>
                Hype
              </span>
              <span className={styles.swatch} style={{ background: "var(--mint)" }}>Chill</span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.note}>
        <b>Coming after the MVP.</b> These swatches preview the planned accessory
        colors; customization is not interactive yet.
      </div>
    </>
  );
}

// ---------------- Shop ----------------

type ShopItem = {
  id: DecorationId;
  thumb: React.ReactNode;
};

const SHOP_ITEMS: ShopItem[] = [
  { id: "rug", thumb: <div className="item" style={{ width: 44, height: 14, background: "var(--tomato)" }} /> },
  { id: "plant", thumb: <div className="item" style={{ width: 22, height: 38, background: "var(--mint)", borderRadius: "50% 50% 4px 4px" }} /> },
  { id: "lamp", thumb: <div className="item" style={{ width: 24, height: 44, background: "var(--sun)" }} /> },
  { id: "poster", thumb: <div className="item" style={{ width: 44, height: 30, background: "var(--lilac)" }} /> },
  { id: "rainbow-rug", thumb: <div className="item" style={{ width: 40, height: 40, background: "repeating-linear-gradient(45deg,var(--pinky) 0 6px, var(--paper) 6px 12px)" }} /> },
  { id: "fish-bowl", thumb: <div className="item" style={{ width: 34, height: 34, background: "var(--sky)", borderRadius: "50%" }} /> },
];

function ShopModal() {
  const { workspace, runCommand } = useWorkspace();
  const [status, setStatus] = useState("");

  return (
    <>
      <div className={styles.shopGrid}>
        {SHOP_ITEMS.map((item) => {
          const decoration = DECORATIONS[item.id];
          const owned = workspace.ownedDecorations.includes(item.id);
          const affordable = workspace.coins >= decoration.cost;
          const needed = decoration.cost - workspace.coins;
          return (
            <div key={item.id} className={styles.shopTile}>
              <div className={styles.shopThumb}>{item.thumb}</div>
              <div className={styles.shopName}>{decoration.name}</div>
              <div className={styles.shopCost}>{decoration.cost} coins</div>
              <button
                type="button"
                className={styles.shopBuy}
                disabled={owned || !affordable}
                onClick={() => {
                  runCommand({ type: "buy-decoration", decorationId: item.id });
                  setStatus(`${decoration.name} added to your collection.`);
                }}
              >
                {owned ? "Owned" : affordable ? "Buy" : `Need ${needed} more`}
              </button>
            </div>
          );
        })}
      </div>
      <p className={styles.shopStatus} role="status" aria-live="polite">{status}</p>
      <div className={styles.note}>
        Purchases use your earned coins and are saved with this workspace.
      </div>
    </>
  );
}
