"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import type { WorkspaceState } from "@/lib/contracts";
import { ModalHost } from "@/components/modals/ModalHost";
import type { ModalTarget as ModalTargetType } from "@/components/modals/ModalHost";
import { RoomScene } from "./RoomScene";

// Re-exported so RoomScene and other siblings can import from either place.
export type ModalTarget = ModalTargetType;

// The mockup persisted the draft to localStorage so leaving the page didn't
// lose your writing. Uses useSyncExternalStore to read/write cleanly across
// server-render + hydration. Chris will replace this once the real workspace
// state layer lands.
const NOTEBOOK_STORAGE_KEY = "sidequest-notebook-draft";
const notebookListeners = new Set<() => void>();

function subscribeNotebook(callback: () => void): () => void {
  notebookListeners.add(callback);
  return () => {
    notebookListeners.delete(callback);
  };
}

function readNotebook(): string {
  try {
    return window.localStorage.getItem(NOTEBOOK_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function serverNotebookSnapshot(): string {
  return "";
}

function writeNotebook(next: string) {
  try {
    window.localStorage.setItem(NOTEBOOK_STORAGE_KEY, next);
  } catch {
    // ignore quota / private-mode failures
  }
  notebookListeners.forEach((cb) => cb());
}

type RoomHubProps = {
  workspace: WorkspaceState;
  pipLine: string;
};

export function RoomHub({ workspace, pipLine }: RoomHubProps) {
  const [openModal, setOpenModal] = useState<ModalTarget>(null);
  const lastOpenerRef = useRef<HTMLElement | null>(null);

  const notebookText = useSyncExternalStore(
    subscribeNotebook,
    readNotebook,
    serverNotebookSnapshot,
  );

  const setNotebookText = useCallback((next: string) => {
    writeNotebook(next);
  }, []);

  const handleOpen = (target: Exclude<ModalTarget, null>, opener: HTMLElement) => {
    lastOpenerRef.current = opener;
    setOpenModal(target);
  };

  const handleClose = () => {
    setOpenModal(null);
    // Restore focus to whatever object opened the modal so keyboard users
    // don't get dropped at the top of the page.
    window.setTimeout(() => lastOpenerRef.current?.focus(), 0);
  };

  const notebookWordCount =
    notebookText.trim().length === 0 ? 0 : notebookText.trim().split(/\s+/).length;

  return (
    <>
      <RoomScene
        workspace={workspace}
        pipLine={pipLine}
        notebookWordCount={notebookWordCount}
        onOpen={handleOpen}
      />
      <ModalHost
        open={openModal}
        onClose={handleClose}
        workspace={workspace}
        pipLine={pipLine}
        notebookText={notebookText}
        onNotebookChange={setNotebookText}
      />
    </>
  );
}
