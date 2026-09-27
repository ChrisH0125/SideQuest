"use client";

import { demoWorkspace } from "@/lib/fixtures";
import { RoomHub } from "@/components/room/RoomHub";
import { WorkspaceProvider } from "./workspace-provider";

export function BoardWorkspace() {
  return (
    <WorkspaceProvider initialWorkspace={demoWorkspace}>
      <RoomHub />
    </WorkspaceProvider>
  );
}
