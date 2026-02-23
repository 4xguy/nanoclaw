---
name: add-tui
description: Add a Terminal UI channel to NanoClaw using pi-tui. Renders a full chat interface in the terminal with multi-channel switching, syntax-highlighted assistant output, and an inline editor for composing messages.
---

# Add TUI Channel

This skill adds a Terminal UI channel to NanoClaw using the skills engine for deterministic code changes, then walks through interactive setup.

## Phase 1: Pre-flight

### Check if already applied

Read `.nanoclaw/state.yaml`. If `tui` is in `applied_skills`, skip to Phase 3 (Configure). The code changes are already in place.

## Phase 2: Apply Code Changes

Run the skills engine to apply this skill's code package. The package files are in this directory alongside this SKILL.md.

### Initialize skills system (if needed)

If `.nanoclaw/` directory doesn't exist yet:

```bash
npx tsx scripts/apply-skill.ts --init
```

Or call `initSkillsSystem()` from `skills-engine/migrate.ts`.

### Apply the skill

```bash
npx tsx scripts/apply-skill.ts .claude/skills/add-tui
```

This deterministically:
- Adds `src/channels/tui.ts` (TuiChannel class implementing Channel interface)
- Adds `src/channels/tui.test.ts` (unit tests for the TUI channel)
- Adds `src/tui/` directory with the full pi-tui application (app, adapter, channel bar, theme, syntax theme, and message components)
- Adds `scripts/tui.ts` launch script (stops systemd service before launching, restarts on exit)
- Three-way merges TUI support into `src/index.ts` (TuiChannel import, conditional init, exports `main()`)
- Three-way merges TUI config into `src/config.ts` (TUI_ENABLED, TUI_GROUP_FOLDER exports)
- Three-way merges logger routing into `src/logger.ts` (file-only logging when TUI is active)
- Installs the `@mariozechner/pi-tui`, `chalk`, and `cli-highlight` npm dependencies
- Adds `tui` npm script to `package.json`
- Records the application in `.nanoclaw/state.yaml`

If the apply reports merge conflicts, read the intent files:
- `modify/src/index.ts.intent.md` — what changed and invariants for index.ts
- `modify/src/config.ts.intent.md` — what changed for config.ts
- `modify/src/logger.ts.intent.md` — what changed for logger.ts

### Validate code changes

```bash
npm test
npm run build
```

All tests must pass (including the new TUI channel tests) and build must be clean before proceeding.

## Phase 3: Configure

### Set environment variables

Add to `.env`:

```bash
TUI_ENABLED=true
```

If this is not the main group (i.e., the TUI session should use a specific group folder rather than the default `main`):

```bash
TUI_GROUP_FOLDER=<folder-name>
```

Leave `TUI_GROUP_FOLDER` unset to use the `main` folder (full project root access and global memory writes).

## Phase 4: Verify

### Start the TUI

```bash
npm run tui
```

This stops the nanoclaw systemd service (if running), sets `TUI_ENABLED=true`, imports and calls `main()` from `src/index.ts`, and restarts the service on exit. All other configured channels (WhatsApp, Telegram) activate normally alongside the TUI. Logs go to `logs/nanoclaw.log` instead of stdout when TUI is active.

### Test message flow

1. The terminal should render the chat interface
2. Type a message and press Enter — the agent should respond within a few seconds
3. Responses appear with syntax highlighting in the chat log
4. Press `Ctrl+D` to exit

### Check logs if needed

```bash
tail -f logs/nanoclaw.log
```

## Troubleshooting

### TUI does not appear

1. Verify `TUI_ENABLED=true` is set (either in `.env` or via `npm run tui` which sets it automatically)
2. Check that the build is current: `npm run build`
3. Confirm `@mariozechner/pi-tui` installed: `ls node_modules/@mariozechner/pi-tui`

### Messages not reaching agent

1. Check `TUI_GROUP_FOLDER` matches a registered group folder in the database
2. Run `sqlite3 store/messages.db "SELECT * FROM registered_groups"` to list registered groups
3. The TUI channel uses JID format `tui:<folder>` — confirm this appears in registered groups

### Agent responds but output does not render

1. Confirm terminal supports 256 colors: `echo $TERM`
2. Try a different terminal emulator
3. Check `chalk` is installed: `node -e "import('chalk').then(m => console.log(m.default.green('ok')))"`

### Syntax highlighting errors

If `cli-highlight` throws on import, it may need a CommonJS compatibility shim. Check:
```bash
node -e "import('cli-highlight').then(() => console.log('ok'))"
```

## After Setup

### Slash Commands

The TUI supports slash commands on the TUI tab (not external channel tabs):

| Command | Description |
|---------|-------------|
| `/clear` | Delete session from DB, clear chat, reset token counters. Starts fresh context. |
| `/model` | Show current model and available short names |
| `/model sonnet-4` | Set model to `claude-sonnet-4-6` for this group |
| `/model opus-4` | Set model to `claude-opus-4-6` for this group |
| `/model haiku-4.5` | Set model to `claude-haiku-4-5-20251001` for this group |

Model selection is per-group and persists across sessions (stored in `model_config` DB table). Full SDK model IDs are also accepted.

### Status Line

The channel bar at the bottom shows: `TUI* WA | sonnet-4 | 12k`

- Left side: channel tabs with active indicator (`*`) and unread counts
- Right side: current model name and cumulative token usage for the session

Token usage updates after each agent response and resets on `/clear`.

### History

On startup, the last 20 messages are loaded from the database. Press `PageUp` to load 20 more (paginated by timestamp). A separator line marks where history ends and the current session begins.

### Multi-Channel Switching

The TUI supports multi-channel switching with `Shift+Tab` when multiple channels are registered. Each channel appears in the channel bar at the bottom of the screen. This works across all registered groups — use the TUI as a unified inbox alongside your WhatsApp and Telegram channels.
