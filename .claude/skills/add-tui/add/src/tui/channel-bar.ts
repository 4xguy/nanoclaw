import { Container, Text } from '@mariozechner/pi-tui';
import { theme } from './theme.js';

export interface ChannelTab {
  name: string;
  active: boolean;
  unread: number;
}

export interface StatusInfo {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Status line showing all active channels with unread counts,
 * plus model name and token usage on the right.
 * Renders below the editor in the TUI layout.
 */
export class ChannelBar extends Container {
  private label: Text;
  private tabs: ChannelTab[] = [];
  private statusInfo: StatusInfo = {};

  constructor() {
    super();
    this.label = new Text('', 1, 0);
    this.addChild(this.label);
  }

  /** Replace the full set of tabs and re-render. */
  setTabs(tabs: ChannelTab[]) {
    this.tabs = tabs;
    this.renderLabel();
  }

  /** Bump unread count for a background channel. Active channels are ignored. */
  incrementUnread(channelName: string) {
    const tab = this.tabs.find((t) => t.name === channelName);
    if (tab && !tab.active) {
      tab.unread++;
      this.renderLabel();
    }
  }

  /** Reset unread count for a channel (e.g., when it becomes active). */
  resetUnread(channelName: string) {
    const tab = this.tabs.find((t) => t.name === channelName);
    if (tab) {
      tab.unread = 0;
      this.renderLabel();
    }
  }

  /** Mark one channel active and all others inactive. Resets unread on the new active channel. */
  setActive(channelName: string) {
    for (const tab of this.tabs) {
      tab.active = tab.name === channelName;
    }
    this.resetUnread(channelName);
    this.renderLabel();
  }

  /** Update the model and token usage displayed in the status area. */
  setStatusInfo(info: StatusInfo) {
    this.statusInfo = { ...this.statusInfo, ...info };
    this.renderLabel();
  }

  /** Reset status info (e.g., on /clear). */
  clearStatusInfo() {
    this.statusInfo = {};
    this.renderLabel();
  }

  private renderLabel() {
    // Left side: channel tabs
    const tabParts = this.tabs.map((tab) => {
      let label = tab.name.toUpperCase();
      if (tab.active) {
        label += '*';
      }
      if (tab.unread > 0) {
        label += `(${tab.unread})`;
      }
      return tab.active ? theme.accent(label) : theme.dim(label);
    });

    const left = tabParts.join('  ');

    // Right side: model + tokens
    const rightParts: string[] = [];
    if (this.statusInfo.model) {
      rightParts.push(this.statusInfo.model);
    }
    if (this.statusInfo.inputTokens != null || this.statusInfo.outputTokens != null) {
      const input = this.statusInfo.inputTokens ?? 0;
      const output = this.statusInfo.outputTokens ?? 0;
      rightParts.push(formatTokens(input + output));
    }

    if (rightParts.length > 0) {
      const right = theme.dim(rightParts.join(' | '));
      this.label.setText(`${left}  ${theme.dim('|')}  ${right}`);
    } else {
      this.label.setText(left);
    }
  }
}

/** Format token count for display: 1234 -> '1.2k', 12345 -> '12k' */
function formatTokens(count: number): string {
  if (count < 1000) return `${count}`;
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  return `${Math.round(count / 1000)}k`;
}
