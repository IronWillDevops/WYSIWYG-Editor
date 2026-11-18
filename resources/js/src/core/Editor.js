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
        this.handleTab = this.handleTab.bind(this);
        this.handleEnter = this.handleEnter.bind(this);
        this.handleBackspace = this.handleBackspace.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
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
        // emitChange() records the debounced history snapshot as well, so a
        // single "content changed" signal drives history, textarea sync and
        // the public change event (previously only native input events were
        // recorded, leaving manual DOM mutations un-undoable as one step).
        this.root.addEventListener('input', () => this.emitChange());

        this.root.addEventListener('keyup', () => this.syncSelectionState());
        this.root.addEventListener('mouseup', () => this.syncSelectionState());

        this.root.addEventListener('focus', () => this.events.emit('focus', this));
        this.root.addEventListener('blur', () => {
            this.syncTextarea();
            this.events.emit('blur', this);
        });

        this.root.addEventListener('paste', (event) => this.handlePaste(event));
        // Bound handlers (not arrow wrappers) so destroy() actually detaches them.
        this.root.addEventListener('click', this.handleClick);
        this.root.addEventListener('drop', this.handleDrop);
        this.root.addEventListener('dragover', this.handleDragOver);
        this.root.addEventListener('dragleave', this.handleDragLeave);

        document.addEventListener('keydown', this.handleShortcut);
        document.addEventListener('keydown', this.handleTableTab);
        document.addEventListener('keydown', this.handleTab);
        document.addEventListener('keydown', this.handleEnter);
        document.addEventListener('keydown', this.handleBackspace);

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
            start: this.selection.offsetOf(range.startContainer, range.startOffset),
            end: this.selection.offsetOf(range.endContainer, range.endOffset),
        };
    }

    /**
     * Character offset of a (node, offset) boundary from the root's start.
     * Delegates to Selection.offsetOf, which — unlike a plain text-node walk —
     * also understands element boundaries: a caret sitting in an empty block
     * (container = the block element) used to be measured as "end of the
     * whole document", so undo restored the caret in the wrong place.
     * @param {Node} node
     * @param {number} offset
     * @returns {number}
     */
    textOffset(node, offset) {
        return this.selection.offsetOf(node, offset);
    }

    /**
     * Restore caret from a previously saved bookmark.
     * A missing bookmark (e.g. undoing back to the seed snapshot) puts the
     * caret at the start of the content instead of dropping the selection
     * when the innerHTML swap detached the old range.
     * @param {{start: number, end: number}|null} bookmark
     */
    restoreSelectionBookmark(bookmark) {
        if (bookmark && bookmark.start !== null && bookmark.end !== null) {
            this.selection.setRangeByOffsets(bookmark.start, bookmark.end);
            return;
        }
        const first = this.selection.offsetToPoint(0);
        if (!first) return;
        const range = document.createRange();
        range.setStart(first.node, first.offset);
        range.collapse(true);
        this.selection.setRange(range);
    }

    /**
     * Find the text position at a given character offset from the root start.
     * Delegates to Selection.offsetToPoint (same logic, single implementation).
     * @param {number} target
     * @returns {{node: Node, offset: number}|null}
     */
    nodeAtOffset(target) {
        return this.selection.offsetToPoint(target);
    }

    _debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    emitChange() {
        if (this.destroyed) return;
        this.history.record();
        this._debouncedSyncTextarea();
        this.events.emit('change', this.getHTML());
    }

    /** @param {ClipboardEvent} event */
    handlePaste(event) {
        event.preventDefault();
        if (this.destroyed) return;
        const html = event.clipboardData?.getData('text/html');
        const text = event.clipboardData?.getData('text/plain') ?? '';
        // An empty clipboard must not run through insertHTML: with nothing to
        // insert it would still deleteContents() and wipe the user's selection.
        if (!html && !text) return;
        let clean;
        if (html) {
            clean = this.sanitizer.sanitize(html);
        } else {
            // Escape first, then linkify: running autoLink before escaping
            // wrapped the URLs in real <a> tags that the escaping step then
            // turned into visible literal text instead of links.
            clean = this.autoLink(this.escapeHtml(text));
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
            // Route through the public undo()/redo() so the change event fires
            // and the textarea/`change` consumers stay in sync — calling
            // history.undo() directly left the UI stale after Ctrl+Z.
            z: () => (event.shiftKey ? this.redo() : this.undo()),
            y: () => this.redo(),
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

    /**
     * Tab / Shift+Tab inside a list item changes its nesting level.
     * Outside a list (and outside a table, which handleTableTab owns) Tab is
     * left to the browser so focus navigation keeps working normally.
     * @param {KeyboardEvent} event
     */
    handleTab(event) {
        if (event.key !== 'Tab') return;
        if (this.destroyed || !this.root.contains(document.activeElement)) return;

        const tableModule = this.module('table');
        if (tableModule?.getCurrentTable()) return;

        const li = this.getCaretListItem();
        if (!li) return;

        event.preventDefault();
        this.history.push();
        if (event.shiftKey) this.commands.outdentListItem(li);
        else this.commands.indentListItem(li);
        this.emitChange();
    }

    /**
     * The <li> containing the caret (if any), bounded by the editor root.
     * @param {Range} [range] an already-resolved range to reuse
     * @returns {HTMLElement|null}
     */
    getCaretListItem(range = null) {
        const caret = range ?? this.selection.getRange();
        if (!caret) return null;
        let node = caret.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        return node instanceof HTMLElement ? node.closest('li') : null;
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
        const isHeading = /^H[1-6]$/.test(block.tagName);

        const range = this.selection.getRange();
        if (!range) return;

        // List items are handled before blockquote/pre/note: the browser's
        // own Enter splits a non-empty <li> correctly, while an empty one
        // must leave the list entirely. Without this branch the blockquote
        // path below injected a <p> inside the <ul> and an empty item could
        // never get out of the list (headings kept behaving like list input).
        const li = this.getCaretListItem(range);
        if (li) {
            if (this.commands.isListItemEmpty(li)) {
                event.preventDefault();
                this.history.push();
                this.commands.exitList(li);
                this.emitChange();
            }
            return;
        }

        // Block types the editor manages itself are intercepted; plain
        // paragraphs/lines stay with the browser's own (correct) split —
        // unless the caret sits in an inline <code> run, which Enter exits.
        if (!isPre && !isNote && !isHeading && !blockquote && !this.isInlineCodeCaret(range)) return;

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

        // An empty special block (quote line, note, heading) turns back into
        // a plain paragraph instead of nesting a second empty shell, and an
        // image/embed-only block must never be dropped by that exit.
        if ((isNote || isHeading || blockquote) && this.commands.isBlockEmpty(block)) {
            if (blockquote && block !== blockquote) {
                // Leave the quote: the paragraph continues the document after
                // it, and the quote itself goes once its last line is gone.
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                blockquote.parentNode.insertBefore(p, blockquote.nextSibling);
                block.remove();
                if (this.commands.isBlockEmpty(blockquote)) blockquote.remove();
                const newRange = document.createRange();
                newRange.setStart(p, 0);
                newRange.collapse(true);
                this.selection.setRange(newRange);
            } else {
                this.replaceBlockWithParagraph(block);
            }
            this.emitChange();
            return;
        }

        this.splitBlockAtCaret(block, range);
        this.emitChange();
    }

    /**
     * Whether the caret sits in an inline <code> run (as opposed to a
     * <pre> block, which handleEnter treats on its own).
     * @param {Range} range
     * @returns {boolean}
     */
    isInlineCodeCaret(range) {
        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        if (!(node instanceof HTMLElement)) return false;
        return !!node.closest('code') && !node.closest('pre');
    }

    /**
     * Whether a collapsed caret sits before any content of the block,
     * measured in the root's text stream (so element-container carets such
     * as (block, 0) compare correctly against text-node carets).
     * @param {HTMLElement} block
     * @param {Range} range
     * @returns {boolean}
     */
    isCaretAtBlockStart(block, range) {
        if (!range.collapsed) return false;
        const caret = this.selection.offsetOf(range.startContainer, range.startOffset);
        return caret === this.selection.offsetOf(block, 0);
    }

    /**
     * Splits the block at the caret: everything from the caret to the end of
     * the block moves into a new <p> right after it, so no content after the
     * caret is ever left behind (the previous per-text-node split only moved
     * the caret's own text node and scrambled the order whenever the block
     * held several inline nodes, e.g. `ab<strong>cd</strong>ef` became
     * `ab c…ef` + `d`). Inline formatting survives the move; an inline
     * <code> run the caret sits in is unwrapped in the moved tail so typing
     * continues as normal text. A caret at the very start of the block
     * (outside code) opens an empty paragraph above instead, so the content
     * keeps its own block type — matching the browser's Enter semantics.
     * @param {HTMLElement} block the block (or blockquote) holding the caret
     * @param {Range} range the selection range at the caret
     */
    splitBlockAtCaret(block, range) {
        const inCode = this.isInlineCodeCaret(range);

        if (!inCode && this.isCaretAtBlockStart(block, range)) {
            const empty = document.createElement('p');
            empty.innerHTML = '<br>';
            block.parentNode.insertBefore(empty, block);
            return;
        }

        const tailRange = document.createRange();
        tailRange.selectNodeContents(block);
        tailRange.setStart(range.startContainer, range.startOffset);
        const fragment = tailRange.extractContents();

        // Exit inline code: the moved tail must not stay inside <code>.
        if (inCode) {
            [...fragment.querySelectorAll('code')].forEach((codeEl) => {
                const parent = codeEl.parentNode;
                if (!parent) return;
                while (codeEl.firstChild) parent.insertBefore(codeEl.firstChild, codeEl);
                parent.removeChild(codeEl);
            });
        }

        // extractContents() yields an empty *text node* for a caret at the
        // end of the block — truthy but invisible. Appending it produced a
        // dead <p></p> (no <br>, zero height, no place for the caret), so
        // content is judged by what renders, not by childNodes.length.
        const hasContent = fragment.textContent.trim() !== ''
            || !!fragment.querySelector('br, img, input, iframe, table, figure, video, audio, hr');
        const newBlock = document.createElement('p');
        if (hasContent) newBlock.appendChild(fragment);
        else newBlock.innerHTML = '<br>';

        this.pruneEmptyInline(block);
        if (!block.firstChild) block.innerHTML = '<br>';

        // A blockquote acting as its own block keeps the tail inside the quote.
        if (block.tagName === 'BLOCKQUOTE') block.appendChild(newBlock);
        else block.parentNode.insertBefore(newBlock, block.nextSibling);

        const newRange = document.createRange();
        newRange.setStart(newBlock, 0);
        newRange.collapse(true);
        this.selection.setRange(newRange);
    }

    /**
     * Replaces a block with a plain empty paragraph and puts the caret there.
     * @param {HTMLElement} block
     */
    replaceBlockWithParagraph(block) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        block.parentNode.insertBefore(p, block.nextSibling);
        block.remove();
        const newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        this.selection.setRange(newRange);
    }

    /**
     * Drops inline wrappers a split may have left empty, so the serialized
     * markup stays clean (`<p><code></code>tail</p>` → `<p>tail</p>`).
     * Whitespace-only and media-carrying wrappers are kept: they render.
     * @param {HTMLElement} block
     */
    pruneEmptyInline(block) {
        const inline = block.querySelectorAll('code, strong, em, b, i, u, s, strike, sub, sup, mark, span');
        [...inline].forEach((el) => {
            if (el.textContent !== '') return;
            if (el.querySelector('br, img, input, iframe, table, figure, video, audio, ul, ol, a')) return;
            if (el.hasAttribute('id') || el.hasAttribute('name')) return;
            el.remove();
        });
    }

    /**
     * Backspace/Delete at the start (or end) of an empty list item removes
     * the item in the direction the key implies (and collapses an emptied
     * list into a paragraph). Non-empty items are left to the browser's own
     * merging behaviour.
     * @param {KeyboardEvent} event
     */
    handleBackspace(event) {
        if (event.key !== 'Backspace' && event.key !== 'Delete') return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (this.destroyed || !this.root.contains(document.activeElement)) return;

        const range = this.selection.getRange();
        if (!range || !range.collapsed) return;

        const li = this.getCaretListItem(range);
        if (!li || !this.commands.isListItemEmpty(li)) return;

        event.preventDefault();
        this.history.push();
        this.commands.removeListItem(li, event.key === 'Delete' ? 'forward' : 'backward');
        this.emitChange();
    }

    /**
     * Checklist checkboxes are not live form controls inside a
     * contenteditable: a click does not toggle them, so the `checked`
     * attribute is flipped by hand and recorded as a change (undoable like
     * any other edit).
     * @param {MouseEvent} event
     */
    handleClick(event) {
        if (this.destroyed) return;
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const checkbox = target.closest('input[type="checkbox"]');
        if (!checkbox || !this.root.contains(checkbox)) return;

        // Keep the attribute (not just the property) in sync so the state
        // survives serialization; preventDefault stops any native toggling
        // that would desync it again.
        event.preventDefault();
        this.history.push();
        if (checkbox.hasAttribute('checked')) checkbox.removeAttribute('checked');
        else checkbox.setAttribute('checked', '');
        this.emitChange();
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

    /** Removes the drag-drop insertion indicator, if it is showing. */
    removeDropIndicator() {
        const indicator = this.wrapper?.querySelector('.ife-drop-cursor');
        if (indicator) indicator.remove();
    }

    handleDragOver() {
        if (this.destroyed) return;
        if (!this.wrapper.querySelector('.ife-drop-cursor')) {
            const indicator = document.createElement('div');
            indicator.className = 'ife-drop-cursor';
            this.wrapper.appendChild(indicator);
        }
    }

    /** @param {DragEvent} event */
    handleDragLeave(event) {
        if (this.destroyed) return;
        if (event.relatedTarget && this.wrapper.contains(event.relatedTarget)) return;
        this.removeDropIndicator();
    }

    /** @param {DragEvent} event */
    handleDrop(event) {
        // The indicator is normally removed by dragleave, but a drop cancels
        // the drag sequence first — without this it stayed visible forever.
        this.removeDropIndicator();
        if (this.destroyed) return;
        this.events.emit('drop', event);
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
        document.removeEventListener('keydown', this.handleTab);
        document.removeEventListener('keydown', this.handleEnter);
        document.removeEventListener('keydown', this.handleBackspace);
        this.root.removeEventListener('click', this.handleClick);
        this.root.removeEventListener('drop', this.handleDrop);
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
