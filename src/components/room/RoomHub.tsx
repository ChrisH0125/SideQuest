"use client";

import { useCallback, useRef, useState } from "react";
import { ModalHost } from "@/components/modals/ModalHost";
import type { ModalTarget as ModalTargetType } from "@/components/modals/ModalHost";
import { useWorkspace } from "@/components/board/workspace-provider";
import { demoPipResponse } from "@/lib/fixtures";
import { RoomScene } from "./RoomScene";

// Re-exported so RoomScene and other siblings can import from either place.
export type ModalTarget = ModalTargetType;

export function RoomHub() {
  const { workspace } = useWorkspace();
  const [openModal, setOpenModal] = useState<ModalTarget>(null);
  const lastOpenerRef = useRef<HTMLElement | null>(null);

  const handleOpen = useCallback((target: Exclude<ModalTarget, null>, opener: HTMLElement) => {
    lastOpenerRef.current = opener;
    setOpenModal(target);
  }, []);

  const handleClose = useCallback(() => {
    setOpenModal(null);
    window.setTimeout(() => lastOpenerRef.current?.focus(), 0);
  }, []);

  const notebookWordCount =
    workspace.notebookText.trim().length === 0
      ? 0
      : workspace.notebookText.trim().split(/\s+/).length;
  const pipLine =
    [...workspace.conversation].reverse().find(({ role }) => role === "pip")?.text ??
    demoPipResponse.replyText;

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
        pipLine={pipLine}
      />
    </>
  );
}
