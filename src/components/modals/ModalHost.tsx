"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkspaceState } from "@/lib/contracts";
import { Pip } from "@/components/pip/Pip";
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
  workspace: WorkspaceState;
  pipLine: string;
  notebookText: string;
  onNotebookChange: (next: string) => void;
};

export function ModalHost({
  open,
  onClose,
  workspace,
  pipLine,
  notebookText,
  onNotebookChange,
}: ModalHostProps) {
  if (open === null) return null;
  return (
    <ModalFrame
      title={modalTitle(open, workspace)}
      onClose={onClose}
      footer={<FooterCloseButton onClose={onClose} />}
    >
      {open === "notebook" && (
        <NotebookModal
          text={notebookText}
          onChange={onNotebookChange}
          workspace={workspace}
        />
      )}
      {open === "board" && <BoardModal workspace={workspace} />}
      {open === "mic" && <MicModal workspace={workspace} pipLine={pipLine} />}
      {open === "pip" && <PipModal />}
      {open === "shop" && <ShopModal workspace={workspace} />}
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
  children: React.ReactNode;
};

function ModalFrame({ title, onClose, footer, children }: ModalFrameProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKey);
      window.clearTimeout(focusTimer);
    };
  }, [onClose]);

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden />
      <div className={styles.window}>
        <div className={styles.titlebar}>
          <div className={styles.title}>{title}</div>
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
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const words = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
  const doneCount = workspace.requirements.filter((r) => r.checked).length;
  const pendingReq = workspace.pending.requirements[0];

  useEffect(() => {
    textareaRef.current?.focus();
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
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
              <span className={styles.reqBoxSmall} />
              {req.text}
            </span>
          ))}
        </div>
        {pendingReq && (
          <div className={styles.reqPendingRow}>
            <div className={styles.reqPendingLabel}>PIP SUGGESTS</div>
            {pendingReq.text}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" className={styles.btn}>✓ Add to list</button>
              <button type="button" className={`${styles.btn} ${styles.secondary}`}>✗ Skip</button>
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
          className={styles.nbTextarea}
          value={text}
          onChange={handleChange}
          placeholder="Start writing your draft. Type freely — Pip watches from the room."
        />
      </div>
      <div className={styles.note}>
        <b>Working preview.</b> Text is stored in this browser (localStorage) so
        you can leave and come back. When the real state layer lands it will save
        to the workspace instead.
      </div>
    </>
  );
}

// ---------------- Board (stub with representative content) ----------------

function BoardModal({ workspace }: { workspace: WorkspaceState }) {
  const ideas = workspace.cards.filter((c) => c.kind === "idea").slice(0, 2);
  const pending = workspace.pending.cards[0];
  return (
    <>
      <div className={styles.boardPreview}>
        {ideas[0] && (
          <div className={`${styles.bigCard} ${styles.bc1}`}>
            <span className={styles.bcKind}>IDEA</span>
            <div>{ideas[0].text}</div>
          </div>
        )}
        {ideas[0] && ideas[1] && <div className={styles.bcArrow} aria-hidden />}
        {ideas[1] && (
          <div className={`${styles.bigCard} ${styles.bc2}`}>
            <span className={styles.bcKind}>IDEA</span>
            <div>{ideas[1].text}</div>
          </div>
        )}
        {pending && (
          <div className={`${styles.bigCard} ${styles.bc3} ${styles.pending}`}>
            <span className={styles.bcKind}>PIP · IDEA</span>
            <div>{pending.text}</div>
          </div>
        )}
      </div>
      <div className={styles.note}>
        <b>Preview.</b> The real board is Chris&apos;s React Flow — drag, connect,
        move to aside pile. It wires in on top of this shell.
      </div>
    </>
  );
}

// ---------------- Mic (stub) ----------------

