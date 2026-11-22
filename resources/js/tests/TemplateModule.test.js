import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TemplateModule from '../src/modules/TemplateModule.js';

function createMockEditor() {
    const root = document.createElement('div');
    root.contentEditable = 'true';
    const wrapper = document.createElement('div');
    wrapper.appendChild(root);
    return {
        root,
        wrapper,
        selection: { save: vi.fn(), restore: vi.fn() },
        history: { push: vi.fn() },
        commands: { insertHTML: vi.fn() },
    };
}

describe('TemplateModule', () => {
    let editor;
    let module;

    beforeEach(() => {
        document.body.innerHTML = '';
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
        module = new TemplateModule(editor);
    });

    afterEach(() => {
        module.destroy();
        document.body.innerHTML = '';
    });

    it('open saves the selection so insert lands where the caret was', () => {
        module.open();

        expect(editor.selection.save).toHaveBeenCalled();
    });

    it('renders a dialog listing every built-in template', () => {
        module.open();

        const select = document.body.querySelector('select[name="template"]');
        expect(select).not.toBeNull();
        expect([...select.options].map((option) => option.value)).toEqual([
            'blank', 'article', 'twoColumns', 'checklist', 'contactForm',
        ]);
    });

    it('inserting a template pushes history before restoring the selection and inserting', () => {
        const callOrder = [];
        editor.history.push.mockImplementation(() => callOrder.push('push'));
        editor.selection.restore.mockImplementation(() => callOrder.push('restore'));
        editor.commands.insertHTML.mockImplementation(() => callOrder.push('insert'));

        module.insert('checklist');

        expect(callOrder).toEqual(['push', 'restore', 'insert']);
        expect(editor.commands.insertHTML).toHaveBeenCalledWith(
            expect.stringContaining('class="ife-checklist"')
        );
    });

    it('inserting the blank template inserts an empty paragraph', () => {
        module.insert('blank');

        expect(editor.commands.insertHTML).toHaveBeenCalledWith('<p></p>');
    });

    it('ignores an unknown template key without touching history or content', () => {
        module.insert('does-not-exist');

        expect(editor.history.push).not.toHaveBeenCalled();
        expect(editor.selection.restore).not.toHaveBeenCalled();
        expect(editor.commands.insertHTML).not.toHaveBeenCalled();
    });

    it('confirming the dialog inserts the selected template', () => {
        module.open();

        const form = document.body.querySelector('form');
        form.querySelector('select[name="template"]').value = 'article';
        form.dispatchEvent(new Event('submit', { cancelable: true }));

        expect(editor.commands.insertHTML).toHaveBeenCalledWith(
            expect.stringContaining('<h1>Title</h1>')
        );
    });

    it('closing after confirm leaves no dialog in the DOM', () => {
        module.open();
        const form = document.body.querySelector('form');
        form.dispatchEvent(new Event('submit', { cancelable: true }));

        expect(document.body.querySelector('.ife-dialog-overlay')).toBeNull();
    });

    it('destroy closes an open dialog', () => {
        module.open();

        module.destroy();

        expect(document.body.querySelector('.ife-dialog-overlay')).toBeNull();
    });

    it('destroy without an open dialog is a safe no-op', () => {
        const fresh = new TemplateModule(editor);

        expect(() => fresh.destroy()).not.toThrow();
    });
});
