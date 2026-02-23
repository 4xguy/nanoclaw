import {
  Container,
  Loader,
  ProcessTerminal,
  Text,
  TUI,
} from '@mariozechner/pi-tui';
import { ChannelBar, StatusInfo } from './channel-bar.js';
import { ChatLog } from './components/chat-log.js';
import { CustomEditor } from './components/custom-editor.js';
import { TuiAdapter } from './tui-adapter.js';
import { editorTheme, theme } from './theme.js';

export interface TuiAppOpts {
  /** Called when user submits text from the editor. Receives the display name of the active channel. */
  onUserMessage: (activeChannel: string, text: string) => void;
  /** Called when user requests exit (Ctrl+D or double Ctrl+C). */
  onExit: () => void;
  /** Called when user types a /command on the TUI channel. */
  onSlashCommand?: (command: string, args: string) => void;
  /** Called when user presses PageUp on the TUI channel. */
  onPageUp?: () => void;
  /** Channel name for this TUI session. */
  channelName: string;
}

export interface TuiApp {
  adapter: TuiAdapter;
  tui: TUI;
  editor: CustomEditor;
  channelBar: ChannelBar;
  start: () => void;
  stop: () => void;
  setTyping: (isTyping: boolean) => void;
  updateHeader: (text: string) => void;
  updateStatus: (info: StatusInfo) => void;
}

/**
 * Creates and returns the full TUI application.
 *
 * Layout (top to bottom):
 *   Header      — project name and active channel
 *   ChatLog     — swappable per channel via adapter
 *   Status      — typing indicator (spinner)
 *   Editor      — multiline text input
 *   ChannelBar  — tab bar showing all channels with unread counts
 */
export function createTuiApp(opts: TuiAppOpts): TuiApp {
  const tui = new TUI(new ProcessTerminal());
  const root = new Container();
  const header = new Text('', 1, 0);
  const channelBar = new ChannelBar();
  const statusContainer = new Container();
  const editor = new CustomEditor(tui, editorTheme);

  const adapter = new TuiAdapter(channelBar, {
    onUserMessage: opts.onUserMessage,
  });

  // Register the TUI channel and get its ChatLog
  const chatLog = adapter.registerChannel(opts.channelName);

  // Track the currently mounted ChatLog so we can swap it on channel switch.
  // We hold a mutable reference rather than using index-based child methods,
  // since Container exposes removeChild/addChild but not positional inserts.
  let currentChatLog: ChatLog = chatLog;

  // Build layout
  root.addChild(header);
  root.addChild(currentChatLog);
  root.addChild(statusContainer);
  root.addChild(editor);
  root.addChild(channelBar);

  tui.addChild(root);
  tui.setFocus(editor);

  // Channel switching: swap the ChatLog in the layout.
  // We rebuild the root children to preserve order since Container
  // only provides addChild/removeChild/clear (no positional insert).
  const rebuildRoot = (newChatLog: ChatLog) => {
    root.clear();
    root.addChild(header);
    root.addChild(newChatLog);
    root.addChild(statusContainer);
    root.addChild(editor);
    root.addChild(channelBar);
    currentChatLog = newChatLog;
    tui.setFocus(editor);
    updateHeader(`nanoclaw \u2022 ${adapter.getActiveChannelName().toUpperCase()}`);
    tui.requestRender();
  };

  adapter.setOnActiveLogChanged((newLog) => {
    rebuildRoot(newLog);
  });

  // Editor submit
  editor.onSubmit = (text: string) => {
    const value = text.trim();
    if (!value) return;
    editor.setText('');

    // Intercept slash commands on the TUI channel only
    if (value.startsWith('/') && adapter.getActiveChannelName() === opts.channelName && opts.onSlashCommand) {
      const spaceIdx = value.indexOf(' ');
      const command = spaceIdx === -1 ? value.slice(1) : value.slice(1, spaceIdx);
      const args = spaceIdx === -1 ? '' : value.slice(spaceIdx + 1).trim();
      opts.onSlashCommand(command, args);
      tui.requestRender();
      return;
    }

    // Show user message in active channel's log
    const activeLog = adapter.getActiveChatLog();
    if (activeLog) {
      activeLog.addUser(value);
    }
    opts.onUserMessage(adapter.getActiveChannelName(), value);
    tui.requestRender();
  };

  // PageUp: load more history (TUI channel only)
  editor.onPageUp = () => {
    if (adapter.getActiveChannelName() === opts.channelName && opts.onPageUp) {
      opts.onPageUp();
      tui.requestRender();
    }
  };

  // Shift+Tab: cycle channels
  editor.onShiftTab = () => {
    adapter.cycleChannel();
    tui.requestRender();
  };

  // Ctrl+D: exit (only when editor is empty — enforced by CustomEditor)
  editor.onCtrlD = () => {
    opts.onExit();
  };

  // Ctrl+C: clear input on first press, exit on double-press within 1s
  let lastCtrlCAt = 0;
  editor.onCtrlC = () => {
    if (editor.getText().trim().length > 0) {
      editor.setText('');
      tui.requestRender();
      return;
    }
    const now = Date.now();
    if (now - lastCtrlCAt < 1000) {
      opts.onExit();
    }
    lastCtrlCAt = now;
  };

  // Escape: no-op (reserved for future use, e.g., abort agent run)
  editor.onEscape = () => {};

  // Typing indicator
  let loader: Loader | null = null;

  const setTyping = (isTyping: boolean) => {
    if (isTyping && !loader) {
      statusContainer.clear();
      loader = new Loader(
        tui,
        (spinner) => theme.accent(spinner),
        (text) => theme.bold(theme.accentSoft(text)),
        'thinking...',
      );
      statusContainer.addChild(loader);
    } else if (!isTyping && loader) {
      loader.stop();
      statusContainer.clear();
      loader = null;
    }
    tui.requestRender();
  };

  const updateHeader = (text: string) => {
    header.setText(theme.header(text));
  };

  updateHeader(`nanoclaw \u2022 ${opts.channelName.toUpperCase()}`);

  return {
    adapter,
    tui,
    editor,
    channelBar,
    start: () => tui.start(),
    stop: () => {
      if (loader) loader.stop();
      tui.stop();
    },
    setTyping,
    updateHeader: (text: string) => {
      updateHeader(text);
      tui.requestRender();
    },
    updateStatus: (info: StatusInfo) => {
      channelBar.setStatusInfo(info);
      tui.requestRender();
    },
  };
}
