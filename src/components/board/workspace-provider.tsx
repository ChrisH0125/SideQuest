"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type { ProposedAction, WorkspaceState } from "@/lib/contracts";
import {
  commandFromProposedAction,
  workspaceHistoryReducer,
  type WorkspaceCommand,
} from "@/lib/workspace-reducer";
import { loadWorkspace, saveWorkspace } from "@/lib/storage";

type WorkspaceContextValue = {
  workspace: WorkspaceState;
  canUndo: boolean;
  runCommand: (command: WorkspaceCommand) => void;
  runProposedAction: (action: ProposedAction) => void;
  undo: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function connectionId() {
  return `connection-${crypto.randomUUID()}`;
}

export function WorkspaceProvider({
  children,
  initialWorkspace,
}: {
  children: ReactNode;
  initialWorkspace: WorkspaceState;
}) {
  const [state, dispatch] = useReducer(workspaceHistoryReducer, {
    workspace: initialWorkspace,
    past: [],
  });
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const saved = loadWorkspace();
    if (saved.status === "loaded") {
      dispatch({ type: "hydrate", workspace: saved.workspace });
    }
    setStorageReady(true);
  }, []);

  useLayoutEffect(() => {
    if (storageReady) saveWorkspace(state.workspace);
  }, [state.workspace, storageReady]);

  const runCommand = useCallback((command: WorkspaceCommand) => {
    dispatch({ type: "execute", command });
  }, []);

  const runProposedAction = useCallback((action: ProposedAction) => {
    dispatch({
      type: "execute",
      command: commandFromProposedAction(action, connectionId),
    });
  }, []);

  const undo = useCallback(() => dispatch({ type: "undo" }), []);

  const value = useMemo(
    () => ({
      workspace: state.workspace,
      canUndo: state.past.length > 0,
      runCommand,
      runProposedAction,
      undo,
    }),
    [runCommand, runProposedAction, state.past.length, state.workspace, undo],
  );

  return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  return value;
}
