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
                    this.applyColor('color', value);
                } else {
                    this.clearColor('color');
                }
                break;

            case 'backColor':
                // Likewise, the default background (white) clears the
                // highlights so no hard-coded white box is persisted.
                if (value && !isDefaultBgColor(value)) {
                    this.applyColor('backgroundColor', value);
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
     * Applies an inline color (text `color` or `backgroundColor`) to the
     * current selection by wrapping just the selected text nodes in
     * `<span style="...">`, splitting text at the selection edges.
     *
     * Replaces `document.execCommand('foreColor'/'hiliteColor')`, which is
     * unreliable for whole‑block / large selections (it can silently no‑op)
     * and collapses the live selection after applying — both of which made
     * live recolouring while dragging a selection handle impossible.
     *
     * This implementation is:
     *  - robust for any selection (partial word, whole paragraph, multi-line);
     *  - idempotent — re‑applying the same color keeps it instead of toggling
     *    it off (execCommand toggles when the surrounding text is already the
     *    same color) and merges adjacent equal‑color spans instead of nesting;
     *  - non‑collapsing — it never touches the native selection, so it can be
     *    called repeatedly on `selectionchange` while the user drags a handle.
     * @param {'color'|'backgroundColor'} cssProp
     * @param {string} value CSS color value
     */
    applyColor(cssProp, value) {
        const range = this.selection.getRange();
        if (!range || range.collapsed) return;

        // Snapshot the selection as character offsets in the root's text stream
        // before mutating the DOM. The wrapping below splits and moves the
        // boundary text nodes, which makes real browsers collapse the live
        // selection; re-selecting by offset keeps the same text selected so a
        // subsequent color change (from the live picker) still targets it.
        const start = this.selection.offsetOf(range.startContainer, range.startOffset);
        const end = this.selection.offsetOf(range.endContainer, range.endOffset);

        const startNode = range.startContainer;
        const startOffset = range.startOffset;
        const endNode = range.endContainer;
        const endOffset = range.endOffset;

        this.colorTextNodes(cssProp, value, startNode, startOffset, endNode, endOffset);
        this.selection.setRangeByOffsets(start, end);
    }

    /**
     * Styles every text node intersecting the given range, splitting the
     * boundary text nodes so only the in‑range portion is wrapped.
     * @param {'color'|'backgroundColor'} cssProp
     * @param {string} value
     * @param {Node} startNode
     * @param {number} startOffset
     * @param {Node} endNode
     * @param {number} endOffset
     */
    colorTextNodes(cssProp, value, startNode, startOffset, endNode, endOffset) {
        const walker = document.createTreeWalker(this.editor.root, NodeFilter.SHOW_TEXT);
        let textNode;
        while ((textNode = walker.nextNode())) {
            if (this.rangeIntersectsText(textNode, startNode, startOffset, endNode, endOffset)) {
                const length = textNode.textContent.length;
                let from = 0;
                let to = length;
                if (textNode === startNode) from = startOffset;
                if (textNode === endNode) to = endOffset;
                this.wrapTextSegment(textNode, from, to, cssProp, value);
            }
        }
    }

    /**
     * Whether a text node's content range intersects the selection range,
     * computed with `compareDocumentPosition` so it stays valid after splits.
     * @param {Node} textNode
     * @param {Node} startNode
     * @param {number} startOffset
     * @param {Node} endNode
     * @param {number} endOffset
     * @returns {boolean}
     */
    rangeIntersectsText(textNode, startNode, startOffset, endNode, endOffset) {
        const length = textNode.textContent.length;
        return (
            this.pointOrderedAtOrBefore(textNode, 0, endNode, endOffset)
            && this.pointOrderedAtOrBefore(startNode, startOffset, textNode, length)
        );
    }

    /**
     * Compares two `(node, offset)` points using document order without
     * mutating any range, so offsets stay valid even after text splits.
     * @param {Node} aNode
     * @param {number} aOffset
     * @param {Node} bNode
     * @param {number} bOffset
     * @returns {boolean} true when (aNode,aOffset) is before-or-equal (bNode,bOffset)
     */
    pointOrderedAtOrBefore(aNode, aOffset, bNode, bOffset) {
        if (aNode === bNode) return aOffset <= bOffset;
        const relation = aNode.compareDocumentPosition(bNode);
        if (relation & Node.DOCUMENT_POSITION_FOLLOWING) return true;
        if (relation & Node.DOCUMENT_POSITION_PRECEDING) return false;
        return aOffset <= bOffset;
    }

    /**
     * Wraps a contiguous segment of a text node — from `from` to `to` — in a
     * `<span>` carrying the requested color, splitting the text node if the
     * segment touches its edge and merging equal‑color neighbours.
     * @param {Text} textNode
     * @param {number} from
     * @param {number} to
     * @param {'color'|'backgroundColor'} cssProp
     * @param {string} value
     */
    wrapTextSegment(textNode, from, to, cssProp, value) {
        if (from >= to) return;
        let node = textNode;
        let start = from;
        let end = to;
        if (start > 0) {
            node = textNode.splitText(start);
            end -= start;
        }
        if (end < node.textContent.length) {
            node.splitText(end);
        }
        this.colorTextNode(node, cssProp, value);
    }

    /**
     * Ensures a text node is wrapped in a span with the given color, reusing
     * an existing equal‑color span and merging equal‑color neighbours so the
     * markup stays flat (idempotent).
     * @param {Text} textNode
     * @param {'color'|'backgroundColor'} cssProp
     * @param {string} value
     */
    colorTextNode(textNode, cssProp, value) {
        if (!textNode.textContent) return;
        const parent = textNode.parentElement;
        if (parent && parent.tagName === 'SPAN' && this.sameColor(cssProp, parent.style[cssProp], value)) {
            this.mergeColorSpan(parent, cssProp, value);
            return;
        }
        if (parent && parent.tagName === 'SPAN' && parent.style[cssProp]) {
            // The text node sits inside a span of a *different* colour for this
            // cssProp. Re-colouring must replace that colour rather than wrap a
            // nested span, and must not re-colour any non-selected neighbours
            // sharing the span. Split the text node out (its neighbours keep
            // their own colour) and wrap it fresh below.
            this.splitSpanAroundNode(parent, textNode);
        }
        const span = document.createElement('span');
        span.style[cssProp] = value;
        textNode.parentNode.insertBefore(span, textNode);
        span.appendChild(textNode);
        this.mergeColorSpan(span, cssProp, value);
    }

    /**
     * Pulls a single child out of a span, preserving the span's colour (and any
     * other inline styles) on the content that remains before and after, so the
     * extracted node becomes a plain sibling between them.
     * @param {HTMLSpanElement} span
     * @param {Text} node direct child of `span`
     */
    splitSpanAroundNode(span, node) {
        const css = span.style.cssText;
        const parent = span.parentNode;

        const fragmentBefore = document.createDocumentFragment();
        while (span.firstChild && span.firstChild !== node) {
            fragmentBefore.appendChild(span.firstChild);
        }
        span.removeChild(node);

        const fragmentAfter = document.createDocumentFragment();
        while (span.firstChild) {
            fragmentAfter.appendChild(span.firstChild);
        }

        const wrap = (fragment) => {
            if (!fragment.firstChild) return null;
            const el = document.createElement('span');
            el.style.cssText = css;
            el.appendChild(fragment);
            return el;
        };

        const elBefore = wrap(fragmentBefore);
        const elAfter = wrap(fragmentAfter);

        if (elBefore) parent.insertBefore(elBefore, span);
        parent.insertBefore(node, span);
        if (elAfter) parent.insertBefore(elAfter, span);
        parent.removeChild(span);
    }

    /**
     * Merges a freshly coloured span with any equal-coloured element siblings so
     * the markup stays flat (idempotent re-colouring).
     * @param {HTMLSpanElement} span
     * @param {'color'|'backgroundColor'} cssProp
     * @param {string} value
     */
    mergeColorSpan(span, cssProp, value) {
        const prev = span.previousElementSibling;
        let target = span;
        if (prev && prev.tagName === 'SPAN' && this.sameColor(cssProp, prev.style[cssProp], value)) {
            prev.appendChild(span.childNodes);
            span.remove();
            target = prev;
        }
        const next = target.nextElementSibling;
        if (next && next.tagName === 'SPAN' && this.sameColor(cssProp, next.style[cssProp], value)) {
            target.appendChild(next.childNodes);
            next.remove();
        }
    }

    /**
     * Compares two CSS color strings after normalising shorthand/white-space
     * so `#ff0000` matches `rgb(255, 0, 0)` for span merging.
     * @param {'color'|'backgroundColor'} cssProp
     * @param {string} a
     * @param {string} b
     * @returns {boolean}
     */
    sameColor(cssProp, a, b) {
        if (!a || !b) return false;
        const el = document.createElement('span');
        el.style[cssProp] = a;
        const na = el.style[cssProp];
        el.style[cssProp] = b;
        const nb = el.style[cssProp];
        return na === nb;
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
