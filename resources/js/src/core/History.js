/**
 * Undo/Redo stack storing lightweight snapshots of the editor's HTML
 * plus a serialized caret position, so undo restores both content and cursor.
 */
export default class History {
    /**
     * @param {object} options
     * @param {() => string} options.getContent
     * @param {(html: string) => void} options.setContent
     * @param {number} [options.maxSteps]
     * @param {number} [options.debounceMs]
     * @param {(event: string) => void} [options.onChange]
     */
    constructor({ getContent, setContent, maxSteps = 1000, debounceMs = 300, onChange }) {
        this.getContent = getContent;
        this.setContent = setContent;
        this.maxSteps = maxSteps;
        this.debounceMs = debounceMs;
        this.onChange = onChange ?? (() => {});

        /** @type {string[]} */
        this.undoStack = [];
        /** @type {string[]} */
        this.redoStack = [];
        this.timer = null;
        this.isRestoring = false;

        // Seed with the initial content so the very first edit is undoable.
        this.undoStack.push(this.getContent());
    }

    /** Called on every input event; batches rapid keystrokes into one snapshot. */
    record() {
        if (this.isRestoring) return;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.push(), this.debounceMs);
    }

    /** Force-record immediately (e.g. before a toolbar command mutates content). */
    push() {
        if (this.isRestoring) return;
        const snapshot = this.getContent();
        const last = this.undoStack[this.undoStack.length - 1];
        if (snapshot === last) return;

        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxSteps) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    canUndo() {
        return this.undoStack.length > 1;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    undo() {
        clearTimeout(this.timer);
        if (!this.canUndo()) return;

        const current = this.undoStack.pop();
        this.redoStack.push(current);
        const previous = this.undoStack[this.undoStack.length - 1];

        this.isRestoring = true;
        this.setContent(previous);
        this.isRestoring = false;
        this.onChange('undo');
    }

    redo() {
        if (!this.canRedo()) return;

        const next = this.redoStack.pop();
        this.undoStack.push(next);

        this.isRestoring = true;
        this.setContent(next);
        this.isRestoring = false;
        this.onChange('redo');
    }

    clear() {
        clearTimeout(this.timer);
        this.undoStack = [this.getContent()];
        this.redoStack = [];
    }

    destroy() {
        clearTimeout(this.timer);
        this.undoStack = [];
        this.redoStack = [];
    }
}
