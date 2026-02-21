import { ChatLog } from './components/chat-log.js';
import { ChannelBar } from './channel-bar.js';

export interface TuiAdapterOpts {
  onUserMessage: (activeChannel: string, text: string) => void;
}

/**
 * Bridges NanoClaw Channel callbacks to pi-tui components.
 * Manages per-channel ChatLogs, unread counts, and channel switching.
 *
 * Each registered channel gets its own ChatLog instance. Only the active
 * channel's ChatLog is visible in the layout at any given time. The adapter
 * notifies listeners when the active ChatLog changes so the layout can swap
 * the visible component.
 */
export class TuiAdapter {
  private chatLogs = new Map<string, ChatLog>();
  private activeChannel: string;
  private channelNames: string[] = [];
  private channelBar: ChannelBar;
  private opts: TuiAdapterOpts;
  private onActiveLogChanged?: (log: ChatLog) => void;

  constructor(channelBar: ChannelBar, opts: TuiAdapterOpts) {
    this.channelBar = channelBar;
    this.opts = opts;
    this.activeChannel = '';
  }

  /** Set callback for when the visible ChatLog changes (channel switch). */
  setOnActiveLogChanged(fn: (log: ChatLog) => void) {
    this.onActiveLogChanged = fn;
  }

  /** Register a channel. Creates a ChatLog for it. First registered channel becomes active. */
  registerChannel(name: string): ChatLog {
    const log = new ChatLog();
    this.chatLogs.set(name, log);
    this.channelNames.push(name);
    if (!this.activeChannel) {
      this.activeChannel = name;
    }
    this.updateChannelBar();
    return log;
  }

  /** Get the ChatLog for the currently active channel. */
  getActiveChatLog(): ChatLog | undefined {
    return this.chatLogs.get(this.activeChannel);
  }

  /** Get ChatLog for a specific channel by name. */
  getChatLog(channelName: string): ChatLog | undefined {
    return this.chatLogs.get(channelName);
  }

  /** Get the active channel name. */
  getActiveChannelName(): string {
    return this.activeChannel;
  }

  /** Cycle to the next channel (Shift+Tab). Returns the new active channel name. */
  cycleChannel(): string {
    if (this.channelNames.length <= 1) return this.activeChannel;
    const currentIndex = this.channelNames.indexOf(this.activeChannel);
    const nextIndex = (currentIndex + 1) % this.channelNames.length;
    this.activeChannel = this.channelNames[nextIndex];
    this.channelBar.setActive(this.activeChannel);
    const newLog = this.chatLogs.get(this.activeChannel);
    if (newLog && this.onActiveLogChanged) {
      this.onActiveLogChanged(newLog);
    }
    return this.activeChannel;
  }

  /** Render a finalized assistant message in a channel's ChatLog. */
  renderAssistantMessage(channelName: string, text: string) {
    const log = this.chatLogs.get(channelName);
    if (!log) return;
    log.finalizeAssistant(text);
    if (channelName !== this.activeChannel) {
      this.channelBar.incrementUnread(channelName);
    }
  }

  /** Render a user message in a channel's ChatLog. */
  renderUserMessage(channelName: string, text: string) {
    const log = this.chatLogs.get(channelName);
    if (!log) return;
    log.addUser(text);
  }

  /** Render a system message in a channel's ChatLog. */
  renderSystemMessage(channelName: string, text: string) {
    const log = this.chatLogs.get(channelName);
    if (!log) return;
    log.addSystem(text);
  }

  /** Increment unread count for a background channel. No-op if the channel is active. */
  incrementUnread(channelName: string) {
    this.channelBar.incrementUnread(channelName);
  }

  private updateChannelBar() {
    this.channelBar.setTabs(
      this.channelNames.map((name) => ({
        name,
        active: name === this.activeChannel,
        unread: 0,
      })),
    );
  }
}
