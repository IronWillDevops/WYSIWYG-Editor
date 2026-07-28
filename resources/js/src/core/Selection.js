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
        this.savedRange = range ? range.cloneRange() : null;
        return this.savedRange;
    }

    restore() {
        if (this.savedRange) {
            this.setRange(this.savedRange);
        }
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
