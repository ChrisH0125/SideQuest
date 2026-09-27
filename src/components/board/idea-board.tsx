"use client";

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  useNodesState,
  type Connection as FlowConnection,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Card, WorkspaceState } from "@/lib/contracts";
import type { WorkspaceCommand } from "@/lib/workspace-reducer";
import { useWorkspace } from "./workspace-provider";

type CardNode = Node<{ label: string }>;

function cardNodes(workspace: WorkspaceState): CardNode[] {
  const selected = new Set(workspace.selectedCardIds);
  return workspace.cards.map((card) => ({
    id: card.id,
    position: card.position,
    data: { label: card.text },
    selected: selected.has(card.id),
    className: card.status === "aside" ? "opacity-55" : "",
    ariaLabel: `${card.kind === "step" ? "Next step" : "Idea"}: ${card.text}`,
  }));
}

function cardEdges(workspace: WorkspaceState): Edge[] {
  return workspace.connections.map((connection) => ({
    id: connection.id,
    source: connection.fromCardId,
    target: connection.toCardId,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "#6d5a94", strokeWidth: 2 },
  }));
}

function nextCardPosition(cardCount: number): Card["position"] {
  return {
    x: 40 + (cardCount % 3) * 220,
    y: 40 + Math.floor(cardCount / 3) * 140,
  };
}

function cardsAreConnected(workspace: WorkspaceState, fromCardId: string, toCardId: string) {
  return workspace.connections.some(
    (connection) =>
      (connection.fromCardId === fromCardId && connection.toCardId === toCardId) ||
      (connection.fromCardId === toCardId && connection.toCardId === fromCardId),
  );
}

function SelectedCardEditor({
  card,
  runCommand,
  onStatus,
}: {
  card: Card;
  runCommand: (command: WorkspaceCommand) => void;
  onStatus: (message: string) => void;
}) {
  const [editText, setEditText] = useState(card.text);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runCommand({ type: "edit-card", cardId: card.id, text: editText });
    onStatus("Card updated.");
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border-2 border-[#3d3452] bg-[#fffdf7] p-4">
      <h2 className="text-lg font-black">Selected card</h2>
      <label htmlFor="edit-card" className="mt-3 block text-sm font-bold">Card text</label>
      <textarea
        id="edit-card"
        value={editText}
        onChange={(event) => setEditText(event.target.value)}
        maxLength={500}
        rows={3}
        className="mt-1 w-full resize-y rounded-lg border-2 border-[#8f82a5] bg-white p-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#765f9d]"
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="submit" className="rounded-lg bg-[#6d5a94] px-3 py-2 text-sm font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#3d3452]">
          Save edit
        </button>
        <button
          type="button"
          onClick={() => {
            runCommand({ type: "move-aside", cardId: card.id });
            onStatus("Card moved to explore later.");
          }}
          disabled={card.status === "aside"}
          className="rounded-lg border-2 border-[#6d5a94] px-3 py-2 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#3d3452] disabled:opacity-45"
        >
          Move aside
        </button>
      </div>
    </form>
  );
}

