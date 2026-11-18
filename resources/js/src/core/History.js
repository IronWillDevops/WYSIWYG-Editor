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
     * @param {() => void} [options.saveBookmark]
     * @param {(bookmark: object) => void} [options.restoreBookmark]
     * @param {(event: string) => void} [options.onChange]
     */
    constructor({ getContent, setContent, maxSteps = 1000, debounceMs = 300, saveBookmark, restoreBookmark, onChange }) {
        this.getContent = getContent;
        this.setContent = setContent;
        this.maxSteps = maxSteps;
        this.debounceMs = debounceMs;
        this.saveBookmark = saveBookmark ?? (() => null);
        this.restoreBookmark = restoreBookmark ?? (() => {});
        this.onChange = onChange ?? (() => {});

        /** @type {{ html: string, bookmark: object|null }[]} */
        this.undoStack = [];
        /** @type {{ html: string, bookmark: object|null }[]} */
        this.redoStack = [];
        this.timer = null;
        this.isRestoring = false;

        this.undoStack.push({ html: this.getContent(), bookmark: null });
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
        // `last` is absent only after destroy() cleared the stack — never
        // resurrect snapshots for a torn-down editor.
        if (!last || snapshot === last.html) return;

        this.undoStack.push({ html: snapshot, bookmark: this.saveBookmark() });
        if (this.undoStack.length > this.maxSteps) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    /**
     * Settles a debounced record() still waiting on its timer, so the state
     * the user just produced is on the stack *before* undo/redo inspects it.
     * Without this, pressing Ctrl+Z within debounceMs of the last keystroke
     * cancelled the pending snapshot entirely: undo became a no-op (or skipped
     * the last change), and redo could resurrect a state the user had already
     * typed past.
     */
    flushPendingRecord() {
        if (!this.timer) return;
        clearTimeout(this.timer);
        this.timer = null;
        this.push();
    }

    canUndo() {
        return this.undoStack.length > 1;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    undo() {
        this.flushPendingRecord();
        if (!this.canUndo()) return;

        const current = this.undoStack.pop();
        this.redoStack.push(current);
        const previous = this.undoStack[this.undoStack.length - 1];

        this.isRestoring = true;
        this.setContent(previous.html);
        this.restoreBookmark(previous.bookmark);
        this.isRestoring = false;
        this.onChange('undo');
    }

    redo() {
        this.flushPendingRecord();
        if (!this.canRedo()) return;

        const next = this.redoStack.pop();
        this.undoStack.push(next);

        this.isRestoring = true;
        this.setContent(next.html);
        this.restoreBookmark(next.bookmark);
        this.isRestoring = false;
        this.onChange('redo');
    }

    clear() {
        clearTimeout(this.timer);
        this.undoStack = [{ html: this.getContent(), bookmark: null }];
        this.redoStack = [];
    }

    destroy() {
        clearTimeout(this.timer);
        this.undoStack = [];
        this.redoStack = [];
    }
}
