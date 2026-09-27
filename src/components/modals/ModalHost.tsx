"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import type { WorkspaceState } from "@/lib/contracts";
import { useWorkspace } from "@/components/board/workspace-provider";
import { DECORATIONS, type DecorationId } from "@/lib/rewards";
import { DecorationArt } from "@/components/room/DecorationArt";
import styles from "./modals.module.css";

export type ModalTarget =
  | "notebook"
  | "board"
  | "mic"
  | "pip"
  | "clear"
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
      {open === "clear" && <>
        <p>Clear all canvas cards, equations, graphs, and pending suggestions? Your goal, written work, coins, and room items stay saved. You can Undo this.</p>
        <button type="button" className={styles.btn} onClick={() => {
          const result = runCommand({ type: "clear-canvas" });
          if (result.ok) onClose();
        }}>Clear canvas</button>
      </>}
      {open === "shop" && <ShopModal />}
    </ModalFrame>
  );
}

function modalTitle(target: Exclude<ModalTarget, null>, workspace: WorkspaceState) {
  switch (target) {
    case "clear":
      return "CLEAR CANVAS?";
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
              <div className={styles.shopArt}><DecorationArt item={item.id} /></div>
              <div className={styles.shopName}>{decoration.name}</div>
              <div className={styles.shopCost}>{decoration.cost} coins</div>
              <button
                type="button"
                className={styles.shopBuy}
                aria-label={owned ? `${decoration.name} owned` : `Buy ${decoration.name}`}
                disabled={owned || !affordable}
                onClick={() => {
                  const result = runCommand({ type: "buy-decoration", decorationId: item.id });
                  setStatus(result.ok ? `${decoration.name} placed in your room.` : result.reason);
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
        Earn 1 coin for an idea and 3 for completing a step. Purchases appear in your room immediately and stay after reloading.
      </div>
    </>
  );
}
