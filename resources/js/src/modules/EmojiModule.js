export default class EmojiModule {
    constructor(editor) {
        this.editor = editor;
        this.picker = null;
        this._triggerEl = null;
        this._boundOnResize = null;
        this._boundOnScroll = null;
        this._boundOnClickOutside = null;
    }

    open(triggerEl) {
        if (this.picker) {
            this.close();
            return;
        }

        this._triggerEl = triggerEl || this.editor.wrapper.querySelector('[data-command="emoji"]');
        this.editor.selection.save();

        this.picker = document.createElement('div');
        this.picker.className = 'ife-emoji-picker';
        this.picker.setAttribute('role', 'dialog');
        this.picker.setAttribute('aria-label', 'Emoji picker');

        const header = document.createElement('div');
        header.className = 'ife-emoji-picker__header';

        const title = document.createElement('span');
        title.className = 'ife-emoji-picker__title';
        title.textContent = 'Emoji';
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'ife-emoji-picker__close';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.addEventListener('click', () => this.close());
        header.appendChild(closeBtn);

        this.picker.appendChild(header);

        const categories = [
            { name: 'Smileys', emojis: [
                '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
                '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋',
                '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🫢', '🫣', '🤫',
                '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒',
                '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
                '🤕', '🤢', '🤮', '🥴', '😵', '🤯', '🥳', '🥺', '😢', '😭',
                '😤', '😠', '😡', '🤬', '💀', '☠️', '💩', '🤡', '👹', '👺',
            ]},
            { name: 'Gestures', emojis: [
                '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌',
                '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉',
                '👆', '🖕', '👇', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜',
                '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳',
            ]},
            { name: 'Nature', emojis: [
                '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
                '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
                '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
                '🐌', '🐞', '🐜', '🦟', '🦗', '🪳', '🪰', '🪱', '🐢', '🐍',
                '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠',
            ]},
            { name: 'Food', emojis: [
                '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
                '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑',
                '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅',
                '🥔', '🍠', '🫓', '🥐', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞',
                '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕',
            ]},
            { name: 'Symbols', emojis: [
                '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
                '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
                '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '🪯', '♈',
                '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒',
                '♓', '⛎', '🔀', '🔁', '🔂', '▶️', '⏩', '⏭️', '⏯️', '◀️',
            ]},
        ];

        const body = document.createElement('div');
        body.className = 'ife-emoji-picker__body';

        categories.forEach((cat) => {
            const group = document.createElement('div');
            group.className = 'ife-emoji-picker__group';

            const label = document.createElement('div');
            label.className = 'ife-emoji-picker__group-label';
            label.textContent = cat.name;
            group.appendChild(label);

            const grid = document.createElement('div');
            grid.className = 'ife-emoji-picker__grid';

            cat.emojis.forEach((emoji) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'ife-emoji-picker__btn';
                btn.textContent = emoji;
                btn.setAttribute('aria-label', emoji);
                btn.addEventListener('mousedown', (e) => e.preventDefault());
                btn.addEventListener('click', () => {
                    this.editor.selection.restore();
                    this.editor.commands.insertHTML(emoji);
                    this.close();
                });
                grid.appendChild(btn);
            });

            group.appendChild(grid);
            body.appendChild(group);
        });

        this.picker.appendChild(body);

        document.body.appendChild(this.picker);

        const wrapper = this.editor.wrapper;
        this.picker.style.setProperty('--ife-bg', getComputedStyle(wrapper).getPropertyValue('--ife-bg'));
        this.picker.style.setProperty('--ife-text', getComputedStyle(wrapper).getPropertyValue('--ife-text'));
        this.picker.style.setProperty('--ife-border', getComputedStyle(wrapper).getPropertyValue('--ife-border'));
        this.picker.style.setProperty('--ife-btn-hover', getComputedStyle(wrapper).getPropertyValue('--ife-btn-hover'));
        this.picker.style.setProperty('--ife-btn-active', getComputedStyle(wrapper).getPropertyValue('--ife-btn-active'));

        this.positionPicker();

        this._boundOnResize = () => this.positionPicker();
        this._boundOnScroll = () => {
            if (!this.picker) return;
            this.close();
        };
        this._boundOnClickOutside = (e) => {
            if (!this.picker) return;
            if (this.picker.contains(e.target)) return;
            if (this._triggerEl && this._triggerEl.contains(e.target)) return;
            this.close();
        };
        window.addEventListener('resize', this._boundOnResize);
        window.addEventListener('scroll', this._boundOnScroll);
        document.addEventListener('click', this._boundOnClickOutside);

        setTimeout(() => {
            if (!this.picker) return;
            const firstBtn = this.picker.querySelector('.ife-emoji-picker__btn');
            if (firstBtn) firstBtn.focus();
        }, 50);
    }

    positionPicker() {
        if (!this._triggerEl || !this.picker) return;

        const rect = this._triggerEl.getBoundingClientRect();
        const pickerWidth = this.picker.offsetWidth || 352;
        const pickerHeight = this.picker.offsetHeight;

        let top = rect.bottom + 4;
        let left = rect.left;

        if (top + pickerHeight > window.innerHeight && rect.top - pickerHeight - 4 > 0) {
            top = rect.top - pickerHeight - 4;
        }

        if (left + pickerWidth > window.innerWidth) {
            left = Math.max(8, window.innerWidth - pickerWidth - 8);
        }

        if (left < 0) left = 8;

        const wrapperZ = parseFloat(getComputedStyle(this.editor.wrapper).zIndex);
        if (!isNaN(wrapperZ)) {
            this.picker.style.zIndex = wrapperZ + 1;
        }

        this.picker.style.top = `${top}px`;
        this.picker.style.left = `${left}px`;
    }

    close() {
        if (this.picker) {
            this.picker.remove();
            this.picker = null;
        }
        this._triggerEl = null;
        this._removeListeners();
    }

    _removeListeners() {
        if (this._boundOnResize) {
            window.removeEventListener('resize', this._boundOnResize);
            this._boundOnResize = null;
        }
        if (this._boundOnScroll) {
            window.removeEventListener('scroll', this._boundOnScroll);
            this._boundOnScroll = null;
        }
        if (this._boundOnClickOutside) {
            document.removeEventListener('click', this._boundOnClickOutside);
            this._boundOnClickOutside = null;
        }
    }

    destroy() {
        this.close();
    }
}
