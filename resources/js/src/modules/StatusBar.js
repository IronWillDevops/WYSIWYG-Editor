import Icons from '../icons/Icons.js';

export default class StatusBar {
    constructor(editor) {
        this.editor = editor;
        this.update = this.update.bind(this);

        this.buildDom();
        this.bindEvents();
        this.update();
    }

    buildDom() {
        this.el = document.createElement('div');
        this.el.className = 'ife-statusbar';

        this.left = document.createElement('span');
        this.left.className = 'ife-statusbar__left';

        this.wordsEl = document.createElement('span');
        this.wordsEl.className = 'ife-statusbar__item';
        this.wordsEl.innerHTML = `${Icons.wordCount} <span class="ife-statusbar__value">0</span>`;

        this.charsEl = document.createElement('span');
        this.charsEl.className = 'ife-statusbar__item';
        this.charsEl.innerHTML = `${Icons.specialChars} <span class="ife-statusbar__value">0</span>`;

        this.left.appendChild(this.wordsEl);
        this.left.appendChild(this.charsEl);

        this.right = document.createElement('span');
        this.right.className = 'ife-statusbar__right';
        this.right.textContent = 'Made by ITkha';

        this.el.appendChild(this.left);
        this.el.appendChild(this.right);

        this.editor.wrapper.appendChild(this.el);
    }

    bindEvents() {
        this.editor.root.addEventListener('input', this.update);
        this.editor.on('change', this.update);
        this.editor.on('destroy', () => this.destroy());
    }

    update() {
        const text = this.editor.getText();
        const charCount = text.length;
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        this.wordsEl.querySelector('.ife-statusbar__value').textContent = wordCount;
        this.charsEl.querySelector('.ife-statusbar__value').textContent = charCount;
    }

    destroy() {
        this.editor.root.removeEventListener('input', this.update);
        this.el.remove();
    }
}
