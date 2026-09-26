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
 * @property {number|string} [height] px number or CSS length
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

/**
 * Units that resolve without a containing block, so a height built from them
 * always yields a real, bounded box. Relative units (`%`) are rejected on
 * purpose: `max-height: 100%` on a parent of `height: auto` computes to
 * `none`, which is exactly the unbounded editor this bounds prevent.
 */
const ABSOLUTE_LENGTH_UNITS = 'px|em|rem|ch|ex|vh|vw|vmin|vmax|cm|mm|in|pt|pc|Q';
const CSS_LENGTH = new RegExp(`^(\\d+(?:\\.\\d+)?)(${ABSOLUTE_LENGTH_UNITS})?$`, 'i');

/**
 * Turns the `height` option into a CSS length, or `null` when it cannot size
 * a box (missing, `null`, a keyword, a relative length, a negative number).
 * A bare number is read as pixels so config/env values ("500") work.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
function resolveHeight(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) && value > 0 ? `${value}px` : null;
    }
    if (typeof value !== 'string') return null;
    const match = value.trim().match(CSS_LENGTH);
    if (!match) return null;
    return `${match[1]}${match[2] ?? 'px'}`;
}

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
        this.handleBackspaceDelete = this.handleBackspaceDelete.bind(this);
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
        this.applyHeight();
        this.root.innerHTML = this.sanitizer.sanitize(this.textarea.value || '') || '<div><br></div>';
        this.root.setAttribute('role', 'textbox');
        this.root.setAttribute('aria-multiline', 'true');

        this.wrapper.appendChild(this.root);
        this.textarea.insertAdjacentElement('afterend', this.wrapper);
    }

    /**
     * Applies the `height` option to the editor's own box — the only thing
     * that sizes the editor, and the only place allowed to write it.
     *
     * The bound lives on the wrapper, not on the content area, because the
     * wrapper is the box the host page can actually constrain: a component
     * wrapper, a panel, a grid row, a `class="h-64"` on `<x-editor>`. A bound on
     * the content area is a floor that nothing above it can lower, so a host
     * box shorter than the configured height simply had the editor rendered
     * outside it — content area *and* status bar — with the wrapper's
     * `overflow: hidden` clipping the difference away and no scrollbar to reach
     * it. Sizing the box instead lets the content area (the only flexible part,
     * `flex: 1 1 0; min-height: 0; overflow: auto`) take whatever is left
     * between the two bars and scroll inside it, so large content (long code
     * blocks, huge tables, a big paste, ...) never grows the editor, never
     * reaches past the status bar and never turns the page into the only scroll
     * area.
     *
     * `fullscreen: true` hands the box over to the viewport, which then defines
     * its size; calling it again re-applies that. The height is re-derived from
     * the option instead of being snapshotted, so no number of fullscreen round
     * trips (or a native Esc) can leave the editor without it.
     *
     * A `height` that cannot size a box (missing, a keyword, a relative
     * length) falls back to the default instead of emitting a declaration the
     * browser drops, which would leave the editor unbounded.
     *
     * @param {boolean} [fullscreen]
     */
    applyHeight(fullscreen = false) {
        if (!this.wrapper) return;
        const height = resolveHeight(this.options.height) ?? `${DEFAULT_OPTIONS.height}px`;
        // Remembered so `ensureHeightBounds()` can re-assert exactly what was
        // applied, and so the last mode (fullscreen or not) is never guessed.
        // Fullscreen sizes the box against the viewport instead of the
        // configured height. It is a percentage rather than `auto` on purpose:
        // the box's floor is `min-content` (its own bars, see the stylesheet),
        // and Chromium resolves a content-based `min-height` on an absolutely
        // positioned box against the box's own content — which drops the
        // `position: fixed; inset: 0` stretch and left fullscreen exactly as
        // tall as the two bars. A percentage resolves against the viewport in
        // both the fullscreen element and the class fallback, with no
        // dependence on the insets at all.
        this._bounds = fullscreen ? { height: '100%', max: 'none' } : { height, max: height };
        this.wrapper.style.height = this._bounds.height;
        this.wrapper.style.maxHeight = this._bounds.max;
    }

    /**
     * Re-asserts the editor's box after a change.
     *
     * The height lives in the wrapper's inline `style` attribute, so anything
     * that rewrites that attribute takes the editor's layout with it: the
     * content area stops being a bounded scroll container, large content
     * stretches the editor, the page becomes the only scroll area, the toolbar
     * and status bar travel with it and the editor never shows a scrollbar of
     * its own. The height is therefore re-asserted on every change, so no such
     * path — a plugin, a host page's own script — can leave the editor unbounded
     * for longer than one edit.
     */
    ensureHeightBounds() {
        if (this.destroyed || !this.wrapper || !this._bounds) return;
        const { height, max } = this._bounds;
        if (this.wrapper.style.height === height && this.wrapper.style.maxHeight === max) return;
        this.wrapper.style.height = height;
        this.wrapper.style.maxHeight = max;
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
        document.addEventListener('keydown', this.handleBackspaceDelete);

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
            // Keep the pending timer on the instance so destroy() can cancel a
            // scheduled textarea sync even when it was queued long ago (the
            // closure timer alone would be unreachable from outside).
            this._debounceTimer = timer = setTimeout(() => fn(...args), delay);
        };
    }

    emitChange() {
        // Every content change re-asserts the content area's bounds, so an
        // unbounded editor (bars drifting, no inner scrollbar) can never
        // survive an edit — see `ensureHeightBounds()`.
        this.ensureHeightBounds();
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
            clean = this.autoLink(this.escapeHtml(text));
        }
        this.commands.insertHTML(clean);
        this.events.emit('paste', { html, text });
    }

    /** Converts URLs in plain text to clickable <a> links. */
    autoLink(text) {
        // Called with already-escapeHtml()-escaped text, so '&' inside a URL will
        // already be '&amp;' (and '"' already '&quot;'). Escape any remaining
        // raw '&'/'"' without double-escaping existing entities — keeping the URL
        // valid inside href="..." and safe to round-trip through getHTML().
        const escapeHrefPart = (value) => value
            .replace(/&(?!(?:amp|lt|gt|quot|#\d+|#x[0-9a-f]+);)/gi, '&amp;')
            .replace(/"/g, '&quot;');
        return text.replace(
            /(https?:\/\/[^\s<]+)/gi,
            (match) => {
                const escaped = escapeHrefPart(match);
                return `<a href="${escaped}">${escaped}</a>`;
            }
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
            z: () => {
                if (event.shiftKey) this.history.redo();
                else this.history.undo();
                // Undo/redo restore the caret and content — refresh the toolbar's
                // active states so formatting buttons match the restored position.
                this.syncSelectionState();
            },
            y: () => {
                this.history.redo();
                this.syncSelectionState();
            },
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

        if (isPre) {
            // A code block with no content at all is removed by Enter (the caret
            // exits into a fresh paragraph), matching the established behavior.
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
                this.commit();
                return;
            }

            // The block has content: work out which line holds the caret (a <pre>
            // can hold several lines separated by <br>). Enter on an empty or
            // whitespace-only line exits the code block right there; Enter on any
            // other line just inserts a line break inside the block.
            const { children, startIndex, endIndex } = this.commands._getLineWindow(
                block,
                range.startContainer,
                range.startOffset
            );
            const lineText = children
                .slice(startIndex, endIndex + 1)
                .map((node) => node.textContent ?? '')
                .join('');
            if (lineText.trim() === '') {
                this._exitPreFromEmptyLine(block, startIndex - 1, endIndex + 1);
            } else {
                this._insertBreakInPre(range);
            }
            this.commit();
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
                this.commit();
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

            this.commit();
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
                this.commit();
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

            this.commit();
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

            this.commit();
        }
    }

    /** Records a history snapshot and notifies listeners after a mutation */
    commit() {
        this.history.push();
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
        } else if (startContainer.tagName === 'BR') {
            // A caret anchored directly on a <br> (e.g. the position the browser
            // leaves after a previous Enter) means the caret sits *after* that
            // break — inserting into the <br> itself (its child list) would
            // corrupt the DOM, so insert at the parent level instead.
            startContainer.parentNode.insertBefore(br, startContainer.nextSibling);
        } else {
            const refNode = startContainer.childNodes[startOffset] || null;
            startContainer.insertBefore(br, refNode);
        }

        // Normalize the break's container: a <br> must be a direct child of the
        // <pre> so the next Enter still resolves against the pre's own line
        // window. A break left inside an inline wrapper (e.g. a nested <code>)
        // would trap every subsequent Enter inside that wrapper and the block
        // could never reach an "empty line" to exit from.
        const pre = this.commands.closestPre(br);
        if (pre && br.parentNode !== pre) {
            let holder = br;
            while (holder.parentNode && holder.parentNode !== pre) holder = holder.parentNode;
            pre.insertBefore(br, holder.nextSibling);
        }

        const newRange = document.createRange();
        newRange.setStartAfter(br);
        newRange.collapse(true);
        this.selection.setRange(newRange);
    }

    /**
     * Exits a code block from an empty line: splits the <pre> around the empty
     * line into [<pre>left</pre> <p><br></p> <pre>right</pre>] and places the
     * caret in the new paragraph. The seam <br>s consumed by the split are
     * dropped when the side keeps other content (a lone <br> is a real empty
     * line and is preserved).
     * @param {HTMLElement} pre the code block
     * @param {number} lo index in pre.childNodes of the separator before the empty line
     * @param {number} hi index in pre.childNodes of the separator after the empty line
     */
    _exitPreFromEmptyLine(pre, lo, hi) {
        const children = [...pre.childNodes];
        const makePre = () => {
            const el = document.createElement('pre');
            const cls = pre.getAttribute('class');
            if (cls) el.setAttribute('class', cls);
            return el;
        };

        const left = makePre();
        for (let i = 0; i <= lo; i++) left.appendChild(children[i]);
        const right = makePre();
        for (let i = hi; i < children.length; i++) right.appendChild(children[i]);

        this.commands._dropSeamBr(left, 'end');
        this.commands._dropSeamBr(right, 'start');

        const p = document.createElement('p');
        p.innerHTML = '<br>';

        const parent = pre.parentNode;
        if (left.firstChild) parent.insertBefore(left, pre);
        parent.insertBefore(p, pre);
        if (right.firstChild) parent.insertBefore(right, pre);
        pre.remove();

        const newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        this.selection.setRange(newRange);
    }

    /**
     * Keydown handler for Backspace/Delete inside a code block. Native
     * contenteditable handles editing fine in most browsers, but an empty
     * <pre> (the placeholder a code block leaves behind once its content is
     * gone) can get stuck: Chrome does not remove an empty <pre> on Backspace
     * the way it removes an empty <p>. Removing it manually lets the user
     * actually delete a code block.
     * @param {KeyboardEvent} event
     */
    handleBackspaceDelete(event) {
        if (event.key !== 'Backspace' && event.key !== 'Delete') return;
        if (this.destroyed || !this.root.contains(document.activeElement)) return;

        const range = this.selection.getRange();
        if (!range || !range.collapsed) return;

        const pre = this.commands.closestPre(range.startContainer);
        if (!pre) return;
        // Only act on placeholders: deleting a block that still holds code is
        // left to the browser's native merge/delete behavior.
        if (pre.textContent.trim() !== '') return;

        const atStart = this._isAtBlockStart(pre, range);
        const atEnd = this._isAtBlockEnd(pre, range);
        if (!(event.key === 'Backspace' && atStart) && !(event.key === 'Delete' && atEnd)) return;

        event.preventDefault();
        this._removeEmptyPre(pre, event.key === 'Backspace');
        this.commit();
        this.syncSelectionState();
    }

    /** Whether a collapsed range sits at the very start of an element. */
    _isAtBlockStart(block, range) {
        const probe = document.createRange();
        probe.setStart(block, 0);
        probe.setEnd(range.startContainer, range.startOffset);
        return probe.toString() === '';
    }

    /** Whether a collapsed range sits at the very end of an element. */
    _isAtBlockEnd(block, range) {
        const probe = document.createRange();
        probe.setStart(range.startContainer, range.startOffset);
        probe.setEnd(block, block.childNodes.length);
        return probe.toString() === '';
    }

    /**
     * Removes an empty code block and moves the caret to the neighboring
     * block — the end of the previous one after Backspace, the start of the
     * next one after Delete (mirroring native empty-paragraph removal).
     * @param {HTMLElement} pre
     * @param {boolean} isBackspace
     */
    _removeEmptyPre(pre, isBackspace) {
        const prev = pre.previousElementSibling;
        const next = pre.nextElementSibling;
        pre.remove();

        const range = document.createRange();
        const target = isBackspace ? (prev ?? next) : (next ?? prev);
        if (target && target !== this.root) {
            if (isBackspace) {
                range.selectNodeContents(target);
                range.collapse(false);
            } else {
                range.setStart(target, 0);
                range.collapse(true);
            }
        } else {
            range.selectNodeContents(this.root);
            range.collapse(false);
        }
        this.selection.setRange(range);
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
        // Undo restored the caret — refresh toolbar active states so they match
        // the restored position (bold/codeBlock/... button highlighting).
        this.syncSelectionState();
        this.emitChange();
    }

    redo() {
        this.history.redo();
        this.syncSelectionState();
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
        clearTimeout(this._debounceTimer);
        document.removeEventListener('keydown', this.handleShortcut);
        document.removeEventListener('keydown', this.handleTableTab);
        document.removeEventListener('keydown', this.handleEnter);
        document.removeEventListener('keydown', this.handleBackspaceDelete);
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
