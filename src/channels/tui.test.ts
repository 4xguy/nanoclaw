import { describe, expect, it, vi } from 'vitest';

// TuiChannel cannot be fully instantiated in tests because pi-tui requires
// a real terminal (ProcessTerminal). We test the Channel contract surface:
// JID ownership, name, initial state, and safe no-ops when disconnected.

describe('TuiChannel', () => {
  describe('ownsJid', () => {
    it('should own tui: prefixed JIDs', async () => {
      const { TuiChannel } = await import('./tui.js');
      const channel = new TuiChannel({
        onMessage: vi.fn(),
        onChatMetadata: vi.fn(),
        registeredGroups: () => ({}),
      });
      expect(channel.ownsJid('tui:local')).toBe(true);
      expect(channel.ownsJid('tui:other')).toBe(true);
    });

    it('should not own non-tui JIDs', async () => {
      const { TuiChannel } = await import('./tui.js');
      const channel = new TuiChannel({
        onMessage: vi.fn(),
        onChatMetadata: vi.fn(),
        registeredGroups: () => ({}),
      });
      expect(channel.ownsJid('wa:123@s.whatsapp.net')).toBe(false);
      expect(channel.ownsJid('tg:456')).toBe(false);
      expect(channel.ownsJid('')).toBe(false);
    });
  });

  describe('channel metadata', () => {
    it('should have name "tui"', async () => {
      const { TuiChannel } = await import('./tui.js');
      const channel = new TuiChannel({
        onMessage: vi.fn(),
        onChatMetadata: vi.fn(),
        registeredGroups: () => ({}),
      });
      expect(channel.name).toBe('tui');
    });

    it('should not be connected before connect()', async () => {
      const { TuiChannel } = await import('./tui.js');
      const channel = new TuiChannel({
        onMessage: vi.fn(),
        onChatMetadata: vi.fn(),
        registeredGroups: () => ({}),
      });
      expect(channel.isConnected()).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should handle disconnect when not connected', async () => {
      const { TuiChannel } = await import('./tui.js');
      const channel = new TuiChannel({
        onMessage: vi.fn(),
        onChatMetadata: vi.fn(),
        registeredGroups: () => ({}),
      });
      // Should not throw when disconnecting a never-connected channel
      await channel.disconnect();
      expect(channel.isConnected()).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('should not throw when not connected', async () => {
      const { TuiChannel } = await import('./tui.js');
      const channel = new TuiChannel({
        onMessage: vi.fn(),
        onChatMetadata: vi.fn(),
        registeredGroups: () => ({}),
      });
      // sendMessage is a no-op when app is null (not connected)
      await channel.sendMessage('tui:local', 'hello');
    });
  });

  describe('setTyping', () => {
    it('should not throw when not connected', async () => {
      const { TuiChannel } = await import('./tui.js');
      const channel = new TuiChannel({
        onMessage: vi.fn(),
        onChatMetadata: vi.fn(),
        registeredGroups: () => ({}),
      });
      await channel.setTyping('tui:local', true);
      await channel.setTyping('tui:local', false);
    });
  });

  describe('getAdapter', () => {
    it('should return null when not connected', async () => {
      const { TuiChannel } = await import('./tui.js');
      const channel = new TuiChannel({
        onMessage: vi.fn(),
        onChatMetadata: vi.fn(),
        registeredGroups: () => ({}),
      });
      expect(channel.getAdapter()).toBeNull();
    });
  });

  describe('registerExternalChannels', () => {
    it('should not throw when not connected', async () => {
      const { TuiChannel } = await import('./tui.js');
      const channel = new TuiChannel({
        onMessage: vi.fn(),
        onChatMetadata: vi.fn(),
        registeredGroups: () => ({}),
      });
      // Should be a no-op when app is null
      channel.registerExternalChannels([]);
    });
  });

  describe('notifyExternalActivity', () => {
    it('should not throw when not connected', async () => {
      const { TuiChannel } = await import('./tui.js');
      const channel = new TuiChannel({
        onMessage: vi.fn(),
        onChatMetadata: vi.fn(),
        registeredGroups: () => ({}),
      });
      // Should be a no-op when app is null
      channel.notifyExternalActivity('whatsapp');
    });
  });

  describe('channelDisplayName', () => {
    it('should map known channel names to short labels', async () => {
      const { TuiChannel } = await import('./tui.js');
      expect(TuiChannel.channelDisplayName('whatsapp')).toBe('WA');
      expect(TuiChannel.channelDisplayName('telegram')).toBe('TG');
      expect(TuiChannel.channelDisplayName('tui')).toBe('TUI');
    });

    it('should uppercase unknown channel names', async () => {
      const { TuiChannel } = await import('./tui.js');
      expect(TuiChannel.channelDisplayName('discord')).toBe('DISCORD');
      expect(TuiChannel.channelDisplayName('slack')).toBe('SLACK');
    });

    it('should be case-insensitive', async () => {
      const { TuiChannel } = await import('./tui.js');
      expect(TuiChannel.channelDisplayName('WhatsApp')).toBe('WA');
      expect(TuiChannel.channelDisplayName('TELEGRAM')).toBe('TG');
    });
  });
});