export function IdeaBoard({ embedded = false }: { embedded?: boolean }) {
  const { workspace, canUndo, runCommand, undo } = useWorkspace();
  const [nodes, setNodes, onNodesChange] = useNodesState<CardNode>(cardNodes(workspace));
  const flowRef = useRef<ReactFlowInstance<CardNode> | null>(null);
  const previousCardCountRef = useRef(workspace.cards.length);
  const [newCardText, setNewCardText] = useState("");
  const [connectFrom, setConnectFrom] = useState(workspace.cards[0]?.id ?? "");
  const [connectTo, setConnectTo] = useState(workspace.cards[1]?.id ?? "");
  const [statusMessage, setStatusMessage] = useState("Board ready.");

  const edges = useMemo(() => cardEdges(workspace), [workspace]);
  const selectedCard = workspace.cards.find(({ id }) => workspace.selectedCardIds[0] === id);

  useEffect(() => {
    setNodes(cardNodes(workspace));
    if (workspace.cards.length !== previousCardCountRef.current) {
      previousCardCountRef.current = workspace.cards.length;
      requestAnimationFrame(() => flowRef.current?.fitView({ padding: 0.2 }));
    }
  }, [setNodes, workspace]);

  const handleNodeClick: NodeMouseHandler<CardNode> = (_, node) => {
    runCommand({ type: "select-cards", cardIds: [node.id] });
    setStatusMessage("Card selected.");
  };

  const handleConnect = (connection: FlowConnection) => {
    if (!connection.source || !connection.target) return;
    if (cardsAreConnected(workspace, connection.source, connection.target)) {
      setStatusMessage("Those cards are already connected.");
      return;
    }
    runCommand({
      type: "connect",
      connectionId: `connection-${crypto.randomUUID()}`,
      fromCardId: connection.source,
      toCardId: connection.target,
    });
    setStatusMessage("Cards connected.");
  };

  const handleAddCard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = newCardText.trim();
    if (!text) {
      setStatusMessage("Write an idea before adding a card.");
      return;
    }
    const id = `card-${crypto.randomUUID()}`;
    runCommand({
      type: "add-card",
      card: {
        id,
        text,
        kind: "idea",
        position: nextCardPosition(workspace.cards.length),
        status: "active",
      },
    });
    setNewCardText("");
    setStatusMessage("Idea added to the board.");
  };

  const connectCards = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!connectFrom || !connectTo || connectFrom === connectTo) {
      setStatusMessage("Choose two different cards to connect.");
      return;
    }
    if (cardsAreConnected(workspace, connectFrom, connectTo)) {
      setStatusMessage("Those cards are already connected.");
      return;
    }
    runCommand({
      type: "connect",
      connectionId: `connection-${crypto.randomUUID()}`,
      fromCardId: connectFrom,
      toCardId: connectTo,
    });
    setStatusMessage("Cards connected.");
  };

  return (
    <main className={embedded ? "text-[#2f2940]" : "min-h-screen bg-[#f6f0df] px-4 py-6 text-[#2f2940] sm:px-6 lg:px-8"}>
      <div className={embedded ? "" : "mx-auto max-w-7xl"}>
        {!embedded && <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#765f9d]">SideQuest workspace</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Untangle your ideas</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#5c536b]">
              Drag ideas into place, connect related thoughts, and set aside anything you want to revisit later.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              undo();
              setStatusMessage("Last board change undone.");
            }}
            disabled={!canUndo}
            className="rounded-lg border-2 border-[#3d3452] bg-white px-4 py-2 font-bold shadow-[3px_3px_0_#3d3452] transition-transform hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#765f9d] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
          >
            Undo last change
          </button>
        </header>}

        <div className={`grid gap-5 ${embedded ? "min-[900px]:grid-cols-[minmax(0,1fr)_18rem]" : "lg:grid-cols-[minmax(0,1fr)_20rem]"}`}>
          <section aria-labelledby="board-heading" className="overflow-hidden rounded-xl border-2 border-[#3d3452] bg-[#fffdf7] shadow-[5px_5px_0_#3d3452]">
            <h2 id="board-heading" className="border-b-2 border-[#3d3452] bg-[#e9ddfa] px-4 py-3 text-lg font-black">
              Idea board
            </h2>
            <div className={`${embedded ? "h-[28rem] min-h-[22rem]" : "h-[34rem] min-h-[28rem]"} w-full`} aria-label="Interactive idea board">
              <ReactFlow<CardNode>
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onInit={(instance) => {
                  flowRef.current = instance;
                }}
                onNodeClick={handleNodeClick}
                onNodeDragStop={(_, node) =>
                  runCommand({ type: "move-card", cardId: node.id, position: node.position })
                }
                onConnect={handleConnect}
                fitView
                minZoom={0.45}
                maxZoom={1.6}
                nodesFocusable
                edgesFocusable
              >
                <Background color="#c9bdd8" gap={24} />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </section>

          <aside aria-label="Board tools" className="space-y-4">
            <form onSubmit={handleAddCard} className="rounded-xl border-2 border-[#3d3452] bg-[#fffdf7] p-4">
              <h2 className="text-lg font-black">Add an idea</h2>
              <label htmlFor="new-card" className="mt-3 block text-sm font-bold">Idea text</label>
              <textarea
                id="new-card"
                value={newCardText}
                onChange={(event) => setNewCardText(event.target.value)}
                maxLength={500}
                rows={3}
                className="mt-1 w-full resize-y rounded-lg border-2 border-[#8f82a5] bg-white p-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#765f9d]"
              />
              <button type="submit" className="mt-3 w-full rounded-lg bg-[#6d5a94] px-3 py-2 font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#3d3452]">
                Add card
              </button>
            </form>

            <section aria-labelledby="ideas-list-heading" className="rounded-xl border-2 border-[#3d3452] bg-[#fffdf7] p-4">
              <h2 id="ideas-list-heading" className="text-lg font-black">All cards</h2>
              <p className="mt-1 text-xs text-[#685e75]">This list offers the same selection controls without dragging.</p>
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {workspace.cards.map((card) => (
                  <li key={card.id}>
                    <button
                      type="button"
                      onClick={() => runCommand({ type: "select-cards", cardIds: [card.id] })}
                      aria-pressed={workspace.selectedCardIds.includes(card.id)}
                      className="w-full rounded-lg border-2 border-[#b5a8c7] px-3 py-2 text-left text-sm hover:bg-[#f1eafd] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#765f9d] aria-pressed:border-[#6d5a94] aria-pressed:bg-[#e9ddfa]"
                    >
                      <span className="block font-bold">{card.text}</span>
                      <span className="text-xs capitalize text-[#685e75]">{card.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {workspace.pending.cards.length > 0 && (
              <section aria-labelledby="pip-suggestions-heading" className="rounded-xl border-2 border-dashed border-[#6d5a94] bg-[#f1eafd] p-4">
                <h2 id="pip-suggestions-heading" className="text-lg font-black">Pip suggests</h2>
                <ul className="mt-3 space-y-3">
                  {workspace.pending.cards.map((suggestion) => (
                    <li key={suggestion.suggestionId} className="rounded-lg border-2 border-[#b5a8c7] bg-white p-3">
                      <p className="text-sm font-bold">{suggestion.text}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-[#6d5a94] px-3 py-2 text-sm font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#3d3452]"
                          onClick={() => {
                            runCommand({
                              type: "accept-card",
                              suggestionId: suggestion.suggestionId,
                              cardId: `card-${suggestion.suggestionId}`.slice(0, 64),
                              position: nextCardPosition(workspace.cards.length),
                            });
                            setStatusMessage("Pip's idea was added to the board.");
                          }}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border-2 border-[#6d5a94] px-3 py-2 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#3d3452]"
                          onClick={() => {
                            runCommand({ type: "dismiss-card", suggestionId: suggestion.suggestionId });
                            setStatusMessage("Suggestion dismissed.");
                          }}
                        >
                          Skip
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {selectedCard ? (
              <SelectedCardEditor
                key={selectedCard.id}
                card={selectedCard}
                runCommand={runCommand}
                onStatus={setStatusMessage}
              />
            ) : null}

            <form onSubmit={connectCards} className="rounded-xl border-2 border-[#3d3452] bg-[#fffdf7] p-4">
              <h2 className="text-lg font-black">Connect two cards</h2>
              <label htmlFor="connect-from" className="mt-3 block text-sm font-bold">From</label>
              <select id="connect-from" value={connectFrom} onChange={(event) => setConnectFrom(event.target.value)} className="mt-1 w-full rounded-lg border-2 border-[#8f82a5] bg-white p-2">
                {workspace.cards.map((card) => <option key={card.id} value={card.id}>{card.text}</option>)}
              </select>
              <label htmlFor="connect-to" className="mt-3 block text-sm font-bold">To</label>
              <select id="connect-to" value={connectTo} onChange={(event) => setConnectTo(event.target.value)} className="mt-1 w-full rounded-lg border-2 border-[#8f82a5] bg-white p-2">
                {workspace.cards.map((card) => <option key={card.id} value={card.id}>{card.text}</option>)}
              </select>
              <button type="submit" className="mt-3 w-full rounded-lg border-2 border-[#6d5a94] px-3 py-2 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#3d3452]">
                Connect cards
              </button>
            </form>

            <p role="status" aria-live="polite" aria-atomic="true" className="rounded-lg bg-[#3d3452] px-3 py-2 text-sm text-white">
              {statusMessage}
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
