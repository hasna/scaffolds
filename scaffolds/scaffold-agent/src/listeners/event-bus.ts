/**
 * Event bus for agent event distribution
 */

import { EventEmitter } from "events";
import type { AgentEvent, AgentEventType, Listener, ListenerOptions } from "./types.js";

export class AgentEventBus extends EventEmitter {
  private registeredListeners: Map<string, Listener> = new Map();
  private listenerOptions: Map<string, ListenerOptions> = new Map();

  /**
   * Register a listener
   */
  register(listener: Listener, options?: ListenerOptions): void {
    if (this.registeredListeners.has(listener.name)) {
      throw new Error(`Listener "${listener.name}" is already registered`);
    }

    this.registeredListeners.set(listener.name, listener);
    this.listenerOptions.set(listener.name, options || {});

    // Subscribe to events
    for (const eventType of listener.events) {
      this.on(eventType, async (event: AgentEvent) => {
        const opts = this.listenerOptions.get(listener.name);

        // Check if enabled
        if (opts?.enabled === false) return;

        // Apply filter
        if (opts?.filter && !opts.filter(event)) return;

        try {
          await listener.handler(event);
        } catch (error) {
          console.error(`Listener "${listener.name}" failed:`, error);
        }
      });
    }
  }

  /**
   * Unregister a listener
   */
  unregister(name: string): boolean {
    const listener = this.registeredListeners.get(name);
    if (!listener) return false;

    // Remove event subscriptions
    for (const eventType of listener.events) {
      this.removeAllListeners(eventType);
    }

    this.registeredListeners.delete(name);
    this.listenerOptions.delete(name);
    return true;
  }

  /**
   * Enable/disable a listener
   */
  setEnabled(name: string, enabled: boolean): void {
    const opts = this.listenerOptions.get(name) || {};
    opts.enabled = enabled;
    this.listenerOptions.set(name, opts);
  }

  /**
   * Emit an event (override to properly type)
   */
  emitEvent(event: AgentEvent): boolean {
    return super.emit(event.type, event);
  }

  /**
   * Get all registered listener names
   */
  getListenerNames(): string[] {
    return Array.from(this.registeredListeners.keys());
  }

  /**
   * Check if a listener is registered
   */
  hasListener(name: string): boolean {
    return this.registeredListeners.has(name);
  }

  /**
   * Wait for a specific event
   */
  waitFor(
    eventType: AgentEventType,
    timeout?: number
  ): Promise<AgentEvent> {
    return new Promise((resolve, reject) => {
      const timer = timeout
        ? setTimeout(() => {
            this.off(eventType, handler);
            reject(new Error(`Timeout waiting for event: ${eventType}`));
          }, timeout)
        : null;

      const handler = (event: AgentEvent) => {
        if (timer) clearTimeout(timer);
        resolve(event);
      };

      this.once(eventType, handler);
    });
  }

  /**
   * Clear all listeners
   */
  clearAll(): void {
    this.removeAllListeners();
    this.registeredListeners.clear();
    this.listenerOptions.clear();
  }
}

// Singleton event bus
export const eventBus = new AgentEventBus();
