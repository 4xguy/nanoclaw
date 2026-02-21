# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Personal Claude assistant accessible via WhatsApp. Single Node.js process connects to WhatsApp, routes messages to Claude Agent SDK running in Docker containers. Each group gets isolated filesystem, session, and memory. See [README.md](README.md) for philosophy, [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for architecture decisions, [docs/SECURITY.md](docs/SECURITY.md) for the security model.

## Commands

```bash
npm run dev          # Run with hot reload (tsx)
npm run build        # Compile TypeScript (tsc)
npm run typecheck    # Type-check without emitting
npm run test         # Run all tests (vitest)
npm run test:watch   # Run tests in watch mode
npx vitest run src/db.test.ts              # Run a single test file
npx vitest run -t "test name pattern"      # Run tests matching a pattern
npm run format       # Format with prettier
npm run format:check # Check formatting
./container/build.sh # Rebuild agent container image
```

## Architecture

```
WhatsApp (baileys) → SQLite → Polling loop → Docker container (Claude Agent SDK) → Response
```

**Host process** (`src/`): Connects to WhatsApp, stores messages in SQLite, polls for new messages, spawns Docker containers for each agent invocation, handles IPC, runs scheduled tasks.

**Container** (`container/`): Runs Claude Agent SDK via `agent-runner`. Receives input as JSON on stdin (including secrets), outputs results wrapped in `---NANOCLAW_OUTPUT_START---` / `---NANOCLAW_OUTPUT_END---` markers. An MCP server (`ipc-mcp-stdio.ts`) inside the container provides tools for sending messages, scheduling tasks, and managing groups via IPC files.

**IPC flow**: Container writes JSON files to `/workspace/ipc/{messages,tasks}/`. Host polls `data/ipc/{group}/` directories. Follow-up messages from host to container go through `data/ipc/{group}/input/` as JSON files. Close sentinel (`_close`) signals container shutdown.

### Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Main orchestrator: state management, message loop, agent invocation |
| `src/channels/whatsapp.ts` | WhatsApp connection via baileys, message send/receive |
| `src/container-runner.ts` | Builds volume mounts, spawns Docker containers, streams output |
| `src/container-runtime.ts` | Container runtime abstraction (swap Docker/Apple Container here) |
| `src/group-queue.ts` | Per-group queue with global concurrency limit (`MAX_CONCURRENT_CONTAINERS`) |
| `src/ipc.ts` | Polls IPC directories, processes messages/tasks with authorization checks |
| `src/router.ts` | Formats messages as XML for the agent, strips `<internal>` tags from output |
| `src/task-scheduler.ts` | Checks for due tasks every 60s, enqueues them via GroupQueue |
| `src/db.ts` | SQLite schema, migrations, and all DB operations |
| `src/mount-security.ts` | Validates additional mounts against external allowlist |
| `src/types.ts` | Shared TypeScript types (Channel, RegisteredGroup, NewMessage, etc.) |
| `src/config.ts` | All configuration constants (reads from `.env` via `env.ts`) |
| `container/agent-runner/src/index.ts` | Inside container: runs Claude Agent SDK, IPC message loop |
| `container/agent-runner/src/ipc-mcp-stdio.ts` | MCP server providing `send_message`, `schedule_task`, etc. |

### Two Cursor Systems

1. **`lastTimestamp`**: Global "seen" cursor — marks which messages the polling loop has checked.
2. **`lastAgentTimestamp[chatJid]`**: Per-group cursor — marks which messages have been sent to an agent. Rolls back on error (unless output was already sent to user).

### Group Privilege Model

- **Main group** (self-chat): Gets entire project root mounted, can manage all groups and tasks, can write to global memory.
- **Non-main groups**: Only get their own `groups/{name}/` folder and read-only access to `groups/global/`. IPC operations are authorized per-group.

### Container Mounts

Main group: `/workspace/project` (project root, rw), `/workspace/group` (group folder, rw)
Other groups: `/workspace/group` (group folder, rw), `/workspace/global` (global memory, ro)
All groups: `/home/node/.claude` (per-group sessions), `/workspace/ipc` (IPC), `/app/src` (agent-runner source, ro)
Additional mounts validated against external allowlist at `~/.config/nanoclaw/mount-allowlist.json`.

### Secrets Handling

Secrets (`ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`) are read from `.env` at container spawn time and passed via stdin JSON — never written to disk or mounted as files. A `PreToolUse` hook strips them from Bash subprocess environments inside the container.

## Skills System

The `skills-engine/` directory contains a deterministic engine for applying, updating, and managing skill transformations. Skills live in `.claude/skills/` and transform the codebase (e.g., `/add-telegram` adds Telegram support). The engine manages state in `.nanoclaw/`.

## Development Notes

- ESM modules (`"type": "module"`) — imports require `.js` extensions
- Strict TypeScript with `NodeNext` module resolution
- Tests use vitest with co-located `.test.ts` files in `src/` and `skills-engine/__tests__/`
- Tests use `_initTestDatabase()` for in-memory SQLite (no file I/O)
- Run commands directly — don't tell the user to run them
- CI runs: `tsc --noEmit` then `vitest run` on PRs

## Container Build Cache

The container buildkit caches aggressively. `--no-cache` alone does NOT invalidate COPY steps. To force a truly clean rebuild, prune the builder then re-run `./container/build.sh`.

## Contributing

Don't add features. Add skills. See [README.md](README.md#contributing).
