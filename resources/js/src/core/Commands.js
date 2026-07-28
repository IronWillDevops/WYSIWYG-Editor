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
            case 'superscript':
            case 'subscript':
            case 'insertUnorderedList':
            case 'insertOrderedList':
            case 'indent':
            case 'outdent':
            case 'justifyLeft':
            case 'justifyCenter':
            case 'justifyRight':
            case 'justifyFull':
                document.execCommand(name, false, value ?? undefined);
                break;

            case 'foreColor':
                document.execCommand('foreColor', false, value);
                break;

            case 'backColor':
                document.execCommand('hiliteColor', false, value);
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

            case 'removeFormat':
                document.execCommand('removeFormat', false);
                break;

            default:
                throw new Error(`Unknown command: ${name}`);
        }

        this.editor.emitChange();
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
     * @param {string} tagName
     */
    setBlockFormat(tagName) {
        const block = this.selection.getBlockElement();
        if (!block || block === this.root) {
            document.execCommand('formatBlock', false, `<${tagName}>`);
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

        const span = this.selection.wrap('span');
        if (span) span.style[cssProperty] = value;
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
