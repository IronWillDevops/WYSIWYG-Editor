import Dialog from '../utils/Dialog.js';

const NOTE_TYPES = ['info', 'warning', 'danger', 'success', 'quote', 'tip'];

/**
 * Inserts callout blocks rendered as <div class="note note-{type}">…</div>,
 * matching common Bootstrap/Tailwind alert conventions so the output drops
 * straight into either design system.
 */
export default class NoteModule {
    constructor(editor) {
        this.editor = editor;
    }

    open() {
        const options = NOTE_TYPES.map((type) => `<option value="${type}">${type[0].toUpperCase()}${type.slice(1)}</option>`).join('');
        const body = `
            <label class="ife-field">
                <span>Type</span>
                <select name="type">${options}</select>
            </label>
            <label class="ife-field">
                <span>Text</span>
                <textarea name="text" rows="3" required>${this.escape(this.editor.selection.getText())}</textarea>
            </label>
        `;

        this.dialog = new Dialog(this.editor.wrapper, {
            title: 'Insert note',
            bodyHtml: body,
            confirmLabel: 'Insert',
            onConfirm: (form) => {
                const data = new FormData(form);
                // Keep the dialog open when the text is blank (returns false).
                if (this.insert(String(data.get('type')), String(data.get('text'))) === false) return false;
            },
        });

        this.editor.selection.save();
        this.dialog.open();
    }

    insert(type, text) {
        // Nothing to insert — bail out before pushing a history entry so an
        // empty note (and a junk undo step) is never created.
        if (!String(text ?? '').trim()) return false;

        this.editor.history.push();
        this.editor.selection.restore();

        const note = document.createElement('div');
        note.className = `note note-${type}`;
        note.textContent = text;

        const range = this.editor.selection.getRange();
        if (range) {
            range.deleteContents();
            range.insertNode(note);
        } else {
            // No selection (empty document): append instead of dropping the note.
            this.editor.root.appendChild(note);
        }

        this.editor.emitChange();
        return true;
    }

    escape(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    destroy() {
        this.dialog?.close();
    }
}
