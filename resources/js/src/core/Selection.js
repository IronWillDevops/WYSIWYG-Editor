/**
 * Wraps the native Selection/Range APIs and confines every operation
 * to the editor's own contenteditable root, so the host page's own
 * selection is never touched by mistake.
 */
export default class Selection {
    /**
     * @param {HTMLElement} root contenteditable element
     */
    constructor(root) {
        this.root = root;
    }

    /** @returns {globalThis.Selection|null} */
    getNativeSelection() {
        return window.getSelection ? window.getSelection() : null;
    }

    /** @returns {Range|null} */
    getRange() {
        const sel = this.getNativeSelection();
        if (!sel || sel.rangeCount === 0) return null;
        const range = sel.getRangeAt(0);
        return this.root.contains(range.commonAncestorContainer) ? range : null;
    }

    /** @param {Range} range */
    setRange(range) {
        const sel = this.getNativeSelection();
        if (!sel) return;
        sel.removeAllRanges();
        sel.addRange(range);
    }

    /** Save the current range so it can be restored after a toolbar click blurs the editor. */
    save() {
        const range = this.getRange();
        if (range) {
            this.savedRange = range.cloneRange();
            // Also snapshot the selection as character offsets in the root's text
            // stream. A live Range is re-targeted/collapsed by the browser the
            // moment the editor's DOM is mutated (e.g. colouring splits and moves
            // the selected text node), so a Range saved from the last pick is
            // unreliable for the next one. Offsets survive that mutation and let
            // restore() locate the same text again.
            this.savedStart = this.offsetOf(range.startContainer, range.startOffset);
            this.savedEnd = this.offsetOf(range.endContainer, range.endOffset);
        } else {
            this.savedRange = null;
            this.savedStart = null;
            this.savedEnd = null;
        }
        return this.savedRange;
    }

    /** @returns {Range|null} a clone of the saved range (or null if none) */
    getSavedRange() {
        return this.savedRange ? this.savedRange.cloneRange() : null;
    }

    /** @returns {[number, number]|null} saved [start, end] character offsets */
    getSavedOffsets() {
        return this.savedStart !== null && this.savedEnd !== null
            ? [this.savedStart, this.savedEnd]
            : null;
    }

    restore() {
        if (!this.savedRange) return;
        this.root.focus({preventScroll: true});
        // Rebuild from offsets first: this is stable across the DOM mutations a
        // formatting command performs on the boundaries. Fall back to a clone of
        // the saved range only when offsets are unavailable.
        const byOffsets = this.buildRangeFromOffsets();
        this.setRange(byOffsets ?? this.savedRange.cloneRange());
    }

    /**
     * Restores the saved selection by offsets WITHOUT focusing the editor.
     * Used by the native colour input: focusing while the colour dialog is open
     * dismisses it, so this keeps the picker live while colouring updates.
     */
    restoreSavedOffsets() {
        const byOffsets = this.buildRangeFromOffsets();
        if (byOffsets) this.setRange(byOffsets);
    }

    /** @returns {Range|null} a range for the saved character offsets */
    buildRangeFromOffsets() {
        if (this.savedStart === null || this.savedEnd === null) return null;
        const start = this.offsetToPoint(this.savedStart);
        const end = this.offsetToPoint(this.savedEnd);
        if (!start || !end) return null;
        const range = document.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        return range;
    }

    /**
     * Character offset of a (node, offset) boundary in the root's concatenated
     * text stream. Element boundaries resolve to the start (offset 0) or the end
     * of the element's own text (offset > 0).
     * @param {Node} node
     * @param {number} offset
     * @returns {number}
     */
    offsetOf(node, offset) {
        if (node.nodeType === Node.TEXT_NODE) {
            return this.textOffsetBefore(node) + offset;
        }
        return offset === 0
            ? this.textOffsetBefore(node)
            : this.textOffsetBefore(node) + this.subtreeTextLength(node);
    }

    /** Number of text characters that precede `node` within the root. */
    textOffsetBefore(node) {
        let acc = 0;
        const walker = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
        let t;
        while ((t = walker.nextNode())) {
            if (t === node || node.contains(t)) break;
            acc += t.textContent.length;
        }
        return acc;
    }

    /** Total text character count inside `node`'s subtree. */
    subtreeTextLength(node) {
        let acc = 0;
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        let t;
        while ((t = walker.nextNode())) acc += t.textContent.length;
        return acc;
    }

    /** @returns {{node: Text, offset: number}|null} the point at a char offset */
    offsetToPoint(offset) {
        let acc = 0;
        const walker = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
        let t;
        while ((t = walker.nextNode())) {
            const len = t.textContent.length;
            if (offset <= acc + len) {
                return { node: t, offset: offset - acc };
            }
            acc += len;
        }
        return null;
    }

    /**
     * Re-selects the text between two character offsets in the root's text
     * stream, locating the text nodes that now hold those offsets (robust to the
     * splits and moves performed by colouring).
     * @param {number} start
     * @param {number} end
     */
    setRangeByOffsets(start, end) {
        const startPoint = this.offsetToPoint(start);
        const endPoint = this.offsetToPoint(end);
        if (!startPoint || !endPoint) return;
        const range = document.createRange();
        range.setStart(startPoint.node, startPoint.offset);
        range.setEnd(endPoint.node, endPoint.offset);
        this.setRange(range);
    }

    collapseToEnd() {
        const range = document.createRange();
        range.selectNodeContents(this.root);
        range.collapse(false);
        this.setRange(range);
    }

    isCollapsed() {
        return this.getNativeSelection()?.isCollapsed ?? true;
    }

    /** @returns {string} plain text of the current selection */
    getText() {
        return this.getNativeSelection()?.toString() ?? '';
    }

    /**
     * Returns the closest ancestor element matching selector, bounded by root.
     * @param {string} selector
     * @returns {HTMLElement|null}
     */
    closest(selector) {
        const range = this.getRange();
        if (!range) return null;
        let node = range.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        while (node && node !== this.root.parentElement) {
            if (node instanceof HTMLElement && node.matches(selector)) return node;
            node = node.parentElement;
        }
        return null;
    }

    /**
     * Returns block-level ancestor of the current selection (p, h1-h6, li, blockquote, pre...).
     * @returns {HTMLElement|null}
     */
    getBlockElement() {
        const range = this.getRange();
        if (!range) return null;
        let node = range.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        const blockTags = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'LI', 'DIV']);
        while (node && node !== this.root) {
            if (node instanceof HTMLElement && blockTags.has(node.tagName)) return node;
            node = node.parentElement;
        }
        return null;
    }

    /**
     * Wraps the current selection in a new element, splitting text nodes as needed.
     * @param {string} tagName
     * @returns {HTMLElement|null}
     */
    wrap(tagName) {
        const range = this.getRange();
        if (!range) return null;
        const wrapper = document.createElement(tagName);
        try {
            range.surroundContents(wrapper);
        } catch {
            // Range spans multiple elements (surroundContents fails) -> extract + wrap instead.
            const fragment = range.extractContents();
            wrapper.appendChild(fragment);
            range.insertNode(wrapper);
        }
        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        this.setRange(newRange);
        return wrapper;
    }

    focus() {
        this.root.focus();
        this.restore();
    }
}
