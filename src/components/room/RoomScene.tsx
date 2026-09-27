"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { WorkspaceState } from "@/lib/contracts";
import { Pip } from "@/components/pip/Pip";
import type { ModalTarget } from "@/components/modals/ModalHost";
import "./room-styles.css";
import { ThemeToggle } from "./ThemeToggle";

type OpenFn = (target: Exclude<ModalTarget, null>, opener: HTMLElement) => void;

type RoomSceneProps = {
  workspace: WorkspaceState;
  pipLine: string;
  notebookWordCount: number;
  onOpen: OpenFn;
  night: boolean;
  onToggleTheme: () => void;
};

export function RoomScene({
  workspace,
  pipLine,
  notebookWordCount,
  onOpen,
  night,
  onToggleTheme,
}: RoomSceneProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 960));
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  const openFrom =
    (target: Exclude<ModalTarget, null>) =>
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onOpen(target, event.currentTarget);
    };

  const totalReqs = workspace.requirements.length;
  const doneReqs = workspace.requirements.filter((r) => r.checked).length;
  const reqPct = totalReqs === 0 ? 0 : Math.round((doneReqs / totalReqs) * 100);
  const questText =
    workspace.pending.nextStep?.text ??
    workspace.pending.cards[0]?.text ??
    "KEEP GOING";

  return (
    <main id="room-scene" className="app-stage">
      <div className="hero-frame" ref={frame}>
      <div className="game-shell" style={{ transform: `scale(${scale})` }}>
        <div className="top-strip">
          <div
            className="coin-chip"
            aria-label={`${workspace.coins} coins earned`}
          >
            <Coin />
            <span>{workspace.coins}</span>
          </div>
          <p className="wordmark" role="heading" aria-level={1}>
            <b>S</b>ideQuest
          </p>
          <div className="top-actions">
            <button type="button" className="pixel-button tone-mint" onClick={openFrom("board")}>CANVAS</button>
            <ThemeToggle night={night} onToggle={onToggleTheme} />
            <button
              type="button"
              aria-label="Open decoration shop"
              onClick={openFrom("shop")}
              className="pixel-button tone-pink shop-button"
            >
              <BagIcon /> SHOP
            </button>
          </div>
        </div>

        <div
          className="status-rail"
          aria-label={`${doneReqs} of ${totalReqs} requirements done, ${notebookWordCount} words drafted, quest ${questText}`}
        >
          <div className="status-block">
            <span>REQUIREMENTS</span>
            <div className="progress" aria-hidden>
              <i style={{ width: `${reqPct}%` }} />
            </div>
            <b>
              {doneReqs}/{totalReqs}
            </b>
          </div>
          <div className="status-divider" />
          <div className="status-block draft-status">
            <span>DRAFT</span>
            <b>{notebookWordCount} WORDS</b>
          </div>
          <div className="status-divider" />
          <div className="status-block">
            <span>QUEST</span>
            <b>{questText.toUpperCase()}</b>
          </div>
        </div>

        <div className="room">
          <div className="wall">
            <Window side="left" />
            <button
              type="button"
              className="object-hit board-hit"
              onClick={openFrom("board")}
              aria-label="Open the idea board"
            >
              <CorkBoard workspace={workspace} />
              <HoverLabel>CORK BOARD</HoverLabel>
            </button>
            <Window side="right" />
          </div>

          <div className="baseboard" />
          <div className="floor">
            <div className="floor-line line-a" />
            <div className="floor-line line-b" />
            <div className="floor-knot knot-a" />
            <div className="floor-knot knot-b" />
            <div className="floor-knot knot-c" />

            <div className="desk" aria-hidden>
              <div className="desk-backsplash" />
              <div className="desk-front" />
              <div className="desk-drawer"><i /></div>
              <div className="desk-leg desk-leg-left" />
              <div className="desk-leg desk-leg-right" />
            </div>

            <Notebook
              onOpen={openFrom("notebook")}
              wordCount={notebookWordCount}
              hasText={notebookWordCount > 0}
            />
            <Recorder onOpen={openFrom("mic")} />

            <div className="rug" aria-hidden><i /></div>

            <div className="speech-bubble" role="status">
              <b>PIP · ONE QUESTION</b>
              <p>{pipLine}</p>
            </div>

            <button
              type="button"
              className="object-hit pip-hit"
              onClick={openFrom("pip")}
              aria-label="Talk with Pip"
            >
              <Pip />
              <HoverLabel>PIP</HoverLabel>
            </button>
          </div>
        </div>
      </div>
      </div>
      <nav className="room-mobile-actions" aria-label="Room shortcuts">
        <button type="button" className="pixel-button tone-mint" onClick={openFrom("board")}>CANVAS</button>
        <button type="button" className="pixel-button tone-cream" onClick={openFrom("notebook")}>NOTEBOOK</button>
        <ThemeToggle night={night} onToggle={onToggleTheme} />
      </nav>
    </main>
  );
}

