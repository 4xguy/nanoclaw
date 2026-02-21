# Intent: src/config.ts modifications

## What changed
Added two new configuration exports for TUI channel support.

## Key sections
- **readEnvFile call**: Must include `TUI_ENABLED` and `TUI_GROUP_FOLDER` in the keys array. NanoClaw does NOT load `.env` into `process.env` — all `.env` values must be explicitly requested via `readEnvFile()`.
- **TUI_ENABLED**: Boolean flag from `process.env` or `envConfig`, when `true` enables the TUI channel
- **TUI_GROUP_FOLDER**: Group folder for TUI session (determines mount privileges), defaults to 'main'

## Invariants
- All existing config exports remain unchanged
- New TUI keys are added to the `readEnvFile` call alongside existing keys
- New exports are appended at the end of the file
- No existing behavior is modified — TUI config is additive only
- Both `process.env` and `envConfig` are checked (same pattern as `ASSISTANT_NAME`)

## Must-keep
- All existing exports (`ASSISTANT_NAME`, `POLL_INTERVAL`, `TRIGGER_PATTERN`, etc.)
- The `readEnvFile` pattern — ALL config read from `.env` must go through this function
- The `escapeRegex` helper and `TRIGGER_PATTERN` construction
