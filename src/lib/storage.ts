// Saves the workspace in this browser (localStorage) so a refresh does not lose work.
// Saves stay on this one browser and device. They are not synced or tamper-proof.
//
// Only call these in the browser after the page has mounted (for example inside
// useEffect). Load first, then start saving, so a fresh empty workspace never
// overwrites a saved one.
import type { WorkspaceState } from "./contracts";
import { workspaceStateSchema } from "./schemas";

export const STORAGE_KEY = "sidequest:workspace";
// Unreadable saves are moved here instead of being deleted, so work can still be recovered.
export const BROKEN_SAVE_KEY = "sidequest:workspace:unreadable";
// Bump this when WorkspaceState changes in a way old saves cannot be read.
export const SAVE_VERSION = 1;

type SavedFile = { version: number; savedAt: string; workspace: unknown };

export type LoadResult =
  | { status: "empty" }
  | { status: "loaded"; workspace: WorkspaceState; savedAt: string }
  | { status: "unreadable"; reason: string };

export type SaveResult = { ok: true } | { ok: false; reason: string };

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Some privacy settings block storage entirely.
    return null;
  }
}

export function saveWorkspace(workspace: WorkspaceState, storage = browserStorage()): SaveResult {
  if (!storage) return { ok: false, reason: "This browser is not allowing saves." };
  const file: SavedFile = { version: SAVE_VERSION, savedAt: new Date().toISOString(), workspace };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(file));
    return { ok: true };
  } catch {
    return { ok: false, reason: "Could not save. The browser's storage may be full." };
  }
}

export function loadWorkspace(storage = browserStorage()): LoadResult {
  if (!storage) return { status: "empty" };

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { status: "empty" };
  }
  if (raw === null) return { status: "empty" };

  const reason = readProblem(raw);
  if (reason) {
    setAside(raw, storage);
    return { status: "unreadable", reason };
  }
  const file = JSON.parse(raw) as SavedFile;
  return { status: "loaded", workspace: workspaceStateSchema.parse(file.workspace), savedAt: file.savedAt };
}

export function clearWorkspace(storage = browserStorage()): SaveResult {
  if (!storage) return { ok: false, reason: "This browser is not allowing saves." };
  try {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(BROKEN_SAVE_KEY);
    return { ok: true };
  } catch {
    return { ok: false, reason: "Could not clear the saved project from this browser." };
  }
}

// Returns why a saved file cannot be used, or null if it is fine.
function readProblem(raw: string): string | null {
  let file: Partial<SavedFile>;
  try {
    file = JSON.parse(raw);
  } catch {
    return "The saved project is damaged.";
  }
  if (file?.version !== SAVE_VERSION) return "The saved project is from an older version of SideQuest.";
  if (typeof file.savedAt !== "string") return "The saved project is damaged.";
  if (!workspaceStateSchema.safeParse(file.workspace).success) return "The saved project is damaged.";
  return null;
}

function setAside(raw: string, storage: Storage): void {
  try {
    storage.setItem(BROKEN_SAVE_KEY, raw);
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Leave the original in place rather than lose it.
  }
}
