/**
 * Minimal, dependency-free event bus used across all editor modules.
 * Supports the public event list: init, focus, blur, change, selectionchange,
 * undo, redo, paste, drop, save, destroy, and any custom plugin events.
 */
export default class EventBus {
    constructor() {
        /** @type {Map<string, Set<Function>>} */
        this.listeners = new Map();
    }

    /**
     * @param {string} event
     * @param {(...args: any[]) => void} handler
     * @returns {() => void} unsubscribe function
     */
    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(handler);
        return () => this.off(event, handler);
    }

    /**
     * @param {string} event
     * @param {(...args: any[]) => void} handler
     */
    off(event, handler) {
        this.listeners.get(event)?.delete(handler);
    }

    /**
     * @param {string} event
     * @param {(...args: any[]) => void} handler
     */
    once(event, handler) {
        const wrapped = (...args) => {
            this.off(event, wrapped);
            handler(...args);
        };
        this.on(event, wrapped);
    }

    /**
     * @param {string} event
     * @param {...any} args
     */
    emit(event, ...args) {
        const handlers = this.listeners.get(event);
        if (!handlers) return;
        // Copy to array so handlers can safely unsubscribe during emit.
        [...handlers].forEach((handler) => handler(...args));
    }

    destroy() {
        this.listeners.clear();
    }
}
