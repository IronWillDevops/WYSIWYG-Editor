import Dialog from '../utils/Dialog.js';

/**
 * Full link management: insert, edit (url, text, title, target, rel flags),
 * and remove — matching the "полная поддержка ссылок" requirement.
 */
export default class LinkModule {
    constructor(editor) {
        this.editor = editor;
        this.handleDblClick = this.handleDblClick.bind(this);
        // Lets people jump straight into editing a link by double-clicking it,
        // instead of having to place the caret inside it and hunt for the
        // toolbar button.
        editor.root.addEventListener('dblclick', this.handleDblClick);
    }

    /** @param {MouseEvent} event */
    handleDblClick(event) {
        const anchor = event.target.closest?.('a');
        if (!anchor || !this.editor.root.contains(anchor)) return;
        event.preventDefault();

        const range = document.createRange();
        range.selectNodeContents(anchor);
        this.editor.selection.setRange(range);
        this.editor.selection.save();

        this.open();
    }

    open() {
        const existing = this.editor.selection.closest('a');
        const selectedText = this.editor.selection.getText();

        const body = `
            <label class="ife-field">
                <span>Text</span>
                <input type="text" name="text" value="${this.escape(existing?.textContent ?? selectedText)}" required>
            </label>
            <label class="ife-field">
                <span>URL</span>
                <input type="url" name="href" value="${this.escape(existing?.getAttribute('href') ?? 'https://')}" required>
            </label>
            <label class="ife-field">
                <span>Title</span>
                <input type="text" name="title" value="${this.escape(existing?.getAttribute('title') ?? '')}">
            </label>
            <label class="ife-field ife-field--inline">
                <input type="checkbox" name="newTab" ${existing?.target === '_blank' ? 'checked' : ''}>
                <span>Open in new tab</span>
            </label>
            <fieldset class="ife-field-group">
                <legend>rel</legend>
                <label class="ife-field--inline"><input type="checkbox" name="nofollow" ${existing?.rel.includes('nofollow') ? 'checked' : ''}> nofollow</label>
                <label class="ife-field--inline"><input type="checkbox" name="noopener" ${existing?.rel.includes('noopener') ? 'checked' : ''}> noopener</label>
                <label class="ife-field--inline"><input type="checkbox" name="noreferrer" ${existing?.rel.includes('noreferrer') ? 'checked' : ''}> noreferrer</label>
            </fieldset>
        `;

        this.dialog = new Dialog(this.editor.wrapper, {
            title: existing ? 'Edit link' : 'Insert link',
            bodyHtml: body,
            confirmLabel: existing ? 'Update' : 'Insert',
            onConfirm: (form) => this.apply(form, existing),
        });

        this.editor.selection.save();
        this.dialog.open();

        if (existing) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'ife-btn ife-btn--danger';
            removeBtn.textContent = 'Remove link';
            removeBtn.addEventListener('mousedown', (e) => e.preventDefault());
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.remove(existing);
                this.dialog.close();
            });
            this.dialog.form.querySelector('.ife-dialog__footer').prepend(removeBtn);
        }
    }

    apply(form, existing) {
        const data = new FormData(form);
        const rel = ['nofollow', 'noopener', 'noreferrer'].filter((flag) => data.get(flag)).join(' ');

        const anchor = existing ?? document.createElement('a');
        anchor.textContent = String(data.get('text'));

        // Fallback to '#' for unsafe URLs (javascript:, etc.) so the link
        // is still created but harmless, rather than silently dropping the
        // attribute which would default to the current page URL.
        const href = String(data.get('href'));
        anchor.setAttribute('href', this.editor.sanitizer.isSafeUrl(href) ? href : '#');
        anchor.setAttribute('title', String(data.get('title') ?? ''));
        anchor.setAttribute('target', data.get('newTab') ? '_blank' : '_self');
        if (rel) anchor.setAttribute('rel', rel);
        else anchor.removeAttribute('rel');

        this.editor.history.push();

        if (!existing) {
            this.editor.selection.restore();
            const range = this.editor.selection.getRange();
            range?.deleteContents();
            range?.insertNode(anchor);
        }

        this.editor.emitChange();
    }

    remove(anchor) {
        this.editor.history.push();
        const parent = anchor.parentNode;
        while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
        parent.removeChild(anchor);
        this.editor.emitChange();
    }

    escape(value) {
        return String(value ?? '').replace(/"/g, '&quot;');
    }

    destroy() {
        this.dialog?.close();
        this.editor.root.removeEventListener('dblclick', this.handleDblClick);
    }
}
