// Temporary theme sanity page. Replace with the real RoomScene when it lands.
// Its only job is to prove the pixel palette, fonts, and pixel-border utility
// are wired up end-to-end.

export default function Home() {
  return (
    <main className="flex min-w-0 w-full flex-1 flex-col items-center justify-center gap-8 p-6 sm:p-8">
      <h1 className="max-w-full text-center font-display text-3xl tracking-[0.12em] text-foreground sm:text-5xl sm:tracking-widest">
        <span className="mr-1 inline-block bg-sun px-2 pixel-border-sm">S</span>
        ideQuest
      </h1>

      <p className="max-w-md text-center text-muted">
        Cozy pixel workspace for starting on assignments you&apos;re stuck on.
      </p>

      <div className="flex items-center gap-3">
        <span className="pixel-border-sm bg-sun px-3 py-1 font-display text-lg tracking-wider text-ink">
          2 COINS
        </span>
        <button
          type="button"
          className="pixel-border-sm bg-pinky px-4 py-2 font-display text-sm tracking-wider text-ink"
        >
          SHOP
        </button>
      </div>

      <section className="pixel-border bg-surface w-full max-w-2xl p-8 text-center">
        <p className="font-display text-lg tracking-widest text-muted">
          THE ROOM LIVES HERE
        </p>
        <p className="mt-3 text-sm text-foreground">
          Chris&apos;s board, Pip, the notebook, the tape recorder, and the shop
          — all land inside this frame as components ship.
        </p>
      </section>
    </main>
  );
}
