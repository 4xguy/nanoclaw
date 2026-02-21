import { ASSISTANT_NAME } from '../config.js';
import type { ChatInfo } from '../db.js';
import { logger } from '../logger.js';
import type {
  Channel,
  OnChatMetadata,
  OnInboundMessage,
  RegisteredGroup,
} from '../types.js';
import { createTuiApp, TuiApp } from '../tui/tui-app.js';

export interface TuiChannelOpts {
  onMessage: OnInboundMessage;
  onChatMetadata: OnChatMetadata;
  registeredGroups: () => Record<string, RegisteredGroup>;
  /** All known chats (for JID lookup when no registered group matches). */
  allChats?: () => ChatInfo[];
}

/**
 * Terminal UI channel implementing the NanoClaw Channel interface.
 * Renders a full chat interface in the terminal via pi-tui.
 *
 * JID format: `tui:local` (single local session).
 */
export class TuiChannel implements Channel {
  name = 'tui';

  private app: TuiApp | null = null;
  private opts: TuiChannelOpts;
  private connected = false;
  private readonly jid = 'tui:local';
  /** External channels indexed by display name (e.g., 'WA' -> WhatsAppChannel). */
  private externalChannels = new Map<string, Channel>();

  constructor(opts: TuiChannelOpts) {
    this.opts = opts;
  }

  async connect(): Promise<void> {
    // Auto-register the TUI group if not already present
    const groups = this.opts.registeredGroups();
    if (!groups[this.jid]) {
      this.opts.onChatMetadata(this.jid, new Date().toISOString(), 'TUI', 'tui', false);
    }

    this.app = createTuiApp({
      channelName: 'TUI',
      onUserMessage: (activeChannel: string, text: string) => {
        if (activeChannel === 'TUI') {
          // Route through the normal TUI -> SQLite -> agent pipeline
          const timestamp = new Date().toISOString();
          this.opts.onChatMetadata(this.jid, timestamp, 'TUI', 'tui', false);
          this.opts.onMessage(this.jid, {
            id: crypto.randomUUID(),
            chat_jid: this.jid,
            sender: 'tui-user',
            sender_name: 'You',
            content: text,
            timestamp,
            is_from_me: true,
          });
        } else {
          // Route through the external channel's sendMessage
          this.sendToExternalChannel(activeChannel, text);
        }
      },
      onExit: () => {
        this.disconnect();
        process.exit(0);
      },
    });

    this.app.start();
    this.connected = true;

    logger.info('TUI channel connected');
    this.app.adapter.renderSystemMessage(
      'TUI',
      `${ASSISTANT_NAME} TUI ready. Type a message and press Enter.`,
    );
  }

  /**
   * Send a user-typed message through an external channel.
   * Finds a registered group JID owned by the channel and calls sendMessage on it.
   */
  private sendToExternalChannel(displayName: string, text: string) {
    const channel = this.externalChannels.get(displayName);
    if (!channel) {
      logger.warn({ displayName }, 'No external channel found for display name');
      this.app?.adapter.renderSystemMessage(displayName, `Channel "${displayName}" not available.`);
      this.app?.tui.requestRender();
      return;
    }

    // Find a JID owned by this channel: prefer registered groups, fall back to known chats
    const groups = this.opts.registeredGroups();
    let jid = Object.keys(groups).find((j) => channel.ownsJid(j));

    if (!jid && this.opts.allChats) {
      // No registered group — look for a non-group chat owned by this channel
      // (e.g., WhatsApp DM / self-chat). Prefer the most recently active one.
      const chats = this.opts.allChats();
      const match = chats.find(
        (c) => !c.is_group && c.channel === channel.name && channel.ownsJid(c.jid),
      );
      if (match) {
        jid = match.jid;
        logger.debug({ channel: channel.name, jid }, 'Using chat JID for external channel send');
      }
    }

    if (!jid) {
      jid = channel.defaultJid?.();
    }

    if (!jid) {
      logger.warn({ channel: channel.name }, 'No registered group or chat found for external channel');
      this.app?.adapter.renderSystemMessage(
        displayName,
        `No registered group for ${channel.name}. Register a group first.`,
      );
      this.app?.tui.requestRender();
      return;
    }

    channel.sendMessage(jid, text).catch((err) => {
      logger.error({ err, channel: channel.name, jid }, 'Failed to send message to external channel');
      this.app?.adapter.renderSystemMessage(displayName, `Failed to send: ${String(err)}`);
      this.app?.tui.requestRender();
    });

    logger.info({ channel: channel.name, jid, length: text.length }, 'Sent message via external channel');
  }