function MicModal({ workspace, pipLine }: { workspace: WorkspaceState; pipLine: string }) {
  return (
    <>
      <div className={styles.micConsole}>
        <div className={styles.micLeft}>
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
          <div style={{ fontSize: 11, opacity: 0.75, textAlign: "center" }}>
            or type below
          </div>
          <input
            className={styles.micInput}
            type="text"
            placeholder="Type your idea and hit enter…"
          />
        </div>
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
          {pipLine && (
            <div className={`${styles.chatTurn} ${styles.pip}`}>
              <div className={styles.chatWho}>PIP</div>
              {pipLine}
            </div>
          )}
        </div>
      </div>
      <div className={styles.note}>
        <b>Preview.</b> Voice uses the Web Speech API (wired later). Text input
        is here for the demo fallback.
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
              <button type="button" className={`${styles.swatch} ${styles.chosen}`}>None</button>
              <button type="button" className={styles.swatch} style={{ background: "var(--pinky)" }}>Pink</button>
              <button type="button" className={styles.swatch} style={{ background: "var(--sky)" }}>Sky</button>
              <button type="button" className={styles.swatch} style={{ background: "var(--mint)" }}>Mint</button>
            </div>
          </div>
          <div className={styles.pipOptionRow}>
            <div className={styles.pipOptionLabel}>HAT</div>
            <div className={styles.swatches}>
              <button type="button" className={`${styles.swatch} ${styles.chosen}`}>None</button>
              <button type="button" className={styles.swatch} style={{ background: "var(--lilac)" }}>Wiz</button>
              <button type="button" className={styles.swatch} style={{ background: "var(--sun)" }}>Cap</button>
            </div>
          </div>
          <div className={styles.pipOptionRow}>
            <div className={styles.pipOptionLabel}>MOOD (reserved)</div>
            <div className={styles.swatches}>
              <button type="button" className={`${styles.swatch} ${styles.chosen}`}>Cozy</button>
              <button
                type="button"
                className={styles.swatch}
                style={{ background: "var(--tomato)", color: "var(--paper)" }}
              >
                Hype
              </button>
              <button type="button" className={styles.swatch} style={{ background: "var(--mint)" }}>Chill</button>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.note}>
        <b>Preview.</b> Real accessory sprites and Pip&apos;s animations come after
        MVP. Selections don&apos;t persist yet.
      </div>
    </>
  );
}

// ---------------- Shop (stub) ----------------

type ShopItem = {
  id: string;
  name: string;
  cost: number;
  thumb: React.ReactNode;
};

const SHOP_ITEMS: ShopItem[] = [
  { id: "rug", name: "Rug", cost: 5, thumb: <div className="item" style={{ width: 44, height: 14, background: "var(--tomato)" }} /> },
  { id: "plant", name: "Plant", cost: 3, thumb: <div className="item" style={{ width: 22, height: 38, background: "var(--mint)", borderRadius: "50% 50% 4px 4px" }} /> },
  { id: "lamp", name: "Lamp", cost: 4, thumb: <div className="item" style={{ width: 24, height: 44, background: "var(--sun)" }} /> },
  { id: "poster", name: "Poster", cost: 2, thumb: <div className="item" style={{ width: 44, height: 30, background: "var(--lilac)" }} /> },
  { id: "rainbow-rug", name: "Rainbow rug", cost: 10, thumb: <div className="item" style={{ width: 40, height: 40, background: "repeating-linear-gradient(45deg,var(--pinky) 0 6px, var(--paper) 6px 12px)" }} /> },
  { id: "fish-bowl", name: "Fish bowl", cost: 6, thumb: <div className="item" style={{ width: 34, height: 34, background: "var(--sky)", borderRadius: "50%" }} /> },
];

function ShopModal({ workspace }: { workspace: WorkspaceState }) {
  return (
    <>
      <div className={styles.shopGrid}>
        {SHOP_ITEMS.map((item) => {
          const affordable = workspace.coins >= item.cost;
          const needed = item.cost - workspace.coins;
          return (
            <div key={item.id} className={styles.shopTile}>
              <div className={styles.shopThumb}>{item.thumb}</div>
              <div className={styles.shopName}>{item.name}</div>
              <div className={styles.shopCost}>{item.cost} coins</div>
              <button className={styles.shopBuy} disabled={!affordable}>
                {affordable ? "Buy" : `Need ${needed} more`}
              </button>
            </div>
          );
        })}
      </div>
      <div className={styles.note}>
        <b>Preview.</b> Buying will pull from <code>coins</code>, push the item
        into <code>ownedDecorations</code>, and drop the object into the room
        hub.
      </div>
    </>
  );
}
