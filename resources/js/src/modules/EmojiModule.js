export default class EmojiModule {
    constructor(editor) {
        this.editor = editor;
        this.picker = null;
    }

    open() {
        if (this.picker) {
            this.picker.remove();
            this.picker = null;
            return;
        }

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

        const wrapper = this.editor.wrapper;
        wrapper.appendChild(this.picker);

        this.picker.style.setProperty('--ife-bg', getComputedStyle(wrapper).getPropertyValue('--ife-bg'));
        this.picker.style.setProperty('--ife-text', getComputedStyle(wrapper).getPropertyValue('--ife-text'));
        this.picker.style.setProperty('--ife-border', getComputedStyle(wrapper).getPropertyValue('--ife-border'));
        this.picker.style.setProperty('--ife-btn-hover', getComputedStyle(wrapper).getPropertyValue('--ife-btn-hover'));
        this.picker.style.setProperty('--ife-btn-active', getComputedStyle(wrapper).getPropertyValue('--ife-btn-active'));

        setTimeout(() => {
            const firstBtn = this.picker.querySelector('.ife-emoji-picker__btn');
            if (firstBtn) firstBtn.focus();
        }, 50);
    }

    close() {
        if (this.picker) {
            this.picker.remove();
            this.picker = null;
        }
    }

    destroy() {
        this.close();
    }
}
