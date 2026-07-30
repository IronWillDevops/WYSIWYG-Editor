/**
 * Central command executor. Wraps the small, still well-supported subset of
 * document.execCommand for inline formatting (bold/italic/underline/lists),
 * and implements block-level / structural commands manually for full control
 * over the resulting markup (no legacy <font>/<b> soup).
 */
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
                if (value) {
                    document.execCommand('foreColor', false, value);
                } else {
                    this.clearColor('color');
                }
                break;

            case 'backColor':
                if (value) {
                    document.execCommand('hiliteColor', false, value);
                } else {
                    this.clearColor('backgroundColor');
                }
                break;

            case 'blockFormat':
                this.setBlockFormat(value);
                break;

            case 'fontName':
                this.setInlineStyle('fontFamily', value);
                break;

            case 'fontSize':
                this.setInlineStyle('fontSize', value);
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
     * Replaces the current block element's tag (p, h1-h6, blockquote, pre).
     * If the block is already the target tag, toggles back to <p>.
     * @param {string} tagName
     */
    setBlockFormat(tagName) {
        const block = this.selection.getBlockElement();
        if (!block || block === this.root) {
            document.execCommand('formatBlock', false, `<${tagName}>`);
            return;
        }

        if (block.tagName === tagName.toUpperCase()) {
            const replacement = document.createElement('p');
            replacement.innerHTML = block.innerHTML;
            block.replaceWith(replacement);

            const range = document.createRange();
            range.selectNodeContents(replacement);
            range.collapse(false);
            this.selection.setRange(range);
            return;
        }

        const replacement = document.createElement(tagName);
        replacement.innerHTML = block.innerHTML;
        block.replaceWith(replacement);

        const range = document.createRange();
        range.selectNodeContents(replacement);
        range.collapse(false);
        this.selection.setRange(range);
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
        const blockTags = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'DIV']);
        const closestBlock = (node) => {
            let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
            while (el && el !== this.root) {
                if (el instanceof HTMLElement && el.parentElement === this.root && blockTags.has(el.tagName)) {
                    return el;
                }
                el = el.parentElement;
            }
            return null;
        };

        const startBlock = closestBlock(range.startContainer);
        if (!startBlock) return [];
        const endBlock = closestBlock(range.endContainer) ?? startBlock;
        if (startBlock === endBlock) return [startBlock];

        const blocks = [];
        let node = startBlock;
        while (node) {
            blocks.push(node);
            if (node === endBlock) break;
            node = node.nextElementSibling;
        }
        return blocks.length ? blocks : [startBlock];
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

    /**
     * Converts legacy <font> tags (generated by execCommand in browsers that
     * ignore styleWithCSS for fontName/fontSize) to styled <span> elements.
     * Without this, the Sanitizer would strip <font> tags on save.
     */
    cleanFontTags() {
        const fonts = this.root.querySelectorAll('font');
        fonts.forEach((font) => {
            if (!font.parentNode) return;
            const span = document.createElement('span');
            if (font.face) span.style.fontFamily = font.face;
            if (font.size) {
                const map = { '1': '12px', '2': '14px', '3': '16px', '4': '18px', '5': '24px', '6': '32px', '7': '48px' };
                span.style.fontSize = map[font.size] || '16px';
            }
            while (font.firstChild) span.appendChild(font.firstChild);
            font.replaceWith(span);
        });
    }

    /**
     * Normalizes font-size on spans directly under root that have a
     * non-px inline font-size (e.g. 'large', 'medium') to the target px
     * value. Browsers that respect styleWithCSS for fontSize emit CSS
     * keywords instead of px; this ensures the inline style uses the
     * exact px chosen by the user.
     */
    normalizeFontSizeSpans(targetPx) {
        const spans = this.root.querySelectorAll('span');
        spans.forEach((span) => {
            const fs = span.style.fontSize;
            if (fs && !fs.endsWith('px')) {
                span.style.fontSize = targetPx;
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
}
