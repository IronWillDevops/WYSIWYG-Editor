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
    autosave: { enabled: false, interval_ms: 15000, storage_key: 'wysiwyg-editor-autosave' },
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
        this.handleTableTab = this.handleTableTab.bind(this);
        this.handleEnter = this.handleEnter.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDragLeave = this.handleDragLeave.bind(this);
        this.bindEvents();
        this.applyTheme(this.options.theme);

        this._debouncedSyncTextarea = this._debounce(() => this.syncTextarea(), 300);
        this.loadPlugins().catch((err) => {
            console.error('WYSIWYG Editor: plugin loading failed', err);
        });
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
        this.root.innerHTML = this.sanitizer.sanitize(this.textarea.value || '') || '<div><br></div>';
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
        this.root.addEventListener('dragover', (event) => this.handleDragOver(event));
        this.root.addEventListener('dragleave', (event) => this.handleDragLeave(event));

        document.addEventListener('keydown', this.handleShortcut);
        document.addEventListener('keydown', this.handleTableTab);
        document.addEventListener('keydown', this.handleEnter);

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

    _debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    emitChange() {
        this._debouncedSyncTextarea();
        this.events.emit('change', this.getHTML());
    }

    /** @param {ClipboardEvent} event */
    handlePaste(event) {
        event.preventDefault();
        if (this.destroyed) return;
        const html = event.clipboardData?.getData('text/html');
        const text = event.clipboardData?.getData('text/plain') ?? '';
        let clean;
        if (html) {
            clean = this.sanitizer.sanitize(html);
        } else {
            clean = this.escapeHtml(this.autoLink(text));
        }
        this.commands.insertHTML(clean);
        this.events.emit('paste', { html, text });
    }

    /** Converts URLs in plain text to clickable <a> links. */
    autoLink(text) {
        return text.replace(
            /(https?:\/\/[^\s<]+)/gi,
            '<a href="$1">$1</a>'
        );
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

    /** @param {KeyboardEvent} event */
    handleTableTab(event) {
        if (event.key !== 'Tab') return;
        if (this.destroyed || !this.root.contains(document.activeElement)) return;

        const tableModule = this.module('table');
        if (!tableModule || !tableModule.getCurrentTable()) return;

        event.preventDefault();
        const backward = event.shiftKey;
        tableModule.navigateToCell(backward ? 'prev' : 'next');
    }

    /** @param {KeyboardEvent} event */
    handleEnter(event) {
        if (event.key !== 'Enter' || event.shiftKey) return;
        if (this.destroyed || !this.root.contains(document.activeElement)) return;

        const block = this.selection.getBlockElement();
        if (!block) return;

        const blockquote = block.closest('blockquote');
        const isPre = block.tagName === 'PRE' || !!block.closest('pre');
        const isNote = block.tagName === 'DIV' && block.classList.contains('note');

        const range = this.selection.getRange();
        if (!range) return;

        if (!blockquote && !isPre && !isNote) {
            let node = range.startContainer;
            if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
            if (!(node instanceof HTMLElement) || !node.closest('code')) return;
        }

        event.preventDefault();

        this.history.push();

        if (isPre) {
            const isEmpty = !block.textContent.trim();
            if (isEmpty) {
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                block.parentNode.insertBefore(p, block.nextSibling);
                block.parentNode.removeChild(block);
                const newRange = document.createRange();
                newRange.setStart(p, 0);
                newRange.collapse(true);
                this.selection.setRange(newRange);
            } else {
                this._insertBreakInPre(range);
            }
            this.emitChange();
            return;
        }

        if (blockquote) {
            const isEmpty = !block.textContent.trim();
            if (isEmpty) {
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                blockquote.parentNode.insertBefore(p, blockquote.nextSibling);
                block.parentNode.removeChild(block);
                if (!blockquote.textContent.trim() && !blockquote.children.length) {
                    blockquote.parentNode.removeChild(blockquote);
                }
                const newRange = document.createRange();
                newRange.setStart(p, 0);
                newRange.collapse(true);
                this.selection.setRange(newRange);
                this.emitChange();
                return;
            }

            const newP = document.createElement('p');
            const { startContainer, startOffset } = range;

            if (startContainer.nodeType === Node.TEXT_NODE && block.contains(startContainer)) {
                const text = startContainer.textContent;
                const before = text.slice(0, startOffset);
                const after = text.slice(startOffset);
                startContainer.textContent = before;
                if (after) newP.textContent = after;
            }

            if (!newP.textContent) newP.innerHTML = '<br>';

            block.parentNode.insertBefore(newP, block.nextSibling);

            const newRange = document.createRange();
            const targetNode = newP.firstChild || newP;
            newRange.setStart(targetNode, 0);
            newRange.collapse(true);
            this.selection.setRange(newRange);

            this.emitChange();
            return;
        }

        if (isNote) {
            const isEmpty = !block.textContent.trim();
            if (isEmpty) {
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                block.parentNode.insertBefore(p, block.nextSibling);
                block.parentNode.removeChild(block);
                const newRange = document.createRange();
                newRange.setStart(p, 0);
                newRange.collapse(true);
                this.selection.setRange(newRange);
                this.emitChange();
                return;
            }

            const newP = document.createElement('p');
            const { startContainer, startOffset } = range;

            if (startContainer.nodeType === Node.TEXT_NODE && block.contains(startContainer)) {
                const text = startContainer.textContent;
                const before = text.slice(0, startOffset);
                const after = text.slice(startOffset);
                startContainer.textContent = before;
                if (after) newP.textContent = after;
            }

            if (!newP.textContent) newP.innerHTML = '<br>';

            block.parentNode.insertBefore(newP, block.nextSibling);

            const newRange = document.createRange();
            const targetNode = newP.firstChild || newP;
            newRange.setStart(targetNode, 0);
            newRange.collapse(true);
            this.selection.setRange(newRange);

            this.emitChange();
            return;
        }

        const codeEl = (() => {
            let node = range.startContainer;
            if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
            return node instanceof HTMLElement ? node.closest('code') : null;
        })();

        if (codeEl) {
            const { startContainer, startOffset } = range;

            if (startContainer.nodeType === Node.TEXT_NODE && block.contains(startContainer)) {
                const text = startContainer.textContent;
                const before = text.slice(0, startOffset);
                const after = text.slice(startOffset);
                startContainer.textContent = before;

                const newP = document.createElement('p');
                if (after) {
                    newP.textContent = after;
                } else {
                    newP.innerHTML = '<br>';
                }

                block.parentNode.insertBefore(newP, block.nextSibling);

                if (!codeEl.textContent.trim()) {
                    const parent = codeEl.parentNode;
                    const textNode = document.createTextNode('');
                    parent.replaceChild(textNode, codeEl);
                }

                const newRange = document.createRange();
                const targetNode = newP.firstChild || newP;
                newRange.setStart(targetNode, 0);
                newRange.collapse(true);
                this.selection.setRange(newRange);
            } else {
                const newP = document.createElement('p');
                newP.innerHTML = '<br>';
                block.parentNode.insertBefore(newP, block.nextSibling);
                const newRange = document.createRange();
                newRange.setStart(newP, 0);
                newRange.collapse(true);
                this.selection.setRange(newRange);
            }

            this.emitChange();
        }
    }

    _insertBreakInPre(range) {
        const { startContainer, startOffset } = range;
        const br = document.createElement('br');

        if (startContainer.nodeType === Node.TEXT_NODE) {
            const text = startContainer.textContent;
            const before = text.slice(0, startOffset);
            const after = text.slice(startOffset);
            startContainer.textContent = before;
            startContainer.parentNode.insertBefore(br, startContainer.nextSibling);
            if (after) {
                const afterText = document.createTextNode(after);
                startContainer.parentNode.insertBefore(afterText, br.nextSibling);
            }
        } else {
            const refNode = startContainer.childNodes[startOffset] || null;
            startContainer.insertBefore(br, refNode);
        }

        const newRange = document.createRange();
        newRange.setStartAfter(br);
        newRange.collapse(true);
        this.selection.setRange(newRange);
    }

    handleDragOver() {
        if (this.destroyed) return;
        const dropIndicator = this.wrapper.querySelector('.ife-drop-cursor');
        if (!dropIndicator) {
            const indicator = document.createElement('div');
            indicator.className = 'ife-drop-cursor';
            this.wrapper.appendChild(indicator);
        }
    }

    /** @param {DragEvent} event */
    handleDragLeave(event) {
        if (this.destroyed) return;
        if (event.relatedTarget && this.wrapper.contains(event.relatedTarget)) return;
        const dropIndicator = this.wrapper.querySelector('.ife-drop-cursor');
        if (dropIndicator) dropIndicator.remove();
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
    async loadPlugins() {
        const disabled = new Set(this.options.disabledPlugins ?? []);
        const promises = [];
        pluginRegistry.forEach((factory, name) => {
            if (disabled.has(name)) return;
            promises.push(
                Promise.resolve(factory(this)).then((instance) => {
                    this.plugins.set(name, instance);
                })
            );
        });
        await Promise.all(promises);
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
        this.setHTML('<div><br></div>');
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
        document.removeEventListener('keydown', this.handleTableTab);
        document.removeEventListener('keydown', this.handleEnter);
        this.root.removeEventListener('dragover', this.handleDragOver);
        this.root.removeEventListener('dragleave', this.handleDragLeave);
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