  async sendMessage(_jid: string, text: string): Promise<void> {
    if (!this.app) return;
    this.app.adapter.renderAssistantMessage('TUI', text);
    this.app.tui.requestRender();
    logger.info({ jid: _jid, length: text.length }, 'TUI message rendered');
  }

  isConnected(): boolean {
    return this.connected;
  }

  ownsJid(jid: string): boolean {
    return jid.startsWith('tui:');
  }

  async disconnect(): Promise<void> {
    if (this.app) {
      this.app.stop();
      this.app = null;
    }
    this.connected = false;
    logger.info('TUI channel disconnected');
  }

  async setTyping(_jid: string, isTyping: boolean): Promise<void> {
    if (!this.app) return;
    this.app.setTyping(isTyping);
    this.app.tui.requestRender();
  }

  /** Expose the adapter for multi-channel integration. */
  getAdapter() {
    return this.app?.adapter ?? null;
  }

  /**
   * Register external channels (WhatsApp, Telegram, etc.) with the TUI's
   * channel bar so they appear as tabs with unread counts.
   * Also stores channel references for routing editor input.
   * Call this after all channels have connected.
   */
  registerExternalChannels(allChannels: Channel[]) {
    if (!this.app) return;
    for (const ch of allChannels) {
      if (ch === (this as Channel)) continue; // skip self
      if (ch.isConnected()) {
        const display = TuiChannel.channelDisplayName(ch.name);
        this.app.adapter.registerChannel(display);
        this.externalChannels.set(display, ch);
        logger.info({ channel: ch.name, display }, 'Registered external channel in TUI');
      }
    }
    this.app.tui.requestRender();
  }

  /**
   * Notify the TUI that activity occurred on an external channel.
   * Increments the unread counter for that channel in the channel bar.
   */
  notifyExternalActivity(channelName: string) {
    if (!this.app) return;
    const display = TuiChannel.channelDisplayName(channelName);
    this.app.adapter.incrementUnread(display);
    this.app.tui.requestRender();
  }

  /**
   * Render an inbound message from an external channel in its TUI ChatLog tab.
   * Also increments unread count if the channel tab is not active.
   */
  renderExternalMessage(channelName: string, sender: string, text: string) {
    if (!this.app) return;
    const display = TuiChannel.channelDisplayName(channelName);
    const log = this.app.adapter.getChatLog(display);
    if (!log) return;
    log.addUser(`${sender}: ${text}`);
    // Increment unread if this channel tab is not currently active
    if (this.app.adapter.getActiveChannelName() !== display) {
      this.app.adapter.incrementUnread(display);
    }
    this.app.tui.requestRender();
  }

  /**
   * Render an agent/assistant response for an external channel in its TUI ChatLog tab.
   * Also increments unread count if the channel tab is not active.
   */
  renderExternalResponse(channelName: string, text: string) {
    if (!this.app) return;
    const display = TuiChannel.channelDisplayName(channelName);
    this.app.adapter.renderAssistantMessage(display, text);
    this.app.tui.requestRender();
  }

  /** Map channel names to short display labels for the channel bar. */
  private static readonly DISPLAY_NAMES: Record<string, string> = {
    whatsapp: 'WA',
    telegram: 'TG',
    tui: 'TUI',
  };

  static channelDisplayName(name: string): string {
    return TuiChannel.DISPLAY_NAMES[name.toLowerCase()] ?? name.toUpperCase();
  }
}
