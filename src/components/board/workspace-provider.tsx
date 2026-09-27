"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ProposedAction, WorkspaceState } from "@/lib/contracts";
import { applyWorkspaceCommand, commandFromProposedAction, workspaceHistoryReducer, type WorkspaceCommand, type WorkspaceHistory } from "@/lib/workspace-reducer";
import { loadWorkspace, saveWorkspace } from "@/lib/storage";
import { describePipActions } from "@/lib/pip-actions";

export type CommandReceipt = { ok: true; workspace: WorkspaceState; duplicate: boolean } | { ok: false; reason: string };
type WorkspaceContextValue = {
  workspace: WorkspaceState;
  canUndo: boolean;
  saveStatus: string;
  rewardStatus: string;
  pipActionStatus: string;
  getWorkspace: () => WorkspaceState;
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
  const [rewardStatus, setRewardStatus] = useState("");
  const [pipActionStatus, setPipActionStatus] = useState("");
  const [saveStatus, setSaveStatus] = useState("Loading saved work…");
  useEffect(() => {
    if (!rewardStatus) return;
    const timer = setTimeout(() => setRewardStatus(""), 5000);
    return () => clearTimeout(timer);
  }, [rewardStatus]);
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
    const actions = command.type === "apply-pip-actions" ? command.batch.actions : command.type === "apply-pip-turn" ? command.response.actions : undefined;
    if (!result.ok) {
      if (actions?.length) setPipActionStatus(result.reason);
      return { ok: false, reason: result.reason };
    }
    if (result.workspace === current.current.workspace) return { ok: true, workspace: result.workspace, duplicate: true };
    const earned = result.workspace.coins - current.current.workspace.coins;
    if (earned > 0) setRewardStatus(`+${earned} coin${earned === 1 ? "" : "s"} · ${actions?.length ? "Progress saved" : command.type === "complete-step" ? "Step completed" : "Idea captured"} · ${result.workspace.coins} total`);
    commit(workspaceHistoryReducer(current.current, { type: "execute", command }));
    if (actions?.length) setPipActionStatus(describePipActions(actions));
    return { ok: true, workspace: current.current.workspace, duplicate: false };
  }, [commit]);
  const runProposedAction = useCallback((action: ProposedAction) => runCommand(commandFromProposedAction(action, () => `connection-${crypto.randomUUID()}`)), [runCommand]);
  const undo = useCallback(() => {
    if (!current.current.past.length) return;
    commit(workspaceHistoryReducer(current.current, { type: "undo" }));
    setPipActionStatus("Undid the last board change. Earned coins and your written work are kept.");
  }, [commit]);
  const getWorkspace = useCallback(() => current.current.workspace, []);
  const value = useMemo(() => ({ workspace: state.workspace, canUndo: state.past.length > 0, saveStatus, rewardStatus, pipActionStatus, getWorkspace, runCommand, runProposedAction, undo }), [state, saveStatus, rewardStatus, pipActionStatus, getWorkspace, runCommand, runProposedAction, undo]);
  return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  return value;
}
