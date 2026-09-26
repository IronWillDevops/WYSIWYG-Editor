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

            case 'codeBlock':
                this.toggleCodeBlock();
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

        // Record the post-command state. History.push() de-duplicates against
        // the last snapshot, so a push taken *before* the mutation above would
        // always be a no-op and the command would never land on the undo stack.
        this.editor.history.push();
        this.editor.emitChange();
        this.editor.events.emit('selectionchange', this.editor);
    }

    queryState(name) {
        if (name === 'codeBlock') {
            const range = this.selection.getRange();
            if (!range) return false;
            return this.closestPre(range.startContainer) !== null;
        }
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

        // Collapsed caret inside a single block: turn only the caret's line
        // into a list item (same line-aware behaviour as formatBlock).
        if (range.collapsed) {
            const block = this.blockAt(range.startContainer);
            if (block) {
                const target = this._convertCaretLine(block, range, (fragment) => {
                    const list = document.createElement(listTag);
                    const li = document.createElement('li');
                    if (fragment.firstChild) {
                        li.appendChild(fragment);
                    } else {
                        li.innerHTML = '<br>';
                    }
                    list.appendChild(li);
                    return list;
                });
                if (target) return;
                // The caret line spans the whole block → fall through to the
                // whole-block conversion below.
            }
        }

        const blocks = this.getBlocksInRange(range);
        if (!blocks.length) {
            // No enclosing block (plain text/inline elements under the root):
            // wrap the line or selection into a fresh single-item list.
            const wrapped = this._wrapRangeIntoList(range, listTag);
            if (wrapped) this._placeCaretAtEnd(wrapped);
            return;
        }

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

        const startBlock = this.blockAt(range.startContainer);
        if (!startBlock) return [];

        const endBlock = this.blockAt(range.endContainer) ?? startBlock;
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

    /**
     * Nearest block-level ancestor of a node at any depth (the block does not
     * have to be a direct child of the root — nested <p> inside a <div>,
     * inline wrappers, etc. all resolve to their real block).
     * @param {Node} node
     * @returns {HTMLElement|null}
     */
    blockAt(node) {
        let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        if (el === this.root) return null;
        while (el && el !== this.root) {
            if (el instanceof HTMLElement && BLOCK_TAGS.has(el.tagName)) {
                return el;
            }
            el = el.parentElement;
        }
        return null;
    }

    /**
     * Nearest <pre> ancestor of a node, bounded by the editor root.
     * @param {Node} node
     * @returns {HTMLElement|null}
     */
    closestPre(node) {
        let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        while (el && el !== this.root) {
            if (el instanceof HTMLElement && el.tagName === 'PRE') return el;
            el = el.parentElement;
        }
        return null;
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
     * The elements a formatting sweep may touch for the current selection:
     * the selection's own container (only when it carries inline styles) plus
     * its descendants.
     *
     * The editing surface itself is never a target. A select-all makes it the
     * container the sweep starts from, and "clear formatting" then stripped its
     * whole style attribute — which is the element the content itself is
     * styled through, so host code that reads or relies on those styles (and
     * any future layout bound written there) lost them in one keystroke. The
     * editor's own height lives on the wrapper (see `Editor.applyHeight`), so
     * the layout is safe either way; this keeps the surface's own attributes
     * out of a command that is meant to clear the *content's* formatting.
     *
     * @param {HTMLElement} container the selection's common-ancestor element
     * @returns {HTMLElement[]}
     */
    formattingCandidates(container) {
        const self = container !== this.root && container.style?.length ? [container] : [];
        return [...self, ...container.querySelectorAll('*')];
    }

    /**
     * Removes a specific CSS property from every element touched by
     * the current selection. Used by the color button "clear" action.
     * @param {string} cssProp camelCase property name (e.g. 'color', 'backgroundColor')
     */
    clearColor(cssProp) {
        const range = this.selection.getRange();
        if (!range) return;

        // Snapshot the selection as character offsets before mutating the DOM.
        // Removing/unwrapping the colour spans below moves the boundary text
        // nodes, which makes real browsers collapse the live selection; re-selecting
        // by offset (same as applyColor) keeps the same text selected so a later
        // live pick still targets it.
        const start = this.selection.offsetOf(range.startContainer, range.startOffset);
        const end = this.selection.offsetOf(range.endContainer, range.endOffset);

        let container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
        if (!(container instanceof HTMLElement)) return;

        const candidates = this.formattingCandidates(container);

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

        this.selection.setRangeByOffsets(start, end);
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
        let preservedCss = null;
        if (parent && parent.tagName === 'SPAN' && parent.style[cssProp]) {
            // The text node sits inside a span of a *different* colour for this
            // cssProp. Re-colouring must replace that colour rather than wrap a
            // nested span, and must not re-colour any non-selected neighbours
            // sharing the span. Split the text node out (its neighbours keep
            // their own colour) and wrap it fresh below. Capture the span's other
            // inline styles first so the freshly-wrapped node does not lose them
            // (e.g. a background colour must survive re-colouring the text).
            preservedCss = parent.style.cssText;
            this.splitSpanAroundNode(parent, textNode);
        } else if (
            parent
            && parent.tagName === 'SPAN'
            && !parent.style[cssProp]
            && parent.childNodes.length === 1
            && parent.firstChild === textNode
        ) {
            // The text node is the sole content of an existing span that carries
            // a different inline property (e.g. a background colour when applying
            // a foreground colour, or a foreground when applying a background).
            // Fold the colour into that span instead of nesting a second one, so
            // re-colouring stays flat — matching the same-cssProp re-colour path.
            parent.style[cssProp] = value;
            this.mergeColorSpan(parent, cssProp, value);
            return;
        }
        const span = document.createElement('span');
        if (preservedCss) span.style.cssText = preservedCss;
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

        const candidates = this.formattingCandidates(container);

        candidates.forEach((el) => {
            if (!this.root.contains(el) || !range.intersectsNode(el)) return;
            // Belt and braces: the editing surface is the container a select-all
            // starts from, and it is never the content's formatting to clear.
            if (el === this.root) return;
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

        // Push after the mutation: a push taken before insertNode would snapshot
        // unchanged content and be de-duplicated away by History.push().
        this.editor.history.push();
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

        // Collapsed caret inside a single (multi-line) block: format only the
        // line holding the caret, splitting the block around it.
        if (range.collapsed && blocks.length === 1) {
            const target = this._convertCaretLine(blocks[0], range, (fragment) => {
                const el = document.createElement(targetTag);
                if (fragment.firstChild) {
                    el.appendChild(fragment);
                } else {
                    el.innerHTML = '<br>';
                }
                return el;
            });
            if (target) return;
            // The caret line spans the whole block → convert it below.
        }

        // No enclosing block means the content is inline directly under the
        // root (plain text and/or inline elements, possibly separated by <br>).
        // Without a block to convert, the previous implementation returned
        // early and applying a heading (or any block format) silently did
        // nothing. Wrap the caret's line — or the selected run — into the
        // requested block instead.
        if (!blocks.length) {
            const wrapped = this.wrapInlineIntoBlock(range, targetTag);
            if (!wrapped) return;
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

    // --------------------------------------------------------------------
    // Code block + line-aware block conversion helpers
    // --------------------------------------------------------------------

    /**
     * Toggles the current selection or caret line in/out of a <pre> code
     * block. Entering wraps the caret's line (or the selected run) in a
     * <pre>; leaving unwraps the caret's line back into a <p>.
     */
    toggleCodeBlock() {
        const range = this.selection.getRange();
        if (!range) return;

        if (range.collapsed) {
            // Collapsed caret: operate on the block holding the caret.
            const block = this.blockAt(range.startContainer);
            if (block) {
                const targetTag = block.tagName === 'PRE' ? 'p' : 'pre';
                const target = this._convertCaretLine(block, range, (fragment) => {
                    const el = document.createElement(targetTag);
                    if (fragment.firstChild) {
                        el.appendChild(fragment);
                    } else {
                        el.innerHTML = '<br>';
                    }
                    return el;
                });
                if (target) return;
                // The caret line spans the whole block → convert the block.
                this._convertBlocksToTag([block], targetTag);
                return;
            }
            if (range.startContainer === this.root) {
                // Caret sitting directly inside the (empty) root → insert an
                // empty pre at the caret position.
                const pre = document.createElement('pre');
                pre.innerHTML = '<br>';
                const ref = this.root.childNodes[range.startOffset] || null;
                this.root.insertBefore(pre, ref);
                const newRange = document.createRange();
                newRange.setStart(pre, 0);
                newRange.collapse(true);
                this.selection.setRange(newRange);
                return;
            }
            // Root-level inline content → wrap the caret's line into a pre.
            const wrapped = this.wrapInlineIntoBlock(range, 'pre');
            if (wrapped) this._placeCaretAtEnd(wrapped);
            return;
        }

        // Non-collapsed selection.
        const blocks = this.getBlocksInRange(range);
        if (blocks.length === 1) {
            const block = blocks[0];
            if (block.tagName === 'PRE') {
                // Selection inside a code block: the button reads as "active",
                // so the click means "remove the code block".
                this._convertBlocksToTag([block], 'p');
                return;
            }
            const pre = this._splitBlockAtSelection(block, range, 'pre');
            if (pre) this._placeCaretAtEnd(pre);
            return;
        }
        if (blocks.length > 1) {
            const allPres = blocks.every((b) => b.tagName === 'PRE');
            blocks.forEach((b) => {
                if (b.tagName === 'PRE') {
                    if (allPres) this._convertBlocksToTag([b], 'p');
                } else {
                    this._convertBlocksToTag([b], 'pre');
                }
            });
            return;
        }
        // No enclosing block → wrap the selected run into a pre.
        const wrapped = this.wrapInlineIntoBlock(range, 'pre');
        if (wrapped) this._placeCaretAtEnd(wrapped);
    }

    /**
     * Converts every given block element to the target tag, preserving the
     * block's class attribute. Blocks already using the tag are left alone.
     * @param {HTMLElement[]} blocks
     * @param {string} tag lowercase target tag name
     * @returns {HTMLElement|null} the last replacement element (or null)
     */
    _convertBlocksToTag(blocks, tag) {
        let last = null;
        blocks.forEach((block) => {
            if (block.tagName.toLowerCase() === tag) return;
            const replacement = document.createElement(tag);
            const cls = block.getAttribute('class');
            if (cls) replacement.setAttribute('class', cls);
            replacement.innerHTML = block.innerHTML || '<br>';
            block.replaceWith(replacement);
            last = replacement;
        });
        return last;
    }

    /**
     * Converts the caret's line inside `block` into a new element built by
     * `buildTarget`, splitting `block` into [prefix | target | suffix] and
     * re-placing the caret at the same character offset inside the target.
     * Returns null when the caret line spans the whole block — callers then
     * convert the whole block instead.
     * @param {HTMLElement} block
     * @param {Range} range collapsed caret range
     * @param {(fragment: DocumentFragment) => HTMLElement} buildTarget
     * @returns {HTMLElement|null}
     */
    _convertCaretLine(block, range, buildTarget) {
        const window = this._getLineWindow(block, range.startContainer, range.startOffset);
        const { children, startIndex, endIndex } = window;
        if (startIndex === 0 && endIndex === children.length - 1) return null;

        // Character offset of the caret within the line's text stream, so the
        // caret can be re-placed at the same position inside the fresh target.
        const rel = this._caretOffsetInLine(block, window, range.startContainer, range.startOffset);

        const target = this._splitLineInto(block, window, buildTarget);
        if (target) this._placeCaretAtTextOffset(target, rel);
        return target;
    }

    /**
     * Returns the child-index window describing the "line" of a caret point
     * inside a block: the maximal run of direct children between the nearest
     * <br>/block separators. Empty lines (endIndex < startIndex) are possible.
     * @param {HTMLElement} block
     * @param {Node} node caret container
     * @param {number} offset caret offset
     * @returns {{children: Node[], startIndex: number, endIndex: number}}
     */
    _getLineWindow(block, node, offset) {
        const children = [...block.childNodes];
        let idx;
        if (node === block) {
            idx = offset;
        } else {
            let cur = node;
            while (cur && cur.parentNode !== block) cur = cur.parentNode;
            if (cur && cur === node && cur.nodeType === Node.ELEMENT_NODE && cur.tagName === 'BR') {
                // Caret anchored directly on a <br> (test/edge position): it
                // sits at the break, i.e. on the line *after* it.
                idx = children.indexOf(cur) + 1;
            } else {
                idx = cur ? children.indexOf(cur) : -1;
                if (idx === -1) idx = children.length;
            }
        }
        let lo = -1;
        for (let i = idx - 1; i >= 0; i--) {
            if (this._isLineSeparator(children[i])) {
                lo = i;
                break;
            }
        }
        let hi = children.length;
        for (let i = idx; i < children.length; i++) {
            if (this._isLineSeparator(children[i])) {
                hi = i;
                break;
            }
        }
        return { children, startIndex: lo + 1, endIndex: hi - 1 };
    }

    /** Whether a node terminates a line inside a block (<br> or a block tag). */
    _isLineSeparator(node) {
        return node.nodeType === Node.ELEMENT_NODE
            && (node.tagName === 'BR' || BLOCK_TAGS.has(node.tagName));
    }

    /**
     * Character offset of (node, offset) from the start of the caret line, so
     * a later split can re-place the caret at the identical text position.
     * @param {HTMLElement} block
     * @param {{children: Node[], startIndex: number, endIndex: number}} window
     * @param {Node} node caret container
     * @param {number} offset caret offset
     * @returns {number}
     */
    _caretOffsetInLine(block, window, node, offset) {
        const { children, startIndex, endIndex } = window;
        let total = 0;
        for (let i = startIndex; i <= endIndex; i++) {
            total += (children[i]?.textContent ?? '').length;
        }
        let before = 0;
        if (node === block) {
            for (let i = startIndex; i < Math.min(offset, endIndex + 1); i++) {
                before += (children[i]?.textContent ?? '').length;
            }
        } else {
            let cur = node;
            while (cur && cur.parentNode !== block) cur = cur.parentNode;
            const idx = cur ? children.indexOf(cur) : -1;
            if (idx !== -1 && idx >= startIndex && idx <= endIndex) {
                for (let i = startIndex; i < idx; i++) {
                    before += (children[i]?.textContent ?? '').length;
                }
                before += this._textOffsetAt(cur, node, offset);
            } else if (idx !== -1) {
                before = total; // caret past the line's end edge
            }
        }
        return Math.min(Math.max(before, 0), total);
    }

    /**
     * Number of text characters between the start of `scope` and the point
     * (target, offset) inside it, walking text nodes in document order.
     * Unlike Selection.offsetOf this handles element boundary points and
     * <br> children without throwing or mis-counting.
     * @param {Node} scope
     * @param {Node} target
     * @param {number} offset
     * @returns {number}
     */
    _textOffsetAt(scope, target, offset) {
        let total = 0;
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        let text;
        while ((text = walker.nextNode())) {
            if (text === target) return total + offset;
            if (target.nodeType === Node.TEXT_NODE) {
                // PRECEDING on text.cdp(target) means `target` comes first —
                // i.e. this text node sits after the caret point: stop.
                if (text.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_PRECEDING) break;
                total += text.length;
            } else if (target.contains(text)) {
                // Element boundary point (target, offset): text in the
                // target's own children before `offset` still precedes it.
                let child = text;
                let parent = text.parentNode;
                while (parent && parent !== target) {
                    child = parent;
                    parent = parent.parentNode;
                }
                if (parent === target) {
                    const idx = Array.prototype.indexOf.call(target.childNodes, child);
                    if (idx < offset) total += text.length;
                    else break;
                }
            } else {
                if (text.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_PRECEDING) break;
                total += text.length;
            }
        }
        return total;
    }

    /**
     * Splits a block around a non-collapsed selection into
     * [prefix | target | suffix], converting the selected run into a fresh
     * element of `targetTag`. Sides keep the original block's tag and class.
     * @param {HTMLElement} block
     * @param {Range} range non-collapsed range inside block
     * @param {string} targetTag e.g. 'pre'
     * @returns {HTMLElement} the new target element
     */
    _splitBlockAtSelection(block, range, targetTag) {
        const tag = block.tagName.toLowerCase();
        const className = block.getAttribute('class');
        const makeSide = () => {
            const el = document.createElement(tag);
            if (className) el.setAttribute('class', className);
            return el;
        };

        // Snapshot the start point before extractContents mutates the range.
        // The end point is re-read from the live range afterwards, since DOM
        // ranges auto-adjust their anchors on the prefix removal.
        const startNode = range.startContainer;
        const startOffset = range.startOffset;

        const left = makeSide();
        const prefixRange = document.createRange();
        prefixRange.setStart(block, 0);
        prefixRange.setEnd(startNode, startOffset);
        left.appendChild(prefixRange.extractContents());

        const target = document.createElement(targetTag);
        const midRange = document.createRange();
        midRange.setStart(prefixRange.startContainer, prefixRange.startOffset);
        midRange.setEnd(range.endContainer, range.endOffset);
        target.appendChild(midRange.extractContents());

        // Whatever is still inside the block after the selection is the suffix.
        const right = makeSide();
        while (block.firstChild) right.appendChild(block.firstChild);

        if (!target.firstChild) target.innerHTML = '<br>';

        this._dropSeamBr(left, 'end');
        this._dropSeamBr(right, 'start');

        const parent = block.parentNode;
        if (right.firstChild) parent.insertBefore(right, block);
        parent.insertBefore(target, block);
        if (left.firstChild) parent.insertBefore(left, block);
        block.remove();
        return target;
    }

    /**
     * Splits the block around a (line) window into [left | target | right],
     * where `target` is built by `buildTarget` from the extracted line content.
     * Boundary <br>s at the seams are dropped when the side keeps content, so
     * a lone <br> (a real empty line) survives.
     * @param {HTMLElement} block
     * @param {{children: Node[], startIndex: number, endIndex: number}} window
     * @param {(fragment: DocumentFragment) => HTMLElement} buildTarget
     * @returns {HTMLElement|null}
     */
    _splitLineInto(block, window, buildTarget) {
        const { startIndex, endIndex } = window;
        const tag = block.tagName.toLowerCase();
        const className = block.getAttribute('class');
        const makeSide = () => {
            const el = document.createElement(tag);
            if (className) el.setAttribute('class', className);
            return el;
        };

        // Extract the caret line FIRST, while every child of `block` is still
        // attached. BuildTarget callers read element offsets (startIndex/
        // endIndex) into `block`; if we pulled the left side out before
        // creating that range, the indexes would be stale and `extractContents`
        // would throw IndexSizeError (offset out of bound).
        const range = document.createRange();
        range.setStart(block, startIndex);
        range.setEnd(block, endIndex + 1);
        const fragment = range.extractContents();

        const left = makeSide();
        for (let i = 0; i < startIndex; i++) left.appendChild(block.firstChild);

        const right = makeSide();
        while (block.firstChild) right.appendChild(block.firstChild);

        const target = buildTarget(fragment);
        if (!target) return null;

        const parent = block.parentNode;
        this._dropSeamBr(left, 'end');
        this._dropSeamBr(right, 'start');

        if (left.firstChild) parent.insertBefore(left, block);
        parent.insertBefore(target, block);
        if (right.firstChild) parent.insertBefore(right, block);
        block.remove();
        return target;
    }

    /**
     * Drops the seam <br> of a split side (last child for end, first child for
     * start) — the break consumed by the block boundary — unless the side only
     * holds <br>s, in which case it represents a real empty line.
     * @param {HTMLElement} side
     * @param {'start'|'end'} which
     */
    _dropSeamBr(side, which) {
        const node = which === 'end' ? side.lastChild : side.firstChild;
        if (!node || node.nodeType !== Node.ELEMENT_NODE || node.tagName !== 'BR') return;
        const hasOther = [...side.childNodes].some(
            (n) => n !== node && !(n.nodeType === Node.ELEMENT_NODE && n.tagName === 'BR')
        );
        if (hasOther) node.remove();
    }

    /**
     * Wraps the current line (collapsed) or selection (non-collapsed) of
     * root-level inline content into a fresh single-item list.
     * @param {Range} range
     * @param {'ul'|'ol'} listTag
     * @returns {HTMLElement|null}
     */
    _wrapRangeIntoList(range, listTag) {
        const list = document.createElement(listTag);
        const li = document.createElement('li');

        let wrapRange = range;
        if (range.collapsed) {
            if (range.startContainer === this.root) {
                li.innerHTML = '<br>';
            } else {
                const lineRange = this.getInlineLineRange(range);
                if (!lineRange) return null;
                wrapRange = lineRange;
            }
        }

        const fragment = wrapRange.extractContents();
        if (fragment.firstChild) {
            li.appendChild(fragment);
        } else if (!li.firstChild) {
            li.innerHTML = '<br>';
        }
        list.appendChild(li);

        if (range.collapsed && range.startContainer === this.root) {
            const ref = this.root.childNodes[range.startOffset] || null;
            this.root.insertBefore(list, ref);
        } else {
            wrapRange.insertNode(list);
        }
        return list;
    }

    /** Collapses the selection at the end of an element. @param {HTMLElement} el */
    _placeCaretAtEnd(el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        this.selection.setRange(range);
    }

    /**
     * Collapses the selection to the given character offset within an element,
     * walking the element's text nodes in document order.
     * @param {HTMLElement} el
     * @param {number} offset
     */
    _placeCaretAtTextOffset(el, offset) {
        let remaining = Math.max(offset, 0);
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let text;
        while ((text = walker.nextNode())) {
            if (remaining <= text.length) {
                const range = document.createRange();
                range.setStart(text, remaining);
                range.collapse(true);
                this.selection.setRange(range);
                return;
            }
            remaining -= text.length;
        }
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        this.selection.setRange(range);
    }
}
