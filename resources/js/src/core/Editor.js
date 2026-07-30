import EventBus from './EventBus.js';
import Selection from './Selection.js';
import History from './History.js';
import Commands from './Commands.js';
import Sanitizer from './Sanitizer.js';

/**
 * @typedef {object} EditorOptions
 * @property {string} [theme]
 * @property {string} [locale]
 * @property {Array<string[]>} [toolbar]
 * @property {number} [height]
 * @property {string} [uploadUrl]
 * @property {object} [history]
 * @property {object} [autosave]
 * @property {object} [sanitizer]
 */

const DEFAULT_OPTIONS = {
    theme: 'auto',
    locale: 'en',
    height: 420,
    history: { max_steps: 1000, debounce_ms: 300 },
    autosave: { enabled: false, interval_ms: 15000, storage_key: 'inkforge-editor-autosave' },
};

/** Registry of plugin factories added via Editor.registerPlugin(). */
const pluginRegistry = new Map();

export default class Editor {
    /**
     * @param {HTMLTextAreaElement} textarea
     * @param {EditorOptions} options
     */
    constructor(textarea, options = {}) {
        this.textarea = textarea;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.events = new EventBus();
        this.sanitizer = new Sanitizer(this.options.sanitizer);
        this.plugins = new Map();

        this.buildDom();

        this.selection = new Selection(this.root);
        this.commands = new Commands(this);
        this.history = new History({
            getContent: () => this.root.innerHTML,
            setContent: (html) => {
                this.root.innerHTML = html;
            },
            saveBookmark: () => this.saveSelectionBookmark(),
            restoreBookmark: (bookmark) => this.restoreSelectionBookmark(bookmark),
            maxSteps: this.options.history?.max_steps ?? 1000,
            debounceMs: this.options.history?.debounce_ms ?? 300,
            onChange: (type) => this.events.emit(type),
        });

        this.handleShortcut = this.handleShortcut.bind(this);
        this.bindEvents();
        this.applyTheme(this.options.theme);

        this.loadPlugins();
        this.setupAutosave();

        this.events.emit('init', this);
    }

    /** Builds the contenteditable root and hides the original textarea. */
    buildDom() {
        this.textarea.style.display = 'none';

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'ife-wrapper';
        this.wrapper.dataset.theme = this.options.theme;

        this.root = document.createElement('div');
        this.root.className = 'ife-content';
        this.root.contentEditable = 'true';
        this.root.spellcheck = true;
        this.root.style.minHeight = `${this.options.height}px`;
        this.root.innerHTML = this.sanitizer.sanitize(this.textarea.value || '');
        this.root.setAttribute('role', 'textbox');
        this.root.setAttribute('aria-multiline', 'true');

        this.wrapper.appendChild(this.root);
        this.textarea.insertAdjacentElement('afterend', this.wrapper);
    }

    bindEvents() {
        this.root.addEventListener('input', () => {
            this.history.record();
            this.emitChange();
        });

        this.root.addEventListener('keyup', () => this.syncSelectionState());
        this.root.addEventListener('mouseup', () => this.syncSelectionState());

        this.root.addEventListener('focus', () => this.events.emit('focus', this));
        this.root.addEventListener('blur', () => {
            this.syncTextarea();
            this.events.emit('blur', this);
        });

        this.root.addEventListener('paste', (event) => this.handlePaste(event));
        this.root.addEventListener('drop', (event) => this.events.emit('drop', event));

        document.addEventListener('keydown', this.handleShortcut);

        if (this.textarea.form) {
            this.textarea.form.addEventListener('submit', () => this.syncTextarea());
        }
    }

    syncSelectionState() {
        this.selection.save();
        this.events.emit('selectionchange', this);
    }

    syncTextarea() {
        this.textarea.value = this.getHTML();
    }

