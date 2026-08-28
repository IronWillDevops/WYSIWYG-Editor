/**
 * Central command executor. Wraps the small, still well-supported subset of
 * document.execCommand for inline formatting (bold/italic/underline/lists),
 * and implements block-level / structural commands manually for full control
 * over the resulting markup (no legacy <font>/<b> soup).
 */
import { isDefaultTextColor, isDefaultBgColor } from '../utils/colors.js';

/** Block-level elements handled by structural commands (headings, lists, notes, ...). */
const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'LI', 'DIV', 'UL', 'OL', 'TABLE', 'FIGURE']);

export default class Commands {
    /**
     * @param {import('./Editor').default} editor
     */
    constructor(editor) {
        this.editor = editor;
    }

    get root() {
        return this.editor.root;
    }

    get selection() {
        return this.editor.selection;
    }

    /** Ensures the root has focus and the saved selection is active before mutating. */
    prepare() {
        this.root.focus();
        this.selection.restore();
        // Without this, execCommand falls back to its legacy markup (<b>, <i>,
        // <strike>, <font color>) instead of CSS-based <span style="...">.
        // Those legacy tags aren't in the Sanitizer's allow-list, so every
        // bold/italic/strikethrough/text-color edit was silently stripped out
        // as soon as the content got serialized (getHTML()/textarea sync/save),
        // even though it still looked fine live in the contenteditable area.
        try {
            document.execCommand('styleWithCSS', false, true);
        } catch {
            // Some browsers may reject this; formatting still works, just
            // with legacy tags in that (rare) case.
        }
    }

    exec(name, value = null) {
        this.prepare();
        this.editor.history.push();

        switch (name) {
            case 'bold':
            case 'italic':
            case 'underline':
            case 'strikeThrough':
            case 'indent':
            case 'outdent':
            case 'justifyLeft':
            case 'justifyCenter':
            case 'justifyRight':
            case 'justifyFull':
                document.execCommand(name, false, value ?? undefined);
                break;

            case 'superscript':
            case 'subscript':
                // execCommand's own toggle detection for superscript/subscript
                // relies on the presence of a <sup>/<sub> ancestor. styleWithCSS
                // (enabled above for every other command so bold/italic/color
                // survive sanitization) makes some browsers wrap the selection in
                // a new <span style="vertical-align:..."> on every call instead of
                // reusing/removing the existing <sup>/<sub>, so a second click
                // nested a wrapper instead of turning the formatting back off.
                // These two commands don't have a meaningful CSS-based form
                // anyway (they always use <sup>/<sub>), so run them with
                // styleWithCSS off to get real native toggle behavior, then
                // restore the flag for every other command.
                try {
                    document.execCommand('styleWithCSS', false, false);
                } catch {
                    // ignore, fall through and try the command anyway
                }
                document.execCommand(name, false, value ?? undefined);
                try {
                    document.execCommand('styleWithCSS', false, true);
                } catch {
                    // ignore
                }
                break;

            case 'insertUnorderedList':
                this.toggleList('ul');
                break;

            case 'insertOrderedList':
                this.toggleList('ol');
                break;

            case 'foreColor':
                // A default/neutral text color (black) is not an explicit
                // choice — it is what the color picker reports by default.
                // Treat it as "clear the text color" so the site theme (not a
                // hard-coded value) controls the color, avoiding invisible
                // text in dark themes.
                if (value && !isDefaultTextColor(value)) {
                    document.execCommand('foreColor', false, value);
                } else {
                    this.clearColor('color');
                }
                break;

            case 'backColor':
                // Likewise, the default background (white) clears the
                // highlights so no hard-coded white box is persisted.
                if (value && !isDefaultBgColor(value)) {
                    document.execCommand('hiliteColor', false, value);
                } else {
                    this.clearColor('backgroundColor');
                }
                break;

            case 'lineHeight':
                this.setInlineStyle('lineHeight', value, true);
                break;

            case 'direction':
                this.setDirection(value);
                break;

            case 'removeFormat':
                // Native removeFormat strips most inline formatting elements
                // (b/i/u/s/sup/sub/span[style]) but browsers are inconsistent
                // about fully clearing every inline style property, so follow it
                // up with an explicit sweep to guarantee a clean result (this is
                // also what powers the "clear formatting / reset text color"
                // toolbar button).
                document.execCommand('removeFormat', false);
                this.clearInlineStyles();
                break;

            case 'formatBlock':
                this.formatBlock(value);
                break;

            default:
                throw new Error(`Unknown command: ${name}`);
        }

        this.editor.emitChange();
        this.editor.events.emit('selectionchange', this.editor);
    }

