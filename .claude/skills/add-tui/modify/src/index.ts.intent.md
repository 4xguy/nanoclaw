# Intent: src/index.ts modifications

## What changed
Added TUI channel initialization alongside existing WhatsApp and Telegram channels. Exported `main()` so it can be called from `scripts/tui.ts`. Added cross-channel activity notifications so the TUI channel bar shows unread counts for external channels.

## Key sections

### Imports (top of file)
- Added: `TuiChannel` from `./channels/tui.js`
- Added: `TUI_ENABLED`, `TUI_GROUP_FOLDER` to config import

### Module-level state
- Added: `let tuiChannel: TuiChannel | null = null` — tracks the TUI channel instance for cross-channel notifications

### processGroupMessages — TUI rendering of agent output
- Before sending agent output to a non-TUI channel, clears typing indicator (`setTyping(false)`) so the spinner disappears immediately
- After sending agent output to a non-TUI channel, calls `tuiChannel.renderExternalResponse(channel.name, text)` to render the response in the appropriate TUI tab and increment unread if not active

### main() — MUST be exported
- Changed: `async function main()` -> `export async function main()`
- This is required because `scripts/tui.ts` imports `main` and calls it explicitly
- Added: conditional TUI creation (`if (TUI_ENABLED)`) after the WhatsApp channel block
- The TUI block auto-registers a `tui:local` group if not already present, then creates and connects a `TuiChannel`
- **Folder conflict avoidance**: Before registering, checks if `TUI_GROUP_FOLDER` (default: `'main'`) is already taken by another group. If so, falls back to `'tui'` to avoid a SQLite UNIQUE constraint violation on the `folder` column. Pattern: `const tuiFolder = Object.values(registeredGroups).some((g) => g.folder === TUI_GROUP_FOLDER) ? 'tui' : TUI_GROUP_FOLDER;`
- Passes `allChats: getAllChats` to TuiChannel constructor so it can look up non-registered chats when routing messages to external channels
- Stores TUI instance in `tuiChannel` module variable (not just local `tui`)
- After TUI connects, calls `tuiChannel.registerExternalChannels(channels)` so other channels appear as tabs
- Pattern matches the Telegram conditional: guard with a feature flag, push to `channels`, call `connect()`

### channelOpts.onMessage — TUI rendering of inbound messages
- `onMessage` callback expanded from arrow expression to block body
- After storing the message, renders inbound messages from non-TUI channels in their TUI tab via `tuiChannel.renderExternalMessage(sourceChannel.name, msg.sender_name, msg.content)`, which also increments unread if that tab is not active

### Warning log style
- All `console.log(`Warning: ...`)` calls must use `logger.warn(...)` instead (structured logging)

## Invariants
- All existing channel logic, message processing, cursor management is preserved
- All functions (loadState, saveState, registerGroup, processGroupMessages, runAgent, startMessageLoop, recoverPendingMessages, ensureContainerSystemRunning) are unchanged
- Re-exports and test helpers remain
- The `isDirectRun` guard at bottom is unchanged

## Must-keep
- The `escapeXml` and `formatMessages` re-exports
- The `_setRegisteredGroups` test helper
- The `isDirectRun` guard at bottom
- All error handling and cursor rollback logic in processGroupMessages
- `export` keyword on `main()` function declaration
- `tuiChannel` module-level variable (used for cross-channel notifications)
- `tuiChannel.registerExternalChannels(channels)` call after TUI connect
- `tuiChannel.renderExternalMessage()` call in onMessage
- `tuiChannel.renderExternalResponse()` call in processGroupMessages
