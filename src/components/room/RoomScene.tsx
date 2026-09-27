"use client";

import type { WorkspaceState } from "@/lib/contracts";
import { Pip } from "@/components/pip/Pip";
import type { ModalTarget } from "./RoomHub";
import styles from "./room.module.css";

type RoomSceneProps = {
  workspace: WorkspaceState;
  pipLine: string;
  notebookWordCount: number;
  onOpen: (target: Exclude<ModalTarget, null>, opener: HTMLElement) => void;
};

export function RoomScene({
  workspace,
  pipLine,
  notebookWordCount,
  onOpen,
}: RoomSceneProps) {
  const handleOpen =
    (target: Exclude<ModalTarget, null>) =>
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onOpen(target, event.currentTarget);
    };

  const pendingCardCount = workspace.pending.cards.length;
  const [ideaOne, ideaTwo] = workspace.cards.filter((c) => c.kind === "idea");
  const pendingCard = workspace.pending.cards[0];
  const lastUserTurn = [...workspace.conversation].reverse().find((t) => t.role === "user");

  const totalReqs = workspace.requirements.length;
  const doneReqs = workspace.requirements.filter((r) => r.checked).length;
  const reqPct = totalReqs === 0 ? 0 : Math.round((doneReqs / totalReqs) * 100);

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span
            className={styles.coinChip}
            aria-label={`${workspace.coins} coins earned`}
          >
            <span className={styles.coinDot} />
            {workspace.coins}
          </span>
        </div>
        <div className={styles.topbarCenter}>
          <span className={styles.brand}>
            <span className={styles.brandSide}>S</span>ideQuest
          </span>
        </div>
        <div className={styles.topbarRight}>
          <button
            type="button"
            className={styles.shopIcon}
            onClick={handleOpen("shop")}
            aria-label="Open the shop"
          >
            <ShopBagIcon />
          </button>
        </div>
      </header>

      <div
        className={styles.statusRail}
        aria-label={`${doneReqs} of ${totalReqs} requirements done, ${notebookWordCount} words drafted, revision ${workspace.revision}`}
      >
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>REQUIREMENTS</span>
          <span className={styles.progressBar} aria-hidden>
            <span
              className={styles.progressFill}
              style={{ width: `${reqPct}%` }}
            />
          </span>
          <span className={styles.statusValue}>
            {doneReqs}/{totalReqs}
          </span>
        </div>
        <span className={styles.statusDivider} aria-hidden />
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>DRAFT</span>
          <span className={styles.statusValue}>{notebookWordCount} W</span>
        </div>
        <span className={styles.statusDivider} aria-hidden />
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>REV</span>
          <span className={styles.statusValue}>{workspace.revision}</span>
        </div>
      </div>

      <div className={styles.room}>
        <div className={styles.wall} aria-hidden />
        <div className={styles.baseboard} aria-hidden />
        <div className={styles.floor} aria-hidden />
        <span className={`${styles.knot} ${styles.knot1}`} aria-hidden />
        <span className={`${styles.knot} ${styles.knot2}`} aria-hidden />
        <span className={`${styles.knot} ${styles.knot3}`} aria-hidden />

        {/* WALL: left window */}
        <div className={`${styles.objWindow} ${styles.objWindowLeft}`} aria-hidden>
          <div className={styles.windowSun} />
          <div className={styles.windowCloud} />
          <div className={styles.windowCross} />
        </div>

        {/* WALL: corkboard */}
        <button
          type="button"
          className={`${styles.roomObject} ${styles.objCorkboard}`}
          onClick={handleOpen("board")}
          aria-label="Open the idea board"
        >
          <div className={styles.corkboardBody}>
            <span className={styles.corkboardTag}>IDEAS</span>
            <span className={styles.corkboardRev}>REV {workspace.revision}</span>
            {ideaOne && (
              <div className={`${styles.miniCard} ${styles.mc1}`}>
                <span className={styles.mcKind}>IDEA</span>
                <div>{ideaOne.text}</div>
              </div>
            )}
            {ideaOne && ideaTwo && <div className={styles.miniArrow} aria-hidden />}
            {ideaTwo && (
              <div className={`${styles.miniCard} ${styles.mc2}`}>
                <span className={styles.mcKind}>IDEA</span>
                <div>{ideaTwo.text}</div>
              </div>
            )}
            {pendingCard && (
              <div className={`${styles.miniCard} ${styles.mc3}`}>
                <span className={styles.mcKind}>PIP</span>
                <div>{pendingCard.text}</div>
              </div>
            )}
            {pendingCardCount > 0 && (
              <span className={styles.badge} aria-hidden>{pendingCardCount}</span>
            )}
          </div>
          <span className={styles.objTag}>CORK BOARD</span>
        </button>

        {/* WALL: right window */}
        <div className={`${styles.objWindow} ${styles.objWindowRight}`} aria-hidden>
          <div className={styles.windowSun} />
          <div className={styles.windowCloud} />
          <div className={styles.windowCross} />
        </div>

        {/* DESK */}
        <div className={styles.deskLegs} aria-hidden>
          <div className={`${styles.leg} ${styles.legLeft}`} />
          <div className={`${styles.leg} ${styles.legRight}`} />
        </div>
        <div className={styles.deskTop} aria-hidden />

        {/* DESK: notebook (clickable) */}
        <button
          type="button"
          className={`${styles.roomObject} ${styles.objNotebook}`}
          onClick={handleOpen("notebook")}
          aria-label="Open the notebook"
        >
          <div className={styles.notebookBody}>
            <span className={styles.notebookLiveCount}>{notebookWordCount} W</span>
            <div className={styles.notebookPreview}>
              {notebookWordCount > 0 ? "Draft in progress…" : "Draft appears here…"}
            </div>
            <div className={styles.notebookPageNum}>PG 1</div>
          </div>
          <span className={styles.objTag}>NOTEBOOK</span>
        </button>

        {/* DESK: tape recorder (clickable) */}
        <button
          type="button"
          className={`${styles.roomObject} ${styles.objMic}`}
          onClick={handleOpen("mic")}
          aria-label="Open the microphone to talk to Pip"
        >
          <div className={styles.micBody}>
            <div className={styles.micReelsStrip} aria-hidden>
              <span className={styles.micReel} />
              <span className={styles.micReel} />
            </div>
            <div className={styles.micLabelRow}>
              <span className={styles.recDot} aria-hidden />
              HOLD TO TALK
            </div>
            {pipLine && <span className={styles.badge} aria-hidden>!</span>}
          </div>
          <span className={styles.objTag}>TAPE RECORDER</span>
        </button>

        {/* FLOOR: rug */}
        <div className={styles.rug} aria-hidden />

        {/* FLOOR: Pip standing on the rug */}
        <div className={styles.pipZone}>
          <div className={styles.speech} role="status">
            <div className={styles.speechWho}>PIP · ONE QUESTION</div>
            <div className={styles.speechBody}>{pipLine}</div>
            {lastUserTurn && (
              <div className={styles.speechUser}>
                You said: &ldquo;{lastUserTurn.text}&rdquo;
              </div>
            )}
          </div>
          <button
            type="button"
            className={styles.objPip}
            onClick={handleOpen("pip")}
            aria-label="Open Pip customization"
          >
            <Pip size={148} className={styles.pipBody} />
            <span className={styles.objTag}>PIP</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ShopBagIcon() {
  return (
    <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      {/* Handles */}
      <rect x="5" y="2" width="1" height="3" fill="#2d1b3d" />
      <rect x="10" y="2" width="1" height="3" fill="#2d1b3d" />
      <rect x="6" y="2" width="4" height="1" fill="#2d1b3d" />
      {/* Bag body outline */}
      <rect x="3" y="5" width="10" height="1" fill="#2d1b3d" />
      <rect x="2" y="6" width="1" height="8" fill="#2d1b3d" />
      <rect x="13" y="6" width="1" height="8" fill="#2d1b3d" />
      <rect x="2" y="13" width="12" height="1" fill="#2d1b3d" />
      {/* Bag body fill */}
      <rect x="3" y="6" width="10" height="7" fill="#ff6f59" />
      {/* Coin symbol */}
      <rect x="7" y="8" width="2" height="1" fill="#2d1b3d" />
      <rect x="7" y="10" width="2" height="1" fill="#2d1b3d" />
      <rect x="7" y="9" width="1" height="1" fill="#2d1b3d" />
    </svg>
  );
}