    queryState(name) {
        try {
            return document.queryCommandState(name);
        } catch {
            return false;
        }
    }

    /**
     * Sets the text direction (ltr/rtl) on the current block element.
     * @param {'ltr'|'rtl'} dir
     */
    setDirection(dir) {
        const block = this.selection.getBlockElement();
        if (block) {
            block.dir = dir;
            return;
        }
    }

    /**
     * Applies an inline CSS property to the current selection by wrapping it in a <span>.
     * @param {string} cssProperty camelCase property name
     * @param {string} value
     * @param {boolean} [onBlock] apply to the enclosing block instead of wrapping inline
     */
    setInlineStyle(cssProperty, value, onBlock = false) {
        if (onBlock) {
            const block = this.selection.getBlockElement();
            if (block) {
                block.style[cssProperty] = value;
                return;
            }
        }

        const existing = this.selection.closest('span');
        if (existing) {
            existing.style[cssProperty] = value;
            return;
        }

        const span = this.selection.wrap('span');
        if (span) span.style[cssProperty] = value;
    }

    /**
     * Toggles the current selection in/out of a <ul>/<ol> list, or converts
     * it from one list type to the other. Implemented by hand (instead of
     * relying on execCommand('insertUnorderedList'/'insertOrderedList'))
     * because that command is notoriously inconsistent across browsers when
     * the contenteditable root is a plain <div> with mixed block children
     * (as this editor's root is): it can silently no-op, or fail to remove
     * the list on a second click. Manual DOM manipulation gives predictable,
     * cross-browser behavior and matches how blockFormat is already handled.
     * @param {'ul'|'ol'} listTag
     */
    toggleList(listTag) {
        const range = this.selection.getRange();
        if (!range) return;

        const currentLi = this.selection.closest('li');
        if (currentLi) {
            const currentList = currentLi.closest('ul, ol');
            if (currentList && currentList.tagName.toLowerCase() === listTag) {
                this.unwrapList(currentList);
            } else if (currentList) {
                this.convertList(currentList, listTag);
            }
            return;
        }

        const blocks = this.getBlocksInRange(range);
        if (!blocks.length) return;

        const list = document.createElement(listTag);
        blocks.forEach((block) => {
            const li = document.createElement('li');
            li.innerHTML = block.innerHTML || '<br>';
            list.appendChild(li);
        });

        blocks[0].replaceWith(list);
        blocks.slice(1).forEach((block) => block.remove());

        const newRange = document.createRange();
        newRange.selectNodeContents(list.lastElementChild);
        newRange.collapse(false);
        this.selection.setRange(newRange);
    }

    /**
     * Finds the top-level block elements (paragraphs, headings, etc.)
     * touched by a range, so multi-line selections can become a single list.
     * @param {Range} range
     * @returns {HTMLElement[]}
     */
    getBlocksInRange(range) {
        // Guard against ranges that live outside the editor root entirely.
        if (!this.root.contains(range.commonAncestorContainer)) return [];

        // A range whose common ancestor is the root itself (e.g. Select All,
        // or a selection spanning several top-level blocks) has no single
        // enclosing block, so collect every top-level block the range touches.
        if (range.commonAncestorContainer === this.root) {
            const topBlocks = [...this.root.children].filter(
                (el) => el instanceof HTMLElement && BLOCK_TAGS.has(el.tagName)
            );
            return topBlocks;
        }

        // Nearest block-level ancestor of a node at any depth (the block does
        // not have to be a direct child of the root — nested <p> inside a
        // <div>, inline wrappers, etc. all resolve to their real block).
        const nearestBlock = (node) => {
            let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
            if (el === this.root) return null;
            while (el && el !== this.root) {
                if (el instanceof HTMLElement && BLOCK_TAGS.has(el.tagName)) {
                    return el;
                }
                el = el.parentElement;
            }
            return null;
        };

        const startBlock = nearestBlock(range.startContainer);
        if (!startBlock) return [];

        const endBlock = nearestBlock(range.endContainer) ?? startBlock;
        if (startBlock === endBlock) return [startBlock];

        // Both blocks share a parent (the usual multi-paragraph selection):
        // walk the siblings between them.
        if (startBlock.parentNode === endBlock.parentNode) {
            const blocks = [];
            let node = startBlock;
            while (node) {
                blocks.push(node);
                if (node === endBlock) break;
                node = node.nextElementSibling;
            }
            return blocks.length ? blocks : [startBlock];
        }

        // Blocks at different nesting levels: collect the top-level blocks
        // that contain them, in document order.
        const topLevelOf = (el) => {
            let cur = el;
            while (cur && cur.parentNode !== this.root) cur = cur.parentNode;
            return cur;
        };
        const topStart = topLevelOf(startBlock);
        const topEnd = topLevelOf(endBlock);
        if (topStart && topEnd) {
            const blocks = [];
            let node = topStart;
            while (node) {
                blocks.push(node);
                if (node === topEnd) break;
                node = node.nextElementSibling;
            }
            return blocks.length ? blocks : [startBlock];
        }
        return [startBlock];
    }

