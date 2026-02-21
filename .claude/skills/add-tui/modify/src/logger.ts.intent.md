# Intent: src/logger.ts modifications

## What changed
When TUI is active (`TUI_ENABLED=true`), redirect all pino log output to a file instead of stdout/stderr. This prevents log noise from corrupting the terminal UI rendering.

## Key sections
- **TUI detection**: Reads `process.env.TUI_ENABLED` directly (not via config.ts) to avoid circular imports. Logger is imported by nearly every module so it must be dependency-free.
- **Log file**: `logs/nanoclaw.log` (relative to project root via `process.cwd()`)
- **Conditional transport**: TUI mode uses `pino.destination()` to write to file; normal mode uses `pino-pretty` on stdout
- **Console overrides**: When TUI is active, `console.log`, `console.info`, `console.warn`, and `console.error` are overridden to route through the pino file logger. This catches output from libraries that bypass pino (e.g., baileys/libsignal SessionEntry dumps) and prevents them from corrupting the terminal UI.

## Invariants
- All existing logger behavior (uncaughtException, unhandledRejection handlers) is preserved
- Log level configuration via `LOG_LEVEL` env var is preserved
- Non-TUI mode behavior is completely unchanged (pino-pretty to stdout)

## Must-keep
- The `process.env.TUI_ENABLED` check (not config.ts import)
- The `console.*` overrides inside the `if (TUI_ENABLED)` block (must come after logger export)
- Both uncaught error handlers at bottom
- The `sync: false` option on pino.destination for performance
