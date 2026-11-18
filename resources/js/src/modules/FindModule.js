import Dialog from '../utils/Dialog.js';

/**
 * Find & Replace across the editor's text content, with optional
 * regular-expression and case-sensitive matching, plus "highlight all".
 */
export default class FindModule {
    constructor(editor) {
        this.editor = editor;
        this.matches = [];
        this.currentIndex = -1;
    }

    open() {
        this.clearHighlights();

        const body = `
            <label class="ife-field">
                <span>Find</span>
                <input type="text" name="query" required autofocus>
            </label>
            <label class="ife-field">
                <span>Replace with</span>
                <input type="text" name="replacement">
            </label>
            <label class="ife-field--inline"><input type="checkbox" name="caseSensitive"> Case sensitive</label>
            <label class="ife-field--inline"><input type="checkbox" name="useRegex"> Regular expression</label>
        `;

        this.dialog = new Dialog(this.editor.wrapper, {
            title: 'Find & Replace',
            bodyHtml: body,
            confirmLabel: 'Replace all',
            onConfirm: (form) => this.replaceAll(form),
            // Clearing the highlights must also give the caret back: opening
            // the dialog moves focus into it, so without a restore the user
            // loses their place in the document after closing.
            onClose: () => {
                this.clearHighlights();
                this.editor.selection.restore();
            },
        });

        const findNextBtn = document.createElement('button');
        findNextBtn.type = 'button';
        findNextBtn.className = 'ife-btn ife-btn--ghost';
        findNextBtn.textContent = 'Highlight all';
        findNextBtn.addEventListener('mousedown', (e) => e.preventDefault());
        findNextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.highlightAll(new FormData(this.dialog.form));
        });

        this.editor.selection.save();
        this.dialog.open();
        this.dialog.form.querySelector('.ife-dialog__footer').prepend(findNextBtn);
    }

    buildRegex(form) {
        const query = String(form.get('query') ?? '').trim();
        if (!query) return null;
        const caseSensitive = Boolean(form.get('caseSensitive'));
        const useRegex = Boolean(form.get('useRegex'));
        const flags = `g${caseSensitive ? '' : 'i'}`;
        const pattern = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(pattern, flags);
    }

    /**
     * buildRegex() rethrows SyntaxError for a malformed user pattern; the
     * dialog handlers must not let that escape (it would leave the dialog
     * stuck with an uncaught error and no feedback).
     * @param {FormData|URLSearchParams} form
     * @returns {RegExp|null} null when the query is empty or invalid
     */
    safeBuildRegex(form) {
        try {
            return this.buildRegex(form);
        } catch {
            return null;
        }
    }

    highlightAll(form) {
        this.clearHighlights();
        const query = String(form.get('query') ?? '');
        if (!query) return;
        const regex = this.safeBuildRegex(form);
        if (!regex) return;

        const walker = document.createTreeWalker(this.editor.root, NodeFilter.SHOW_TEXT, null);
        const textNodes = [];
        let node = walker.nextNode();
        while (node) {
            textNodes.push(node);
            node = walker.nextNode();
        }

        textNodes.forEach((textNode) => {
            const text = textNode.textContent ?? '';
            if (!regex.test(text)) return;
            regex.lastIndex = 0;

            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match = regex.exec(text);
            while (match) {
                if (match[0].length === 0) {
                    // Zero-width match (`x*`, `(?=a)`, ...): exec() would
                    // return it forever at the same index and hang the tab.
                    // Skip past it — an empty match has nothing to mark.
                    regex.lastIndex = match.index + 1;
                    match = regex.exec(text);
                    continue;
                }
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                const mark = document.createElement('mark');
                mark.className = 'ife-search-highlight';
                mark.textContent = match[0];
                fragment.appendChild(mark);
                lastIndex = match.index + match[0].length;
                match = regex.exec(text);
            }
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
            textNode.replaceWith(fragment);
        });
    }

    clearHighlights() {
        this.editor.root.querySelectorAll('mark.ife-search-highlight').forEach((mark) => {
            mark.replaceWith(document.createTextNode(mark.textContent ?? ''));
        });
        this.editor.root.normalize();
    }

    /**
     * @param {FormData|HTMLFormElement} form
     * @returns {boolean} false when there is nothing to replace (empty or
     *   invalid query) so the Dialog can stay open for correction
     */
    replaceAll(form) {
        const data = new FormData(form);
        const regex = this.safeBuildRegex(data);
        if (!regex) return false;
        const replacement = String(data.get('replacement') ?? '');

        this.editor.history.push();
        this.clearHighlights();

        const walker = document.createTreeWalker(this.editor.root, NodeFilter.SHOW_TEXT, null);
        const textNodes = [];
        let node = walker.nextNode();
        while (node) {
            textNodes.push(node);
            node = walker.nextNode();
        }

        textNodes.forEach((textNode) => {
            textNode.textContent = (textNode.textContent ?? '').replace(regex, replacement);
        });

        this.editor.emitChange();
        return true;
    }

    destroy() {
        this.clearHighlights();
        this.dialog?.close();
    }
}
