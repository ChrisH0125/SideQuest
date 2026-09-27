"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ProposedAction, WorkspaceState } from "@/lib/contracts";
import { applyWorkspaceCommand, commandFromProposedAction, workspaceHistoryReducer, type WorkspaceCommand, type WorkspaceHistory } from "@/lib/workspace-reducer";
import { loadWorkspace, saveWorkspace } from "@/lib/storage";

export type CommandReceipt = { ok: true } | { ok: false; reason: string };
type WorkspaceContextValue = {
  workspace: WorkspaceState;
  canUndo: boolean;
  saveStatus: string;
  runCommand: (command: WorkspaceCommand) => CommandReceipt;
  runProposedAction: (action: ProposedAction) => CommandReceipt;
  undo: () => void;
};
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children, initialWorkspace }: { children: ReactNode; initialWorkspace: WorkspaceState }) {
  const [state, setState] = useState<WorkspaceHistory>({ workspace: initialWorkspace, past: [] });
  // Receipts use the latest state even for two commands within one event.
  const current = useRef(state);
  const ready = useRef(false);
  const savingAllowed = useRef(true);
  const [saveStatus, setSaveStatus] = useState("Loading saved work…");
  const commit = useCallback((next: WorkspaceHistory) => {
    current.current = next;
    setState(next);
    if (!savingAllowed.current) {
      setSaveStatus("Old save needs recovery. Download your draft before leaving; saving is paused.");
      return;
    }
    const saved = saveWorkspace(next.workspace);
    setSaveStatus(saved.ok ? "Saved in this browser" : saved.reason);
  }, []);

  useEffect(() => {
    const saved = loadWorkspace();
    savingAllowed.current = saved.status !== "unreadable";
    let workspace = saved.status === "loaded" ? saved.workspace : initialWorkspace;
    if (saved.status === "empty") {
      try {
        const legacy = localStorage.getItem("sidequest-notebook-draft");
        if (legacy !== null) workspace = { ...workspace, notebookText: legacy.slice(0, 50_000) };
        // Keep the legacy key as a recovery copy after migration.
      } catch { /* commit reports blocked storage */ }
    }
    ready.current = true;
    commit({ workspace, past: [] });
    if (saved.status === "unreadable") setSaveStatus(saved.reason + " Saving is paused to protect it. Download your draft before leaving.");
  }, [commit, initialWorkspace]);

  const runCommand = useCallback((command: WorkspaceCommand): CommandReceipt => {
    if (!ready.current) return { ok: false, reason: "Wait for saved work to load." };
    const result = applyWorkspaceCommand(current.current.workspace, command);
    if (!result.ok) return { ok: false, reason: result.reason };
    commit(workspaceHistoryReducer(current.current, { type: "execute", command }));
    return { ok: true };
  }, [commit]);
  const runProposedAction = useCallback((action: ProposedAction) => runCommand(commandFromProposedAction(action, () => `connection-${crypto.randomUUID()}`)), [runCommand]);
  const undo = useCallback(() => commit(workspaceHistoryReducer(current.current, { type: "undo" })), [commit]);
  const value = useMemo(() => ({ workspace: state.workspace, canUndo: state.past.length > 0, saveStatus, runCommand, runProposedAction, undo }), [state, saveStatus, runCommand, runProposedAction, undo]);
  return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  return value;
}
