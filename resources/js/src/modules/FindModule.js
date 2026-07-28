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
            onClose: () => this.clearHighlights(),
        });

        const findNextBtn = document.createElement('button');
        findNextBtn.type = 'button';
        findNextBtn.className = 'ife-btn ife-btn--ghost';
        findNextBtn.textContent = 'Highlight all';
        findNextBtn.addEventListener('click', () => {
            this.highlightAll(new FormData(this.dialog.form));
        });

        this.dialog.open();
        this.dialog.form.querySelector('.ife-dialog__footer').prepend(findNextBtn);
    }

    buildRegex(form) {
        const query = String(form.get('query') ?? '');
        const caseSensitive = Boolean(form.get('caseSensitive'));
        const useRegex = Boolean(form.get('useRegex'));
        const flags = `g${caseSensitive ? '' : 'i'}`;
        const pattern = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(pattern, flags);
    }

    highlightAll(form) {
        this.clearHighlights();
        const query = String(form.get('query') ?? '');
        if (!query) return;
        const regex = this.buildRegex(form);
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

    replaceAll(form) {
        const data = new FormData(form);
        const regex = this.buildRegex(data);
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
    }

    destroy() {
        this.clearHighlights();
        this.dialog?.close();
    }
}
