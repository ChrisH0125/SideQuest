"use client";

import { emptyWorkspace } from "@/lib/fixtures";
import { RoomHub } from "@/components/room/RoomHub";
import { WorkspaceProvider } from "./workspace-provider";

export function BoardWorkspace() {
  return (
    <WorkspaceProvider initialWorkspace={emptyWorkspace}>
      <RoomHub />
    </WorkspaceProvider>
  );
}
