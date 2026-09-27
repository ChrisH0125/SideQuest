"use client";

import { useState } from "react";
import { useWorkspace } from "./workspace-provider";
import { downloadFile, notebookExport } from "@/lib/export";
import { MathTools } from "./MathVisuals";
import styles from "./workspace.module.css";

export function WorkArea() {
  const { workspace, runCommand, saveStatus } = useWorkspace();
  const [status, setStatus] = useState("");
  return <section className={styles.workArea} aria-label="Your work">
    <h2>Your work</h2>
    <p>Notes, working, or a draft. Start wherever you can.</p>
    <form onSubmit={event => {
      event.preventDefault();
      const text = String(new FormData(event.currentTarget).get("goal") ?? "").trim();
      if (text === workspace.assignment) { setStatus("Goal is already saved."); return; }
      const result = runCommand({ type: "update-assignment", text });
      setStatus(result.ok ? "Goal saved. Previous goal checklist cleared; cards and work kept." : result.reason);
    }}>
      <label htmlFor="work-goal">What are you working on?</label>
      <textarea id="work-goal" name="goal" key={workspace.assignment} defaultValue={workspace.assignment} rows={2} maxLength={5000} placeholder="Solve an equation, plan my week, understand a topic…" />
      <button className="pixel-button tone-mint" type="submit">Save goal</button>
    </form>
    {workspace.requirements.length > 0 && <details><summary>Goal checklist</summary>
      {workspace.requirements.map(item => <label key={item.id}><input type="checkbox" checked={item.checked} onChange={event => runCommand({ type: "check-requirement", requirementId: item.id, checked: event.target.checked })} />{item.text}</label>)}
    </details>}
    <label htmlFor="work-writing">Work it out here</label>
    <textarea id="work-writing" className={styles.workWriting} value={workspace.notebookText} maxLength={50000} onChange={event => {
      const result = runCommand({ type: "update-notebook", text: event.target.value });
      if (!result.ok) setStatus(result.reason);
    }} placeholder={"Write a paragraph, jot down a plan, or type your steps:\n2(x + 3) = 14\n2x + 6 = 14"} />
    <div className={styles.actions}><button type="button" className="pixel-button tone-cream" onClick={() => downloadFile(notebookExport(workspace))}>Download work</button><span>{workspace.notebookText.length.toLocaleString()} / 50,000</span></div>
    <details><summary>Equations & graphs</summary><MathTools /></details>
    <p role="status">{status || saveStatus}</p>
  </section>;
}
