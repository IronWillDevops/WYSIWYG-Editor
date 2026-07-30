export default class ContextMenu {
    constructor(editor) {
        this.editor = editor;
        this.menu = null;
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.close = this.close.bind(this);

        editor.root.addEventListener('contextmenu', this.handleContextMenu);
        document.addEventListener('click', this.close);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
    }

    handleContextMenu(event) {
        event.preventDefault();
        this.close();

        const target = event.target;
        this.menu = document.createElement('div');
        this.menu.className = 'ife-context-menu';
        this.menu.style.left = `${event.clientX}px`;
        this.menu.style.top = `${event.clientY}px`;

        const items = [];

        const img = target.closest('figure.ife-image img');
        if (img) {
            items.push({ label: 'Edit image', action: () => this.editor.module('image')?.open() });
            items.push({ label: 'Remove image', action: () => {
                const fig = img.closest('figure.ife-image');
                if (fig) { this.editor.history.push(); fig.remove(); this.editor.emitChange(); }
            }});
        }

        const anchor = target.closest('a');
        if (anchor) {
            items.push({ label: 'Edit link', action: () => this.editor.module('link')?.open() });
            items.push({ label: 'Remove link', action: () => this.editor.module('link')?.remove(anchor) });
        }

        const cell = target.closest('td, th');
        if (cell) {
            items.push({ label: 'Row above', action: () => this.editor.module('table')?.addRow(true) });
            items.push({ label: 'Row below', action: () => this.editor.module('table')?.addRow(false) });
            items.push({ label: 'Delete row', action: () => this.editor.module('table')?.deleteRow() });
            items.push({ label: 'Column left', action: () => this.editor.module('table')?.addColumn(true) });
            items.push({ label: 'Column right', action: () => this.editor.module('table')?.addColumn(false) });
            items.push({ label: 'Delete column', action: () => this.editor.module('table')?.deleteColumn() });
        }

        items.push({ type: 'separator' });
        items.push({ label: 'Cut', action: () => document.execCommand('cut') });
        items.push({ label: 'Copy', action: () => document.execCommand('copy') });
        items.push({ label: 'Paste', action: () => navigator.clipboard?.readText().then((text) => {
            this.editor.commands.insertHTML(this.editor.escapeHtml(text));
        }) });
        items.push({ type: 'separator' });
        items.push({ label: 'Select all', action: () => {
            const range = document.createRange();
            range.selectNodeContents(this.editor.root);
            this.editor.selection.setRange(range);
        }});

        items.forEach((item) => {
            if (item.type === 'separator') {
                const sep = document.createElement('div');
                sep.className = 'ife-context-menu__separator';
                this.menu.appendChild(sep);
                return;
            }
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ife-context-menu__item';
            btn.textContent = item.label;
            btn.addEventListener('mousedown', (e) => e.preventDefault());
            btn.addEventListener('click', () => {
                this.close();
                this.editor.selection.restore();
                item.action();
            });
            this.menu.appendChild(btn);
        });

        document.body.appendChild(this.menu);
        this.editor.selection.save();
    }

    close() {
        if (this.menu) {
            this.menu.remove();
            this.menu = null;
        }
    }

    destroy() {
        this.close();
        this.editor.root.removeEventListener('contextmenu', this.handleContextMenu);
        document.removeEventListener('click', this.close);
    }
}