    /** @param {HTMLElement} list @param {'ul'|'ol'} listTag */
    convertList(list, listTag) {
        const replacement = document.createElement(listTag);
        replacement.className = list.className;
        replacement.innerHTML = list.innerHTML;
        list.replaceWith(replacement);

        const newRange = document.createRange();
        newRange.selectNodeContents(replacement);
        newRange.collapse(false);
        this.selection.setRange(newRange);
    }

    /** Removes a list, turning each <li> back into a plain paragraph. @param {HTMLElement} list */
    unwrapList(list) {
        const fragment = document.createDocumentFragment();
        [...list.children].forEach((li) => {
            if (li.tagName !== 'LI') return;
            const p = document.createElement('p');
            p.innerHTML = li.innerHTML || '<br>';
            fragment.appendChild(p);
        });

        const last = fragment.lastElementChild;
        list.replaceWith(fragment);

        if (last) {
            const newRange = document.createRange();
            newRange.selectNodeContents(last);
            newRange.collapse(false);
            this.selection.setRange(newRange);
        }
    }

    /**
     * Removes a specific CSS property from every element touched by
     * the current selection. Used by the color button "clear" action.
     * @param {string} cssProp camelCase property name (e.g. 'color', 'backgroundColor')
     */
    clearColor(cssProp) {
        const range = this.selection.getRange();
        if (!range) return;

        let container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
        if (!(container instanceof HTMLElement)) return;

        const candidates = container.style?.length
            ? [container, ...container.querySelectorAll('*')]
            : [...container.querySelectorAll('*')];

        candidates.forEach((el) => {
            try { if (!range.intersectsNode(el)) return; } catch { return; }
            if (el.style?.[cssProp]) {
                el.style[cssProp] = '';
                if (el.style.length === 0) el.removeAttribute('style');
            }
            if (['SPAN', 'FONT'].includes(el.tagName) && el.attributes.length === 0) {
                const parent = el.parentNode;
                if (!parent) return;
                while (el.firstChild) parent.insertBefore(el.firstChild, el);
                parent.removeChild(el);
            }
        });
    }

    /**
     * Strips leftover inline style attributes (text color, background,
     * font, etc.) from every element touched by the current selection.
     * Backs the "clear formatting" / "reset text color" toolbar action.
     */
    clearInlineStyles() {
        const range = this.selection.getRange();
        if (!range) return;

        let container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
        if (!(container instanceof HTMLElement)) return;

        const candidates = container.style?.length ? [container, ...container.querySelectorAll('*')] : [...container.querySelectorAll('*')];

        candidates.forEach((el) => {
            if (!this.root.contains(el) || !range.intersectsNode(el)) return;
            el.removeAttribute('style');
            if (['SPAN', 'FONT'].includes(el.tagName) && el.attributes.length === 0) {
                const parent = el.parentNode;
                if (!parent) return;
                while (el.firstChild) parent.insertBefore(el.firstChild, el);
                parent.removeChild(el);
            }
        });
    }

    /** Inserts raw (already sanitized) HTML at the current caret position. */
    insertHTML(html) {
        this.prepare();
        this.editor.history.push();

        const range = this.selection.getRange();
        if (!range) return;

        range.deleteContents();
        const fragment = range.createContextualFragment(html);
        const lastNode = fragment.lastChild;
        range.insertNode(fragment);

        if (lastNode) {
            const newRange = document.createRange();
            newRange.setStartAfter(lastNode);
            newRange.collapse(true);
            this.selection.setRange(newRange);
        }

        this.editor.emitChange();
    }

