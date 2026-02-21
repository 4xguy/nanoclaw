import { Container, Text } from '@mariozechner/pi-tui';
import { theme } from './theme.js';

export interface ChannelTab {
  name: string;
  active: boolean;
  unread: number;
}

/**
 * Status line showing all active channels with unread counts.
 * Renders below the editor in the TUI layout.
 */
export class ChannelBar extends Container {
  private label: Text;
  private tabs: ChannelTab[] = [];

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

  private renderLabel() {
    const parts = this.tabs.map((tab) => {
      let label = tab.name.toUpperCase();
      if (tab.active) {
        label += '*';
      }
      if (tab.unread > 0) {
        label += `(${tab.unread})`;
      }
      return tab.active ? theme.accent(label) : theme.dim(label);
    });
    this.label.setText(parts.join('  '));
  }
}
