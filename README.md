# shellhacks

Sidequest: a cozy pixel workspace that helps people start and keep going on an
overwhelming writing assignment, with Pip the pixel cat. See `AGENTS.md` for how
we work.

Status: project scaffold only. No Pip, board, voice, or Gemini features exist yet.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- ESLint
- npm (use npm only, so everyone shares one `package-lock.json`)

## Setup

Requires Node.js 20.9 or newer (24 LTS recommended), and npm.

```bash
git clone https://github.com/ChrisH0125/shellhacks.git
cd shellhacks
npm install
cp .env.example .env.local
```

Put real values in `.env.local`. Never commit it.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app at http://localhost:3000 and reload on save |
| `npm run lint` | Check code for common mistakes |
| `npm run typecheck` | Check data types without building |
| `npm run build` | Production build; run before any demo |
| `npm start` | Run the production build |

## Folder layout

- `src/app/` pages and server routes (`src/app/api/`)
- `src/lib/` shared types, validation, storage, and rewards
- `src/components/` UI pieces
- `public/` images and pixel art
