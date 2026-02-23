# Intent: src/container-runner.ts modifications

## What changed
Extended ContainerInput and ContainerOutput interfaces for model selection and token tracking.

## Key sections
- **ContainerInput.model?**: Optional model ID passed to the container, used by agent-runner to override the default SDK model
- **ContainerOutput.tokenUsage?**: Token counts (inputTokens, outputTokens) extracted from SDK results
- **ContainerOutput.modelUsed?**: Model ID that was actually used for the query

## Invariants
- All existing fields in both interfaces remain unchanged
- New fields are optional (no breaking changes to existing callers)
- The streaming output parser handles the new fields transparently (JSON parse)
- No changes to volume mount logic, container spawning, or timeout handling

## Must-keep
- Sentinel markers (OUTPUT_START_MARKER / OUTPUT_END_MARKER)
- Volume mount construction logic
- Streaming output parser
- All existing ContainerInput/ContainerOutput fields