// ---------------- Presentational sub-components ----------------

function Coin({ small = false }: { small?: boolean }) {
  return (
    <span aria-hidden className={`coin${small ? " coin-small" : ""}`}>
      <i />
    </span>
  );
}

function BagIcon() {
  return (
    <span aria-hidden className="bag-icon">
      <i />
    </span>
  );
}

function HoverLabel({ children }: { children: ReactNode }) {
  return <span className="hover-label">{children}</span>;
}

function Window({ side }: { side: "left" | "right" }) {
  return (
    <div className={`window window-${side}`} aria-hidden>
      <div className="sky-orb" />
      <div className="cloud"><i /><b /></div>
      <div className="window-cross-x" />
      <div className="window-cross-y" />
      <div className="window-sill" />
    </div>
  );
}

function CorkBoard({ workspace }: { workspace: WorkspaceState }) {
  const [ideaOne, ideaTwo] = workspace.cards.filter((c) => c.kind === "idea");
  const pending = workspace.pending.cards[0];
  const pendingCount = workspace.pending.cards.length;
  return (
    <div className="cork-board">
      <div className="board-grain grain-a" />
      <div className="board-grain grain-b" />
      <div className="board-title">IDEAS</div>
      <div className="board-check">✓</div>
      <div className="tape tape-left" />
      <div className="tape tape-right" />
      <div className="idea-flow">
        <div className="idea-card">
          {ideaOne ? ideaOne.text : "First idea will appear here."}
        </div>
        <span className="flow-arrow">→</span>
        <div className="idea-card">
          {ideaTwo ? ideaTwo.text : "Second idea will appear here."}
        </div>
        <span className="flow-arrow">→</span>
        <div className="idea-card pending-card">
          {pending ? pending.text : "Pip's next suggestion."}
        </div>
      </div>
      {pendingCount > 0 && (
        <div className="notification-badge">{pendingCount}</div>
      )}
    </div>
  );
}

function Recorder({
  onOpen,
}: {
  onOpen: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className="object-hit recorder-hit"
      onClick={onOpen}
      aria-label="Open the tape recorder to talk to Pip"
    >
      <div className="recorder">
        <div className="recorder-handle" />
        <div className="recorder-controls">
          <i /><i /><i /><i />
        </div>
        <div className="cassette-window">
          <div className="cassette-reel cassette-reel-left"><i /></div>
          <div className="cassette-tape" />
          <div className="cassette-reel cassette-reel-right"><i /></div>
        </div>
        <div className="speaker-grille">
          <i /><i /><i /><i />
        </div>
        <div className="mic-grille"><i /><i /><i /></div>
        <span className="rec-dot" />
        <span className="rec-text">RECORDER</span>
        <div className="recorder-label">TALK TO PIP</div>
      </div>
      <div className="alert-badge">!</div>
      <HoverLabel>TAPE RECORDER</HoverLabel>
    </button>
  );
}

function Notebook({
  onOpen,
  wordCount,
  hasText,
}: {
  onOpen: (event: React.MouseEvent<HTMLButtonElement>) => void;
  wordCount: number;
  hasText: boolean;
}) {
  return (
    <button
      type="button"
      className="object-hit notebook-hit"
      onClick={onOpen}
      aria-label="Open the notebook"
    >
      <div className="notebook">
        <div className="notebook-tape" />
        <div className="notebook-spine">
          <i /><i /><i /><i />
        </div>
        <div className="notebook-margin" />
        <div className="notebook-lines" />
        <div className="notebook-copy">
          <b>{hasText ? "DRAFT IN PROGRESS" : "START YOUR DRAFT"}</b>
        </div>
        <div className="word-sticker">{wordCount} WORDS</div>
        <div className="pixel-pencil"><i /></div>
      </div>
      <HoverLabel>NOTEBOOK</HoverLabel>
    </button>
  );
}
