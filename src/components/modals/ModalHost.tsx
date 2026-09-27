"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import type { WorkspaceState } from "@/lib/contracts";
import { IdeaBoard } from "@/components/board/idea-board";
import { useWorkspace } from "@/components/board/workspace-provider";
import { DECORATIONS, type DecorationId } from "@/lib/rewards";
import { downloadFile, notebookExport } from "@/lib/export";
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
      {open === "mic" && <p>Talk with Pip beside your canvas.</p>}
      {open === "pip" && <p>Pip is beside your canvas.</p>}
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
    const room = document.getElementById("workspace-content");
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
        Back to workspace
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
  const { runCommand, saveStatus } = useWorkspace();
  const [taskStatus, setTaskStatus] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const words = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
  const doneCount = workspace.requirements.filter((r) => r.checked).length;
  const pendingReq = workspace.pending.requirements[0];

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <>
      <div className={styles.assignBlock}>
        <h3>ASSIGNMENT</h3>
        <p>{workspace.assignment}</p>
        <details>
          <summary>Change assignment or task</summary>
          <form onSubmit={event => {
            event.preventDefault();
            const result = runCommand({ type: "update-assignment", text: String(new FormData(event.currentTarget).get("assignment")) });
            setTaskStatus(result.ok ? "Task updated. Your cards and draft are kept." : result.reason);
          }}>
            <label htmlFor="assignment-text">What are you working on?</label>
            <textarea key={workspace.assignment} id="assignment-text" name="assignment" defaultValue={workspace.assignment} rows={3} maxLength={5000} />
            <button type="submit" className={styles.btn}>Update task</button>
            <p role="status">{taskStatus}</p>
          </form>
        </details>
        <div className={styles.reqInline}>
          {workspace.requirements.map((req) => (
            <label key={req.id} className={styles.reqInlineItem}><input type="checkbox" checked={req.checked} onChange={event => runCommand({ type: "check-requirement", requirementId: req.id, checked: event.target.checked })} />{req.text}</label>
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
        <button type="button" className={styles.btn} onClick={() => downloadFile(notebookExport(workspace))}>Download draft</button>
        <div className={styles.reqSummary}>
          <b>{doneCount} / {workspace.requirements.length}</b> requirements ·
          Rev {workspace.revision}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={styles.nbWordCount}>
            {words} {words === 1 ? "word" : "words"}
          </span>
          <span className={styles.note} role="status">{saveStatus}</span>
        </div>
      </div>
      <div className={styles.nbPage}>
        <textarea
          ref={textareaRef}
          data-autofocus
          aria-label="Notebook draft"
          maxLength={50000}
          className={styles.nbTextarea}
          value={text}
          onChange={handleChange}
          placeholder="Start writing your draft. Type freely — Pip watches from the room."
        />
      </div>
      <div className={styles.note}>
        Saves stay in this browser. Check the save status above before leaving.
      </div>
    </>
  );
}

// ---------------- Board ----------------

function BoardModal() {
  return <IdeaBoard embedded />;
}

// ---------------- Shop ----------------

const SHOP_ITEMS = (Object.keys(DECORATIONS) as DecorationId[]).map(id => ({ id }));

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
              <div className={styles.shopName}>{decoration.name}</div>
              <div className={styles.shopCost}>{decoration.cost} coins</div>
              <button
                type="button"
                className={styles.shopBuy}
                aria-label={owned ? `${decoration.name} owned` : `Buy ${decoration.name}`}
                disabled={owned || !affordable}
                onClick={() => {
                  const result = runCommand({ type: "buy-decoration", decorationId: item.id });
                  setStatus(result.ok ? `${decoration.name} added to your collection.` : result.reason);
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
        Collect items with earned coins. Your collection is listed in the room; furniture placement is not available yet.
      </div>
    </>
  );
}
