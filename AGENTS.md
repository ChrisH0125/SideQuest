# ShellHacks Agent Guide

This file guides coding agents working on our hackathon project. Explain your
work in plain language because some teammates are building their first project.

## Our Goal

Build one small, polished product that works during the live demo. Finish the
main user journey before adding extra features. Prefer simple code the whole
team can understand and explain.

## Before Making Changes

1. Read this file and `README.md`.
2. Inspect the relevant code before suggesting a solution.
3. Check for existing teammate changes and preserve them.
4. Briefly explain what you plan to change and why.
5. Ask a teammate when a product decision is unclear or would change the main
   idea. Handle routine coding choices yourself.

Do not invent requirements, APIs, environment variables, test results, sponsor
integrations, or completed features. Say clearly when something is planned,
mocked, assumed, or not yet tested.

## How to Build

- Make the smallest complete change that solves the current task.
- Follow the patterns already used in the project.
- Use clear names, small functions, and helpful error messages.
- Reuse existing components and tools before adding new ones.
- Keep business logic separate from page layout and external service calls.
- Avoid unnecessary libraries, large rewrites, copied boilerplate, and clever
  code that teammates will struggle to maintain.
- Remove debugging output and dead code created during the task.
- Never edit generated files or dependency lockfiles by hand.

## Web Experience

- Make pages work on phones and desktop screens.
- Use semantic HTML and visible labels for form fields.
- Make every button, link, form, and dialog usable with a keyboard.
- Keep focus visible and text readable. Do not use color as the only signal.
- Show useful loading, empty, success, and error states.
- Prevent repeated form submissions and preserve input after validation errors.
- Keep interface text concise, specific, and human. Avoid filler, exaggerated
  claims, and generic AI-sounding copy.
- Do not leave fake buttons, broken links, or silent errors in the demo.

## Data and Security

- Validate data received from users, APIs, uploaded files, webhooks, and AI.
- Check permissions on the server when a feature has private data or actions.
- Keep API keys and passwords in ignored environment files. Put only safe
  placeholder names in `.env.example`.
- Never display or log passwords, tokens, private user data, or full environment
  files.
- Use safe database queries through the project's existing data tools.
- Treat third-party services as unreliable. Show a useful error and provide a
  demo fallback when practical.
- Collect and store only the user data the demo actually needs.

## Testing Your Work

Use the commands documented in `README.md` or the project's package scripts.
Run the checks related to your change, then try the affected flow like a real
user.

For meaningful changes, check what applies:

- formatting, linting, and type checking;
- the normal user path and one likely failure;
- phone and desktop layouts;
- keyboard navigation and visible focus;
- browser errors and failed network requests;
- the production build before a demo or deployment.

Never say a check passed unless you ran it successfully. If a check cannot run,
explain the blocker and what remains untested. Do not disable tests, types,
linting, or security checks just to make an error disappear.

## Working With Teammates and Git

- Before editing, check the current Git status and protect existing work.
- If a task branch would keep work safer, create it for the teammate and explain
  in one sentence what it does. Do not expect them to know Git commands.
- Do not overwrite, delete, or reformat unrelated teammate work.
- Before committing, show the teammate what changed and how it was tested.
- Do not commit, push, merge, deploy, create paid resources, or submit the
  project unless a teammate explicitly asks.
- If Git reports a conflict, stop and explain it. Preserve both teammates' work
  until the intended result is understood.
- Never commit secrets, `.env` files, dependencies, build output, databases,
  logs, or editor files.

## How Agents Should Communicate

- Lead with the result or the current blocker.
- Use plain language and explain unfamiliar terms briefly.
- Give teammates commands only when they need to run them themselves.
- Do the authorized work instead of returning a long tutorial or generic plan.
- When blocked, investigate first. Then leave a short handoff describing the
  evidence, what remains, and the safest next step.

## Done Means

The requested behavior works, the relevant checks pass, the affected flow was
tried, errors are handled, unrelated work is untouched, and setup instructions
or `.env.example` are updated when needed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
