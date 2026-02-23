import { Container, Spacer, Text } from '@mariozechner/pi-tui';
import { theme } from '../theme.js';
import { AssistantMessageComponent } from './assistant-message.js';
import { UserMessageComponent } from './user-message.js';

export class ChatLog extends Container {
  private streamingRuns = new Map<string, AssistantMessageComponent>();
  private orderedItems: Container[] = [];

  clearAll() {
    this.clear();
    this.streamingRuns.clear();
    this.orderedItems = [];
  }

  addSystem(text: string) {
    const spacer = new Spacer(1);
    const textNode = new Text(theme.system(text), 1, 0);
    // Wrap in a container so it's a single orderedItem
    const wrapper = new Container();
    wrapper.addChild(spacer);
    wrapper.addChild(textNode);
    this.orderedItems.push(wrapper);
    this.addChild(wrapper);
  }

  addUser(text: string) {
    const component = new UserMessageComponent(text);
    this.orderedItems.push(component);
    this.addChild(component);
  }

  private resolveRunId(runId?: string) {
    return runId ?? 'default';
  }

  startAssistant(text: string, runId?: string) {
    const component = new AssistantMessageComponent(text);
    this.streamingRuns.set(this.resolveRunId(runId), component);
    this.orderedItems.push(component);
    this.addChild(component);
    return component;
  }

  updateAssistant(text: string, runId?: string) {
    const effectiveRunId = this.resolveRunId(runId);
    const existing = this.streamingRuns.get(effectiveRunId);
    if (!existing) {
      this.startAssistant(text, runId);
      return;
    }
    existing.setText(text);
  }

  finalizeAssistant(text: string, runId?: string) {
    const effectiveRunId = this.resolveRunId(runId);
    const existing = this.streamingRuns.get(effectiveRunId);
    if (existing) {
      existing.setText(text);
      this.streamingRuns.delete(effectiveRunId);
      return;
    }
    const component = new AssistantMessageComponent(text);
    this.orderedItems.push(component);
    this.addChild(component);
  }

  dropAssistant(runId?: string) {
    const effectiveRunId = this.resolveRunId(runId);
    const existing = this.streamingRuns.get(effectiveRunId);
    if (!existing) {
      return;
    }
    this.removeChild(existing);
    const idx = this.orderedItems.indexOf(existing);
    if (idx !== -1) this.orderedItems.splice(idx, 1);
    this.streamingRuns.delete(effectiveRunId);
  }

  /**
   * Prepend historical messages at the top of the chat log.
   * Rebuilds the Container's children list since there's no insertChild API.
   * @param messages Array of {role, content} objects, ordered oldest-first.
   */
  prependHistory(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
    if (messages.length === 0) return;

    const newItems: Container[] = [];
    for (const msg of messages) {
      if (msg.role === 'user') {
        newItems.push(new UserMessageComponent(msg.content));
      } else if (msg.role === 'assistant') {
        newItems.push(new AssistantMessageComponent(msg.content));
      } else {
        const wrapper = new Container();
        wrapper.addChild(new Spacer(1));
        wrapper.addChild(new Text(theme.system(msg.content), 1, 0));
        newItems.push(wrapper);
      }
    }

    // Add a separator between history and current session
    const sep = new Container();
    sep.addChild(new Spacer(1));
    sep.addChild(new Text(theme.dim('--- earlier messages ---'), 1, 0));
    newItems.push(sep);

    // Prepend new items and rebuild
    this.orderedItems = [...newItems, ...this.orderedItems];
    this.clear();
    for (const item of this.orderedItems) {
      this.addChild(item);
    }
  }
}
