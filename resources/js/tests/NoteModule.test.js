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
});