    /**
     * Changes the block-level element type of the current block(s).
     * Converts every block touched by the selection (a single block, several
     * paragraphs, or a full Select-All range whose common ancestor is the root)
     * to the given tag name, e.g. 'h1' or 'p'.
     * @param {string} tag the target block tag name (lowercase, e.g. 'p', 'h1'-'h6')
     */
    formatBlock(tag) {
        const range = this.selection.getRange();
        if (!range) return;

        const targetTag = tag.toLowerCase();
        const blocks = this.getBlocksInRange(range);

        // No enclosing block means the content is inline directly under the
        // root (plain text and/or inline elements, possibly separated by <br>).
        // Without a block to convert, the previous implementation returned
        // early and applying a heading (or any block format) silently did
        // nothing. Wrap the caret's line — or the selected run — into the
        // requested block instead.
        if (!blocks.length) {
            const wrapped = this.wrapInlineIntoBlock(range, targetTag);
            if (!wrapped) return;
            this.editor.history.push();
            const newRange = document.createRange();
            newRange.selectNodeContents(wrapped);
            newRange.collapse(false);
            this.selection.setRange(newRange);
            return;
        }

        // Convert every block touched by the selection that differs from the
        // target tag (a single block, several paragraphs, or a full Select-All
        // range whose common ancestor is the root).
        const blocksToConvert = blocks.filter(
            (block) => block.tagName.toLowerCase() !== targetTag
        );
        if (!blocksToConvert.length) return;

        this.editor.history.push();

        let lastReplacement = null;
        blocksToConvert.forEach((block) => {
            const replacement = document.createElement(targetTag);
            replacement.innerHTML = block.innerHTML || '<br>';
            block.replaceWith(replacement);
            lastReplacement = replacement;
        });

        if (lastReplacement) {
            const newRange = document.createRange();
            newRange.selectNodeContents(lastReplacement);
            newRange.collapse(false);
            this.selection.setRange(newRange);
        }
    }

    /**
     * Wraps a caret line or text selection into a block element when the
     * content has no enclosing block (plain text / inline elements living
     * directly under the root). If the caret is collapsed, the whole line
     * bounded by <br>/block edges is wrapped; otherwise only the selected run.
     * @param {Range} range
     * @param {string} targetTag lowercase block tag name (e.g. 'h1')
     * @returns {HTMLElement|null} the created block, or null when nothing to wrap
     */
    wrapInlineIntoBlock(range, targetTag) {
        const block = document.createElement(targetTag);
        let wrapRange;

        if (range.collapsed) {
            if (range.startContainer === this.root) {
                // Caret sits directly in the (empty) root.
                block.innerHTML = '<br>';
                const ref = this.root.childNodes[range.startOffset] || null;
                this.root.insertBefore(block, ref);
                return block;
            }
            wrapRange = this.getInlineLineRange(range);
            if (!wrapRange) return null;
        } else {
            wrapRange = range;
        }

        const fragment = wrapRange.extractContents();
        block.appendChild(fragment);
        wrapRange.insertNode(block);
        return block;
    }

    /**
     * Builds a range covering the whole "line" that contains a collapsed caret
     * when there is no enclosing block: the maximal run of root-level inline
     * nodes (text + inline elements) bounded by <br>, block edges or the root.
     * @param {Range} range a collapsed range
     * @returns {Range|null}
     */
    getInlineLineRange(range) {
        let node = range.startContainer;
        // For a caret inside a text node, keep the text node itself as the
        // anchor when it is a direct child of the root; otherwise ascend to its
        // inline wrapper so the whole run is captured.
        if (node.nodeType === Node.TEXT_NODE && node.parentNode && node.parentNode !== this.root) {
            node = node.parentElement ?? node;
        }
        if (!(node instanceof HTMLElement || node.nodeType === Node.TEXT_NODE)) return null;
        if (node === this.root) return null;
        // Ascend nodes to the direct child of the root (keep inline wrappers as
        // the line anchor so the whole run is captured, not just one inner node).
        if (node.nodeType === Node.ELEMENT_NODE) {
            while (node.parentNode && node.parentNode !== this.root) {
                node = node.parentNode;
            }
            if (node.nodeType !== Node.ELEMENT_NODE || node === this.root) return null;
        }

        const isBoundary = (n) =>
            n === this.root
            || (n.nodeType === Node.ELEMENT_NODE && (n.tagName === 'BR' || BLOCK_TAGS.has(n.tagName)));

        let start = node;
        let p = start.previousSibling;
        while (p && !isBoundary(p)) {
            start = p;
            p = p.previousSibling;
        }

        let end = node;
        let q = end.nextSibling;
        while (q && !isBoundary(q)) {
            end = q;
            q = q.nextSibling;
        }

        const lineRange = document.createRange();
        lineRange.setStart(start, 0);

        if (end.nodeType === Node.TEXT_NODE) {
            lineRange.setEnd(end, end.length);
        } else {
            const last = end.lastChild;
            if (last) lineRange.setEndAfter(last);
            else lineRange.setEnd(end, 0);
        }
        return lineRange;
    }
}
