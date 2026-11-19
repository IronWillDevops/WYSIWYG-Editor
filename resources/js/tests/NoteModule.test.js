import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NoteModule from '../src/modules/NoteModule.js';

function createMockEditor() {
    const root = document.createElement('div');
    root.contentEditable = 'true';
    const wrapper = document.createElement('div');
    wrapper.appendChild(root);
    return {
        root,
        wrapper,
        selection: {
            save: vi.fn(),
            restore: vi.fn(),
            getRange: vi.fn(() => {
                const range = document.createRange();
                range.setStart(root, 0);
                range.collapse(true);
                return range;
            }),
            getText: vi.fn(() => ''),
        },
        history: { push: vi.fn() },
        emitChange: vi.fn(),
        on: vi.fn(),
    };
}

describe('NoteModule', () => {
    let editor;
    let module;

    beforeEach(() => {
        document.body.innerHTML = '';
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
        module = new NoteModule(editor);
    });

    afterEach(() => {
        module.destroy();
        document.body.innerHTML = '';
    });

    it('inserts note with correct class', () => {
        module.insert('info', 'Test note');
        const note = editor.root.querySelector('.note');
        expect(note).not.toBeNull();
        expect(note.classList.contains('note-info')).toBe(true);
        expect(note.textContent).toBe('Test note');
    });

    it('inserts note of each type', () => {
        const types = ['info', 'warning', 'danger', 'success', 'quote', 'tip'];
        types.forEach((type) => {
            document.body.innerHTML = '';
            editor = createMockEditor();
            document.body.appendChild(editor.wrapper);
            module = new NoteModule(editor);
            module.insert(type, 'content');
            const note = editor.root.querySelector(`.note-${type}`);
            expect(note).not.toBeNull();
            module.destroy();
        });
    });

    it('pushes history before inserting', () => {
        module.insert('info', 'text');
        expect(editor.history.push).toHaveBeenCalled();
    });

    it('calls emitChange after insert', () => {
        module.insert('info', 'text');
        expect(editor.emitChange).toHaveBeenCalled();
    });

    it('restores selection before inserting', () => {
        module.insert('info', 'text');
        expect(editor.selection.restore).toHaveBeenCalled();
    });

    it('returns false and pushes no history for blank text', () => {
        expect(module.insert('info', '')).toBe(false);
        expect(module.insert('info', '   ')).toBe(false);
        expect(editor.history.push).not.toHaveBeenCalled();
        expect(editor.emitChange).not.toHaveBeenCalled();
        expect(editor.root.querySelector('.note')).toBeNull();
    });

    it('returns true when a note is inserted', () => {
        expect(module.insert('info', 'text')).toBe(true);
    });

    it('appends at the end when there is no selection range', () => {
        editor.selection.getRange = vi.fn(() => null);

        expect(module.insert('info', 'no selection')).toBe(true);
        expect(editor.root.querySelector('.note')).not.toBeNull();
    });

    it('open saves selection', () => {
        module.open();
        expect(editor.selection.save).toHaveBeenCalled();
    });

    describe('open dialog', () => {
        it('creates dialog with type and text fields', () => {
            module.open();
            const overlay = document.body.querySelector('.ife-dialog-overlay');
            expect(overlay).not.toBeNull();
            expect(overlay.querySelector('select[name="type"]')).not.toBeNull();
            expect(overlay.querySelector('textarea[name="text"]')).not.toBeNull();
        });

        it('includes all note types in select', () => {
            module.open();
            const select = document.body.querySelector('select[name="type"]');
            const options = [...select.options].map((o) => o.value);
            expect(options).toEqual(['info', 'warning', 'danger', 'success', 'quote', 'tip']);
        });

        it('onConfirm submits form and calls insert', () => {
            const insertSpy = vi.spyOn(module, 'insert');
            module.open();

            const form = document.body.querySelector('form');
            const typeSelect = form.querySelector('select[name="type"]');
            const textArea = form.querySelector('textarea[name="text"]');
            typeSelect.value = 'warning';
            textArea.value = 'test note';
            form.dispatchEvent(new Event('submit', { cancelable: true }));

            expect(insertSpy).toHaveBeenCalledWith('warning', 'test note');
        });

        it('escapes markup in the prefilled selection text', () => {
            editor.selection.getText = vi.fn(() => '</textarea><script>alert(1)</script>');
            module.open();

            const textarea = document.body.querySelector('textarea[name="text"]');
            // The raw close-tag must not break out of the textarea: the value
            // round-trips as plain text and no script element is created.
            expect(textarea.value).toBe('</textarea><script>alert(1)</script>');
            expect(document.body.querySelector('.ife-dialog__body script')).toBeNull();
        });

        it('keeps the dialog open when submitted with blank text', () => {
            module.open();

            const form = document.body.querySelector('form');
            form.querySelector('textarea[name="text"]').value = '   ';
            form.dispatchEvent(new Event('submit', { cancelable: true }));

            expect(document.body.querySelector('.ife-dialog-overlay')).not.toBeNull();
            expect(editor.root.querySelector('.note')).toBeNull();
        });

        it('closes the dialog when submitted with real text', () => {
            module.open();

            const form = document.body.querySelector('form');
            form.querySelector('textarea[name="text"]').value = 'a note';
            form.dispatchEvent(new Event('submit', { cancelable: true }));

            expect(document.body.querySelector('.ife-dialog-overlay')).toBeNull();
            expect(editor.root.querySelector('.note')).not.toBeNull();
        });
    });
});
