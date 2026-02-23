# Intent: container/agent-runner/src/index.ts modifications

## What changed
Added model pass-through to SDK query() and token usage extraction from SDK messages.

## Key sections
- **ContainerInput.model?**: Mirror of host-side interface, receives model ID via stdin JSON
- **ContainerOutput.tokenUsage/modelUsed**: Added to output interface for host-side consumption
- **SDK query options.model**: Passes `containerInput.model` to the SDK `query()` call so it uses the selected model
- **Token tracking**: Cumulative token counters from assistant messages, with extraction from result messages as primary source and cumulative as fallback

## Invariants
- All existing IPC, hook, and message loop logic unchanged
- Model is optional — omitting it lets the SDK use its default
- Token usage is best-effort — writeOutput includes it when available, omits when not
- Cumulative counters reset per `runQuery` call (per-turn, not per-session)

## Must-keep
- Full IPC message loop (stdin, poll, _close sentinel)
- MessageStream async iterable pattern
- PreCompact and sanitize-bash hooks
- writeOutput sentinel markers
- Session ID tracking across query loops
