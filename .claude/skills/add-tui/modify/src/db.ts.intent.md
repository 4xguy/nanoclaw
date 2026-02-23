# Intent: src/db.ts modifications

## What changed
Added model configuration table, session deletion, and history retrieval for TUI features.

## Key sections
- **model_config table**: Created via `CREATE TABLE IF NOT EXISTS` in `createSchema()`, stores per-group model ID
- **deleteSession(groupFolder)**: Removes session from DB so next agent invocation starts fresh
- **getModelConfig / setModelConfig**: Per-group model selection stored in `model_config` table
- **getRecentMessages(chatJid, limit, before?)**: Returns recent messages for history loading, ordered newest-first with optional pagination cursor

## Invariants
- All existing DB functions remain unchanged
- New table creation is safe for existing DBs (IF NOT EXISTS)
- `getRecentMessages` returns newest-first order (caller reverses for display)
- New functions are appended after existing session accessors

## Must-keep
- All existing schema (chats, messages, scheduled_tasks, sessions, registered_groups, etc.)
- All existing migration blocks in `createSchema()`
- All existing function signatures unchanged
