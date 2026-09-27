"use client";

import { Background, Controls, MarkerType, ReactFlow, useNodesState, type Node, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Card, WorkspaceState } from "@/lib/contracts";
import { useWorkspace } from "./workspace-provider";
import styles from "./workspace.module.css";

type CardNode = Node<{ label: string }>;
function nodesFor(workspace: WorkspaceState): CardNode[] {
  return workspace.cards.map(card => ({
    id: card.id, position: card.position, data: { label: card.text },
    selected: workspace.selectedCardIds.includes(card.id),
    className: card.status === "aside" ? styles.asideCard : "",
    ariaLabel: `${card.kind === "step" ? "Next step" : "Idea"}: ${card.text}`,
  }));
}
export function nextCardPosition(count: number) {
  return { x: (count % 3) * 260, y: Math.floor(count / 3) * 160 };
}

function CardEditor({ card }: { card: Card }) {
  const { runCommand } = useWorkspace();
  const [text, setText] = useState(card.text);
  const [status, setStatus] = useState("");
  return <form className={styles.cardEditor} onSubmit={event => {
    event.preventDefault();
    const result = runCommand({ type: "edit-card", cardId: card.id, text });
    setStatus(result.ok ? "Card updated." : result.reason);
  }}>
    <label htmlFor="edit-card">Selected idea</label>
    <textarea id="edit-card" value={text} onChange={event => setText(event.target.value)} maxLength={500} rows={2} required />
    <div className={styles.actions}>
      <button type="submit">Save edit</button>
      <button type="button" disabled={card.status === "aside"} onClick={() => {
        const result = runCommand({ type: "move-aside", cardId: card.id });
        setStatus(result.ok ? "Moved aside." : result.reason);
      }}>Move aside</button>
      <button type="button" onClick={() => runCommand({ type: "select-cards", cardIds: [] })}>Deselect</button>
    </div>
    {status && <p role="status">{status}</p>}
  </form>;
}

export function IdeaBoard({ embedded = false }: { embedded?: boolean }) {
  const { workspace, canUndo, runCommand, undo } = useWorkspace();
  const [nodes, setNodes, onNodesChange] = useNodesState<CardNode>(nodesFor(workspace));
  const flow = useRef<ReactFlowInstance<CardNode> | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const count = useRef(workspace.cards.length);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const addInput = useRef<HTMLTextAreaElement>(null);
  const selected = workspace.cards.find(card => card.id === workspace.selectedCardIds[0]);
  const edges = useMemo(() => workspace.connections.map(connection => ({
    id: connection.id, source: connection.fromCardId, target: connection.toCardId,
    markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#79628c", strokeWidth: 2 },
  })), [workspace.connections]);

  useEffect(() => {
    if (!canvas.current) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => flow.current?.fitView({ padding: 0.18, maxZoom: 1.1 }));
    });
    observer.observe(canvas.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    setNodes(nodesFor(workspace));
    if (count.current !== workspace.cards.length) {
      count.current = workspace.cards.length;
      requestAnimationFrame(() => flow.current?.fitView({ padding: 0.3, maxZoom: 1.1 }));
    }
  }, [workspace.cards, workspace.selectedCardIds, setNodes, workspace]);

  function addCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = runCommand({ type: "add-card", card: {
      id: crypto.randomUUID(), text, kind: "idea", status: "active", position: nextCardPosition(workspace.cards.length),
    } });
    setStatus(result.ok ? "Idea added." : result.reason);
    if (result.ok) { setText(""); setToolsOpen(false); }
  }

  return <section className={styles.board} aria-label="Idea board" data-embedded={embedded}>
    <div className={styles.boardToolbar}>
      <div><h1 className={styles.boardTitle}>A little room for your ideas.</h1><p>Start with one thought. We’ll find the next step together.</p></div>
      <div className={styles.actions}>
        <button type="button" onClick={() => { setToolsOpen(true); requestAnimationFrame(() => addInput.current?.focus()); }}>+ Add idea</button>
        <button type="button" aria-expanded={toolsOpen} aria-controls="board-tools" onClick={() => setToolsOpen(value => !value)}>Tools</button>
        <button type="button" disabled={!canUndo} onClick={() => { undo(); setStatus("Last board change undone."); }}>Undo</button>
      </div>
    </div>
    <div className={styles.boardBody}>
      <div ref={canvas} className={styles.canvas} aria-label="Interactive idea board">
        <ReactFlow<CardNode>
          nodes={nodes} edges={edges} onNodesChange={onNodesChange}
          onInit={instance => { flow.current = instance; }}
          onNodeClick={(_, node) => runCommand({ type: "select-cards", cardIds: [node.id] })}
          onPaneClick={() => runCommand({ type: "select-cards", cardIds: [] })}
          onNodeDragStop={(_, node) => runCommand({ type: "move-card", cardId: node.id, position: node.position })}
          onConnect={connection => {
            const result = runCommand({ type: "connect", connectionId: crypto.randomUUID(), fromCardId: connection.source, toCardId: connection.target });
            setStatus(result.ok ? "Ideas connected." : result.reason);
          }}
          fitView fitViewOptions={{ padding: 0.4, maxZoom: 1.1 }}
          minZoom={0.3} maxZoom={1.8} deleteKeyCode={null}
          nodesFocusable edgesFocusable
        >
          <Background color="#bdae96" gap={24} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
        {workspace.cards.length === 0 && <p className={styles.empty}>Add a thought, or tell Pip what you’re working on.</p>}
      </div>
      {toolsOpen && <aside id="board-tools" className={styles.tools} aria-label="Board tools">
        <div className={styles.actions}><h2>Board tools</h2><button type="button" onClick={() => setToolsOpen(false)}>Close tools</button></div>
        <form onSubmit={addCard}>
          <label htmlFor="new-card">Your idea</label>
          <textarea ref={addInput} id="new-card" value={text} onChange={event => setText(event.target.value)} rows={3} maxLength={500} required />
          <button type="submit">Add card</button>
        </form>
        <details>
          <summary>All cards · {workspace.cards.length}</summary>
          <ul className={styles.cardList}>{workspace.cards.map(card => <li key={card.id}>
            <button type="button" aria-pressed={workspace.selectedCardIds.includes(card.id)} onClick={() => runCommand({ type: "select-cards", cardIds: [card.id] })}>{card.text} {card.status === "aside" ? " · aside" : ""}</button>
          </li>)}</ul>
        </details>
        <details>
          <summary>Connect ideas without dragging</summary>
          <form onSubmit={event => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const result = runCommand({ type: "connect", connectionId: crypto.randomUUID(), fromCardId: String(data.get("from")), toCardId: String(data.get("to")) });
            setStatus(result.ok ? "Ideas connected." : result.reason);
          }}>
            <label htmlFor="connect-from">From</label>
            <select id="connect-from" name="from">{workspace.cards.map(card => <option key={card.id} value={card.id}>{card.text}</option>)}</select>
            <label htmlFor="connect-to">To</label>
            <select id="connect-to" name="to" defaultValue={workspace.cards[1]?.id}>{workspace.cards.map(card => <option key={card.id} value={card.id}>{card.text}</option>)}</select>
            <button type="submit" disabled={workspace.cards.length < 2}>Connect cards</button>
          </form>
        </details>
      </aside>}
    </div>
    {selected && <CardEditor key={selected.id + selected.text} card={selected} />}
    <p className={styles.boardStatus} role="status">{status || "Drag to arrange · Use the dots to connect · Select a card to edit"}</p>
  </section>;
}
