"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ModalHost, type ModalTarget as ModalTargetType } from "@/components/modals/ModalHost";
import { useWorkspace } from "@/components/board/workspace-provider";
import { WorkArea } from "@/components/board/WorkArea";
import { IdeaBoard } from "@/components/board/idea-board";
import { PipCompanion } from "@/components/pip/PipCompanion";
import { RoomScene } from "./RoomScene";
import { ThemeToggle } from "./ThemeToggle";
import styles from "@/components/board/workspace.module.css";

export type ModalTarget = ModalTargetType;
export type PipOrigin = { x: number; y: number } | null;
export function RoomHub() {
  const { workspace, saveStatus, rewardStatus } = useWorkspace();
  const [view, setView] = useState<"room" | "canvas">("room");
  const [workOpen, setWorkOpen] = useState(true);
  const [pipMode, setPipMode] = useState<"voice" | "text">("text");
  const [night, setNight] = useState(false);
  const [openModal, setOpenModal] = useState<ModalTarget>(null);
  const [pipOpen, setPipOpen] = useState(false);
  const [origin, setOrigin] = useState<PipOrigin>(null);
  const opener = useRef<HTMLElement | null>(null);
  const canvasHeading = useRef<HTMLHeadingElement>(null);
  const roomCanvasButton = useRef(false);
  useEffect(() => {
    try { setNight(localStorage.getItem("sidequest:theme") === "night"); } catch { /* optional preference */ }
  }, []);
  const toggleTheme = useCallback(() => {
    setNight(value => {
      try { localStorage.setItem("sidequest:theme", value ? "day" : "night"); } catch { /* optional preference */ }
      return !value;
    });
  }, []);
  const handleOpen = useCallback((target: Exclude<ModalTarget, null>, element: HTMLElement) => {
    if (target === "board" || target === "notebook" || target === "mic" || target === "pip") {
      const rect = document.querySelector(".pip-hit")?.getBoundingClientRect();
      setOrigin(rect ? { x: rect.x, y: rect.y } : null);
      setView("canvas");
      setWorkOpen(target === "notebook");
      setPipOpen(target === "mic" || target === "pip");
      setPipMode(target === "mic" ? "voice" : "text");
      requestAnimationFrame(() => {
        if (target === "notebook") document.getElementById("work-writing")?.focus();
        else if (target === "mic") document.getElementById("pip-voice-start")?.focus();
        else if (target === "pip") document.getElementById("pip-message")?.focus();
        else canvasHeading.current?.focus();
      });
      return;
    }
    opener.current = element;
    setOpenModal(target);
  }, []);
  const handleClose = useCallback(() => {
    setOpenModal(null);
    requestAnimationFrame(() => opener.current?.focus());
  }, []);
  function backToRoom() {
    setView("room"); setPipOpen(false); setOrigin(null); roomCanvasButton.current = true;
  }
  useEffect(() => {
    if (view === "room" && roomCanvasButton.current) {
      document.querySelector<HTMLButtonElement>(".top-actions > button")?.focus();
      roomCanvasButton.current = false;
    }
  }, [view]);
  const pipLine = workspace.conversation.findLast(turn => turn.role === "pip")?.text ?? "What’s on your mind? A problem, a plan, or something you’re stuck on — start anywhere.";
  return <div className={`${styles.shell} ${night ? "night-mode" : ""}`} data-view={view} data-work-open={workOpen}>
    <div id="workspace-content">
      {view === "room" ? <RoomScene workspace={workspace} pipLine={pipLine} notebookWordCount={workspace.notebookText.trim() ? workspace.notebookText.trim().split(/\s+/).length : 0} onOpen={handleOpen} night={night} onToggleTheme={toggleTheme} /> :
        <main className={styles.canvasPage}>
          <header className={styles.canvasHeader}>
            <button type="button" className="pixel-button tone-cream" onClick={backToRoom}>← ROOM</button>
            <h1 ref={canvasHeading} tabIndex={-1}>Your workspace</h1>
            <div className={styles.headerActions}>
              <span className={styles.save} role="status">{saveStatus}</span>
              <span className={styles.coinCount} aria-label={`${workspace.coins} coin${workspace.coins === 1 ? "" : "s"}`}>{workspace.coins} coin{workspace.coins === 1 ? "" : "s"}</span>
              <button type="button" className="pixel-button tone-cream" aria-pressed={workOpen} onClick={() => setWorkOpen(value => !value)}>{workOpen ? "CANVAS ONLY" : "WORK AREA"}</button>
              <button type="button" className="pixel-button tone-cream" onClick={event => handleOpen("clear", event.currentTarget)}>CLEAR</button>
              <ThemeToggle night={night} onToggle={toggleTheme} />
            </div>
          </header>
          <div className={styles.workspaceLayout} data-work-open={workOpen}><IdeaBoard />{workOpen && <WorkArea />}</div>
        </main>}
      <PipCompanion canvasMode={view === "canvas"} expanded={pipOpen} onExpandedChange={setPipOpen} origin={origin} preferredMode={pipMode} />
    </div>
    <div className={styles.rewardToast} role="status" aria-live="polite">{rewardStatus}</div>
    <ModalHost open={openModal} onClose={handleClose} pipLine={pipLine} />
  </div>;
}
