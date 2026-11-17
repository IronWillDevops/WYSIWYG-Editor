/**
 * Central command executor. Wraps the small, still well-supported subset of
 * document.execCommand for inline formatting (bold/italic/underline/lists),
 * and implements block-level / structural commands manually for full control
 * over the resulting markup (no legacy <font>/<b> soup).
 */
import { isDefaultTextColor, isDefaultBgColor } from '../utils/colors.js';

/** Block-level elements handled by structural commands (headings, lists, notes, ...). */
const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'LI', 'DIV', 'UL', 'OL', 'TABLE', 'FIGURE']);

/** List container tags. */
const LIST_TAGS = new Set(['UL', 'OL']);

/** @param {Node} node */
const isListElement = (node) =>
    node.nodeType === Node.ELEMENT_NODE && LIST_TAGS.has(/** @type {HTMLElement} */ (node).tagName);

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
            case 'justifyLeft':
            case 'justifyCenter':
            case 'justifyRight':
            case 'justifyFull':
                document.execCommand(name, false, value ?? undefined);
                break;

            case 'indent':
            case 'outdent':
                // Inside a list item indent/outdent change the nesting level:
                // do that directly on the DOM, where the result is predictable
                // on every browser (execCommand('indent') is not).
                {
                    const li = this.selection.closest('li');
                    if (li) {
                        if (name === 'indent') this.indentListItem(li);
                        else this.outdentListItem(li);
                    } else {
                        document.execCommand(name, false, value ?? undefined);
                    }
                }
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

        const blocks = this.getBlocksInRange(range);
        if (!blocks.length) return;

        // The range already covers list content (a caret inside an <li>, a
        // selection spanning several <li>s, or whole <ul>/<ol> blocks such as
        // Select All). Toggle those existing lists instead of nesting new
        // ones inside them — otherwise the DOM ended up with invalid
        // <ul><ol>…</ol></ul> or <li><li>…</li></li> structures.
        const lists = new Set();
        blocks.forEach((block) => {
            if (isListElement(block)) {
                lists.add(block);
            } else if (block.tagName === 'LI' && isListElement(block.parentElement)) {
                lists.add(block.parentElement);
            }
        });

        if (lists.size) {
            // Toggle as a unit: only when every touched list already has the
            // requested type does the command switch them all off (unwrap);
            // otherwise they are all converted to the requested type.
            const allMatch = [...lists].every(
                (list) => list.tagName.toLowerCase() === listTag
            );
            lists.forEach((list) => {
                if (allMatch) this.unwrapList(list);
                else this.convertList(list, listTag);
            });
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

    /**
     * Removes a list, turning every <li> back into a plain paragraph. Nested
     * lists are unwrapped first and their paragraphs lifted out of the parent
     * item, so no markup such as <p><ul>…</ul></p> is ever produced and the
     * whole tree flattens into ordinary blocks.
     * @param {HTMLElement} list
     */
    unwrapList(list) {
        const items = [...list.children].filter((el) => el.tagName === 'LI');

        // Recurse into nested lists first: they become paragraphs inside their
        // parent <li>, which are then lifted out as sibling blocks below.
        items.forEach((li) => {
            [...li.children].filter(isListElement).forEach((nested) => this.unwrapList(nested));
        });

        const fragment = document.createDocumentFragment();
        let lastBlock = null;

        items.forEach((li) => {
            // Capture emptiness before the child nodes are moved out below.
            const wasEmpty = !li.firstChild;
            let paragraph = null;
            [...li.childNodes].forEach((child) => {
                const isBlock = child.nodeType === Node.ELEMENT_NODE
                    && BLOCK_TAGS.has(/** @type {HTMLElement} */ (child).tagName);
                if (isBlock) {
                    fragment.appendChild(child);
                    lastBlock = child;
                    paragraph = null;
                    return;
                }
                if (!paragraph) {
                    paragraph = document.createElement('p');
                    fragment.appendChild(paragraph);
                    lastBlock = paragraph;
                }
                paragraph.appendChild(child);
            });
            if (wasEmpty) {
                // Keep an empty <li> as an empty paragraph instead of dropping it.
                const empty = document.createElement('p');
                empty.innerHTML = '<br>';
                fragment.appendChild(empty);
                lastBlock = empty;
            }
        });

        list.replaceWith(fragment);

        if (lastBlock) {
            const newRange = document.createRange();
            newRange.selectNodeContents(lastBlock);
            newRange.collapse(false);
            this.selection.setRange(newRange);
        }
    }

    /**
     * Converts a single <li> into a block element (heading, paragraph, ...)
     * by splitting its list around the item: the new block takes the item's
     * place beside the list instead of living inside it, because block tags
     * nested in <ul>/<ol> (e.g. <ul><h1>…</h1></ul>) are invalid markup that
     * browsers render and edit unpredictably — the caret kept behaving as if
     * the text were still part of the list. Nested lists carried by the item
     * are kept as siblings right after the new block.
     * @param {HTMLElement} li
     * @param {string} targetTag lowercase block tag name (e.g. 'h1')
     * @returns {HTMLElement} the created block
     */
    convertListItem(li, targetTag) {
        const list = li.parentElement;
        const block = document.createElement(targetTag);
        const nested = [];
        [...li.childNodes].forEach((child) => {
            if (isListElement(child)) nested.push(child);
            else block.appendChild(child);
        });
        if (!block.firstChild) block.innerHTML = '<br>';

        // Items after this one move into a copy of the list so they stay a
        // list once the block takes this item's place.
        const remainder = document.createElement(list.tagName);
        remainder.className = list.className;
        let sibling = li.nextSibling;
        while (sibling) {
            const next = sibling.nextSibling;
            remainder.appendChild(sibling);
            sibling = next;
        }

        const hasItemsBefore = li.previousElementSibling !== null;
        li.remove();

        // The block sits beside the list: after it when earlier items remain
        // (the list keeps them), before it when this item was first — valid
        // both at the root level and inside a parent <li>.
        const anchor = hasItemsBefore ? list.nextSibling : list;
        const parent = list.parentNode;
        const nodes = [block, ...nested];
        if (remainder.firstChild) nodes.push(remainder);
        nodes.forEach((node) => parent.insertBefore(node, anchor));

        // The list no longer has any item of its own — drop the empty shell.
        if (!list.querySelector('li')) list.remove();

        return block;
    }

    /**
     * Whether an <li> holds nothing worth keeping: no text and no embedded
     * content (nested lists, images, checkboxes, ...). Enter and Backspace use
     * it to decide when the caret should leave the list.
     * @param {HTMLElement} li
     * @returns {boolean}
     */
    isListItemEmpty(li) {
        if (li.textContent.trim()) return false;
        return !li.querySelector('ul, ol, img, input, iframe, table, figure, video, audio');
    }

    /**
     * Leaves the list from an empty <li> (Enter): removes the item and puts
     * the caret into a fresh paragraph after the list — or in the list's place
     * when the item was the last one — so further typing continues as plain
     * content (headings, paragraphs, ...) instead of staying in the list.
     * @param {HTMLElement} li
     */
    exitList(li) {
        const list = li.parentElement;
        if (!isListElement(list)) return;
        li.remove();

        const p = document.createElement('p');
        p.innerHTML = '<br>';
        if (list.querySelector('li')) {
            list.parentNode.insertBefore(p, list.nextSibling);
        } else {
            list.replaceWith(p);
        }

        const newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        this.selection.setRange(newRange);
    }

    /**
     * Deletes an empty <li> (Backspace). The caret moves to the end of a
     * neighbouring item; when the list would be left empty it collapses into
     * a paragraph so no empty list shell survives.
     * @param {HTMLElement} li
     */
    removeListItem(li) {
        const list = li.parentElement;
        if (!isListElement(list)) return;

        const neighbour = li.previousElementSibling ?? li.nextElementSibling;
        li.remove();

        if (!list.querySelector('li')) {
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            list.replaceWith(p);
            this.placeCaretAtEnd(p);
            return;
        }

        if (neighbour) this.placeCaretAtEnd(neighbour);
    }

    /**
     * Indents the current <li> one level by nesting it into a list inside the
     * previous item (Tab). Done directly on the DOM because
     * execCommand('indent') is inconsistent across browsers inside lists.
     * @param {HTMLElement} li
     */
    indentListItem(li) {
        const previous = li.previousElementSibling;
        // The first item has nothing to nest into.
        if (!previous || previous.tagName !== 'LI') return;

        const list = li.parentElement;
        let nested = [...previous.children].find(isListElement);
        if (!nested) {
            nested = document.createElement(list.tagName);
            previous.appendChild(nested);
        }
        nested.appendChild(li);
        this.placeCaretAtEnd(li);
    }

    /**
     * Outdents the current <li> one level (Shift+Tab): the item moves out of
     * its nested list and becomes a sibling of that list inside the parent
     * item. Top-level items are left untouched.
     * @param {HTMLElement} li
     */
    outdentListItem(li) {
        const list = li.parentElement;
        const parentLi = list.parentElement;
        if (!parentLi || parentLi.tagName !== 'LI') return;

        // The item joins its parent item's own level: right after the <li>
        // that contains the nested list it is leaving.
        parentLi.parentNode.insertBefore(li, parentLi.nextSibling);
        if (!list.querySelector('li')) list.remove();
        this.placeCaretAtEnd(li);
    }

    /** Places the caret at the end of an element. @param {HTMLElement} el */
    placeCaretAtEnd(el) {
        const newRange = document.createRange();
        newRange.selectNodeContents(el);
        newRange.collapse(false);
        this.selection.setRange(newRange);
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
        // A fully selected <ul>/<ol> resolves to the list itself: expand it
        // into its items so each one converts through the same list-item
        // path (converting the list element directly would copy its <li>
        // children into the target block, e.g. <h1><li>…</li></h1>).
        const blocks = this.getBlocksInRange(range).flatMap((block) =>
            isListElement(block)
                ? [...block.children].filter((el) => el.tagName === 'LI')
                : [block]
        );

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
            let replacement;
            if (block.tagName === 'LI' && isListElement(block.parentElement)) {
                // A list item can't just change its tag in place: that would
                // put a heading/paragraph inside <ul>/<ol> (invalid markup the
                // browser then keeps treating as part of the list). Split the
                // list instead so the new block sits beside it.
                replacement = this.convertListItem(block, targetTag);
            } else {
                replacement = document.createElement(targetTag);
                replacement.innerHTML = block.innerHTML || '<br>';
                block.replaceWith(replacement);
            }
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
