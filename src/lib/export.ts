// Turns the user's own writing into files they can keep outside the browser.
import type { WorkspaceState } from "./contracts";

export type ExportFile = { filename: string; mimeType: string; text: string };

// The user's writing as plain text: title, then the notebook.
export function notebookExport(workspace: WorkspaceState): ExportFile {
  return {
    filename: `${fileSafeName(workspace.title)}.txt`,
    mimeType: "text/plain",
    text: `${workspace.title}\n\n${workspace.notebookText}\n`,
  };
}

// The whole project as JSON, as a backup.
export function projectExport(workspace: WorkspaceState): ExportFile {
  return {
    filename: `${fileSafeName(workspace.title)}.sidequest.json`,
    mimeType: "application/json",
    text: JSON.stringify(workspace, null, 2),
  };
}

// Browser only: asks the browser to download the file. Call it from a click handler.
export function downloadFile({ filename, mimeType, text }: ExportFile): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Give the browser a moment to start the download before freeing the file.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileSafeName(title: string): string {
  const name = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return name.slice(0, 60) || "sidequest-project";
}
