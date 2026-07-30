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
    });
});
