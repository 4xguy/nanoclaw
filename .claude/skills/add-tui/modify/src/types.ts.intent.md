# Intent: src/types.ts modifications

## What changed
Added `defaultJid` optional method to the `Channel` interface. This allows channels to provide a fallback JID when no registered group or known chat is found for routing messages (used by the TUI when sending messages to external channels).

## Key sections
- **Channel interface**: Added `defaultJid?(): string | undefined` as an optional method, following the same pattern as the existing `setTyping?()` optional method

## Invariants
- All existing types, interfaces, and type aliases are preserved unchanged
- The new method is optional (`?`) so existing Channel implementations (WhatsApp, Telegram) are not forced to implement it
- No imports added or removed

## Must-keep
- All existing interfaces (`AdditionalMount`, `MountAllowlist`, `AllowedRoot`, `ContainerConfig`, `RegisteredGroup`, `NewMessage`, `ScheduledTask`, `TaskRunLog`, `Channel`)
- All existing type aliases (`OnInboundMessage`, `OnChatMetadata`)
- The `setTyping?` optional method pattern (defaultJid follows the same convention)
