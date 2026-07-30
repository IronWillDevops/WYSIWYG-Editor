import Icons from '../icons/Icons.js';
import Localization from '../i18n/Localization.js';

const BLOCK_LABELS = {
    p: 'paragraph',
    h1: 'heading1',
    h2: 'heading2',
    h3: 'heading3',
    h4: 'heading4',
    h5: 'heading5',
    h6: 'heading6',
    blockquote: 'blockquote',
    pre: 'preformatted',
    li: 'listItem',
    div: 'paragraph',
};

export default class StatusBar {
    constructor(editor) {
        this.editor = editor;
        this.update = this.update.bind(this);
        this._onDestroy = () => this.destroy();

        this.buildDom();
        this.bindEvents();
        this.update();
    }

    buildDom() {
        this.el = document.createElement('div');
        this.el.className = 'ife-statusbar';

        this.left = document.createElement('span');
        this.left.className = 'ife-statusbar__left';

        this.typeEl = document.createElement('span');
        this.typeEl.className = 'ife-statusbar__item';
        this.typeEl.innerHTML = `<span class="ife-statusbar__value">Paragraph</span>`;

        this.wordsEl = document.createElement('span');
        this.wordsEl.className = 'ife-statusbar__item';
        this.wordsEl.innerHTML = `${Icons.wordCount} <span class="ife-statusbar__value">0</span>`;

        this.charsEl = document.createElement('span');
        this.charsEl.className = 'ife-statusbar__item';
        this.charsEl.innerHTML = `${Icons.specialChars} <span class="ife-statusbar__value">0</span>`;

        this.left.appendChild(this.typeEl);
        this.left.appendChild(this.wordsEl);
        this.left.appendChild(this.charsEl);

        const locale = this.editor.options.locale ?? 'en';
        this.right = document.createElement('span');
        this.right.className = 'ife-statusbar__right';
        this.right.textContent = Localization.t(locale, 'madeBy');

        this.el.appendChild(this.left);
        this.el.appendChild(this.right);

        this.editor.wrapper.appendChild(this.el);
    }

    bindEvents() {
        this.editor.root.addEventListener('input', this.update);
        this._unsubChange = this.editor.on('change', this.update);
        this._unsubSelectionChange = this.editor.on('selectionchange', this.update);
        this._unsubDestroy = this.editor.on('destroy', this._onDestroy);
    }

    update() {
        const text = this.editor.getText();
        const charCount = text.length;
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        this.wordsEl.querySelector('.ife-statusbar__value').textContent = wordCount;
        this.charsEl.querySelector('.ife-statusbar__value').textContent = charCount;

        const type = this._getElementType();
        const locale = this.editor.options.locale ?? 'en';
        this.typeEl.querySelector('.ife-statusbar__value').textContent = Localization.t(locale, type);
    }

    _getElementType() {
        const sel = this.editor.selection;
        if (!sel) return 'paragraph';

        if (sel.closest?.('a')) return 'linkLabel';
        if (sel.closest?.('code')) return 'code';

        const block = sel.getBlockElement?.();
        if (!block) return 'paragraph';

        if (block.tagName === 'LI') {
            let el = block.parentElement;
            while (el && el !== this.editor.root) {
                if (el.tagName === 'OL') return 'orderedList';
                if (el.tagName === 'UL') return 'bulletList';
                el = el.parentElement;
            }
        }

        return BLOCK_LABELS[block.tagName.toLowerCase()] || 'paragraph';
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.editor.root.removeEventListener('input', this.update);
        this._unsubChange?.();
        this._unsubSelectionChange?.();
        this._unsubDestroy?.();
        this.el.remove();
    }
}