    /** Serialize caret position as text offsets for undo/redo. */
    saveSelectionBookmark() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        const range = sel.getRangeAt(0);
        if (!this.root.contains(range.commonAncestorContainer)) return null;
        return {
            start: this.textOffset(range.startContainer, range.startOffset),
            end: this.textOffset(range.endContainer, range.endOffset),
        };
    }

    /** Calculate character offset from root start to a given node+offset. */
    textOffset(node, offset) {
        const walker = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT, null);
        let pos = 0;
        let current;
        while ((current = walker.nextNode())) {
            if (current === node) return pos + offset;
            pos += (current.textContent || '').length;
        }
        return pos;
    }

    /** Restore caret from a previously saved bookmark. */
    restoreSelectionBookmark(bookmark) {
        if (!bookmark) return;
        const { start, end } = bookmark;
        const startNode = this.nodeAtOffset(start);
        const endNode = this.nodeAtOffset(end);
        if (!startNode || !endNode) return;
        const range = document.createRange();
        range.setStart(startNode.node, Math.min(startNode.offset, (startNode.node.textContent || '').length));
        range.setEnd(endNode.node, Math.min(endNode.offset, (endNode.node.textContent || '').length));
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    /** Find text node and offset at a given character position from root start. */
    nodeAtOffset(target) {
        const walker = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT, null);
        let pos = 0;
        let current;
        while ((current = walker.nextNode())) {
            const len = (current.textContent || '').length;
            if (pos + len >= target) return { node: current, offset: target - pos };
            pos += len;
        }
        return null;
    }

    emitChange() {
        this.syncTextarea();
        this.events.emit('change', this.getHTML());
    }

    /** @param {ClipboardEvent} event */
    handlePaste(event) {
        event.preventDefault();
        if (this.destroyed) return;
        const html = event.clipboardData?.getData('text/html');
        const text = event.clipboardData?.getData('text/plain') ?? '';
        const clean = html ? this.sanitizer.sanitize(html) : this.escapeHtml(text);
        this.commands.insertHTML(clean);
        this.events.emit('paste', { html, text });
    }

    /** @param {string} text */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    /** @param {KeyboardEvent} event */
    handleShortcut(event) {
        if (this.destroyed || !this.root.contains(document.activeElement)) return;
        const ctrl = event.ctrlKey || event.metaKey;
        if (!ctrl) return;

        const map = {
            b: () => this.commands.exec('bold'),
            i: () => this.commands.exec('italic'),
            u: () => this.commands.exec('underline'),
            k: () => this.module('link')?.open(),
            f: () => this.module('find')?.open(),
            z: () => (event.shiftKey ? this.history.redo() : this.history.undo()),
            y: () => this.history.redo(),
            s: () => this.events.emit('save', this.getHTML()),
        };

        const handler = map[event.key.toLowerCase()];
        if (handler) {
            event.preventDefault();
            handler();
        }
    }

    setupAutosave() {
        const config = this.options.autosave;
        if (!config?.enabled) return;

        this.autosaveTimer = setInterval(() => {
            try {
                window.localStorage.setItem(config.storage_key, this.getHTML());
            } catch {
                // Storage unavailable (private mode/quota) — silently skip, non-critical.
            }
        }, config.interval_ms ?? 15000);
    }

    /**
     * Loads every registered plugin (built-in modules and third-party ones)
     * unless explicitly excluded via options.disabledPlugins. This keeps
     * built-in features (link, image, table, ...) equally pluggable while
     * still available out of the box without extra configuration.
     */
    loadPlugins() {
        const disabled = new Set(this.options.disabledPlugins ?? []);
        pluginRegistry.forEach((factory, name) => {
            if (disabled.has(name)) return;
            this.plugins.set(name, factory(this));
        });
    }

    /**
     * @param {string} name registered plugin/module name (e.g. "link", "table")
     */
    module(name) {
        return this.plugins.get(name);
    }

    applyTheme(theme) {
        this.wrapper.dataset.theme = theme;
        if (theme === 'auto') {
            const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
            this.wrapper.dataset.resolvedTheme = prefersDark ? 'dark' : 'light';
        } else {
            this.wrapper.dataset.resolvedTheme = theme;
        }
    }

    // --------------------------------------------------------------------
    // Public API
    // --------------------------------------------------------------------

    getHTML() {
        return this.sanitizer.sanitize(this.root.innerHTML);
    }

    /** @param {string} html */
    setHTML(html) {
        this.root.innerHTML = this.sanitizer.sanitize(html);
        this.history.push();
        this.emitChange();
    }

    /** @param {string} html */
    insertHTML(html) {
        this.commands.insertHTML(this.sanitizer.sanitize(html));
    }

    undo() {
        this.history.undo();
        this.emitChange();
    }

    redo() {
        this.history.redo();
        this.emitChange();
    }

    clear() {
        this.setHTML('');
        this.history.clear();
        if (this.options.autosave?.enabled) {
            try {
                window.localStorage.removeItem(this.options.autosave.storage_key);
            } catch {
                // Storage unavailable — skip.
            }
        }
    }

    focus() {
        this.selection.focus();
    }

    getText() {
        return this.root.textContent ?? '';
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.plugins.forEach((instance) => instance?.destroy?.());
        this.events.emit('destroy', this);
        clearInterval(this.autosaveTimer);
        document.removeEventListener('keydown', this.handleShortcut);
        this.history.destroy();
        this.wrapper.remove();
        this.textarea.style.display = '';
        this.events.destroy();
    }

    /**
     * @param {string} event
     * @param {(...args: any[]) => void} handler
     */
    on(event, handler) {
        return this.events.on(event, handler);
    }

    /**
     * @param {string} name
     * @param {(editor: Editor) => { destroy?: () => void }} factory
     */
    static registerPlugin(name, factory) {
        pluginRegistry.set(name, factory);
    }
}
