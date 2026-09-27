import { RoomHub } from "@/components/room/RoomHub";
import { demoPipResponse, demoWorkspace } from "@/lib/fixtures";

// Wires the room hub against the demo fixture so the whole flow renders
// without needing the real state layer or Gemini. Chris swaps `demoWorkspace`
// for the live workspace + reducer when integration is ready.
export default function Home() {
  return (
    <RoomHub
      workspace={demoWorkspace}
      pipLine={demoPipResponse.replyText}
    />
  );
}
