import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ContextMenu from '../src/modules/ContextMenu.js';

function createMockEditor() {
    const root = document.createElement('div');
    root.contentEditable = 'true';
    root.innerHTML = '<p>hello</p>';
    const wrapper = document.createElement('div');
    wrapper.appendChild(root);
    return {
        root,
        wrapper,
        history: { push: vi.fn() },
        selection: {
            save: vi.fn(),
            restore: vi.fn(),
            setRange: vi.fn(),
        },
        commands: { insertHTML: vi.fn() },
        escapeHtml: (value) => String(value ?? ''),
        module: vi.fn(() => null),
        emitChange: vi.fn(),
    };
}

describe('ContextMenu', () => {
    let editor;
    let menu;

    function openAt(target, init = {}) {
        target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 20, ...init }));
        return document.body.querySelector('.ife-context-menu');
    }

    beforeEach(() => {
        document.body.innerHTML = '';
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
        menu = new ContextMenu(editor);
    });

    afterEach(() => {
        menu.destroy();
        document.body.innerHTML = '';
    });

    it('opens a menu with the generic actions on plain content', () => {
        const el = openAt(editor.root);
        expect(el).not.toBeNull();
        const labels = [...el.querySelectorAll('.ife-context-menu__item')].map((b) => b.textContent);
        expect(labels).toContain('Cut');
        expect(labels).toContain('Copy');
        expect(labels).toContain('Paste');
        expect(labels).toContain('Select all');
        expect(editor.selection.save).toHaveBeenCalled();
    });

    it('shows image actions when right-clicking an image', () => {
        editor.root.innerHTML = '<figure class="ife-image"><img src="https://example.com/a.jpg" alt=""></figure>';
        const img = editor.root.querySelector('img');
        const el = openAt(img);
        const labels = [...el.querySelectorAll('.ife-context-menu__item')].map((b) => b.textContent);
        expect(labels).toContain('Edit image');
        expect(labels).toContain('Remove image');
    });

    it('clicking Remove image deletes the figure and emits a change', () => {
        editor.root.innerHTML = '<figure class="ife-image"><img src="https://example.com/a.jpg" alt=""></figure>';
        const img = editor.root.querySelector('img');
        const el = openAt(img);

        const remove = [...el.querySelectorAll('.ife-context-menu__item')].find((b) => b.textContent === 'Remove image');
        remove.click();

        expect(editor.root.querySelector('figure')).toBeNull();
        expect(editor.history.push).toHaveBeenCalled();
        expect(editor.emitChange).toHaveBeenCalled();
        expect(document.body.querySelector('.ife-context-menu')).toBeNull();
    });

    it('shows link actions when right-clicking an anchor', () => {
        editor.root.innerHTML = '<p><a href="https://example.com">link</a></p>';
        const anchor = editor.root.querySelector('a');
        const el = openAt(anchor);
        const labels = [...el.querySelectorAll('.ife-context-menu__item')].map((b) => b.textContent);
        expect(labels).toContain('Edit link');
        expect(labels).toContain('Remove link');
    });

    it('shows table row/column actions when right-clicking a cell', () => {
        editor.root.innerHTML = '<table class="ife-table"><tr><td>cell</td></tr></table>';
        const cell = editor.root.querySelector('td');
        const el = openAt(cell);
        const labels = [...el.querySelectorAll('.ife-context-menu__item')].map((b) => b.textContent);
        expect(labels).toContain('Row above');
        expect(labels).toContain('Delete row');
        expect(labels).toContain('Column left');
        expect(labels).toContain('Delete column');
    });

    it('closing removes the menu from the DOM', () => {
        openAt(editor.root);
        menu.close();
        expect(document.body.querySelector('.ife-context-menu')).toBeNull();
        expect(menu.menu).toBeNull();
    });

    it('Escape closes an open menu', () => {
        openAt(editor.root);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(document.body.querySelector('.ife-context-menu')).toBeNull();
    });

    it('destroy removes the document Escape listener', () => {
        const addSpy = vi.spyOn(document, 'addEventListener');
        const removeSpy = vi.spyOn(document, 'removeEventListener');
        try {
            const fresh = new ContextMenu(editor);

            const added = addSpy.mock.calls.filter(([type]) => type === 'keydown');
            expect(added.length).toBe(1);

            fresh.destroy();

            const removed = removeSpy.mock.calls.filter(([type]) => type === 'keydown');
            expect(removed.length).toBe(1);
            // Same handler reference — otherwise the listener can never be detached.
            expect(removed[0][1]).toBe(added[0][1]);
        } finally {
            addSpy.mockRestore();
            removeSpy.mockRestore();
        }
    });

    it('destroy removes contextmenu and click listeners', () => {
        const removeSpy = vi.spyOn(editor.root, 'removeEventListener');
        const docRemoveSpy = vi.spyOn(document, 'removeEventListener');
        try {
            menu.destroy();
            expect(removeSpy).toHaveBeenCalledWith('contextmenu', expect.any(Function));
            expect(docRemoveSpy).toHaveBeenCalledWith('click', expect.any(Function));
            expect(docRemoveSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        } finally {
            removeSpy.mockRestore();
            docRemoveSpy.mockRestore();
        }
    });

    it('destroy is safe to call repeatedly', () => {
        menu.destroy();
        expect(() => menu.destroy()).not.toThrow();
    });

    it('clicking Select all selects the whole document and closes', () => {
        const el = openAt(editor.root);
        const selectAll = [...el.querySelectorAll('.ife-context-menu__item')].find((b) => b.textContent === 'Select all');
        selectAll.click();

        expect(editor.selection.setRange).toHaveBeenCalled();
        expect(document.body.querySelector('.ife-context-menu')).toBeNull();
    });

    it('Paste with a rejected clipboard read does not produce an unhandled rejection', async () => {
        const readText = vi.fn(() => Promise.reject(new Error('permission denied')));
        const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { readText } });

        const unhandled = [];
        const onUnhandled = (reason) => unhandled.push(reason);
        process.on('unhandledRejection', onUnhandled);

        try {
            const el = openAt(editor.root);
            const paste = [...el.querySelectorAll('.ife-context-menu__item')].find((b) => b.textContent === 'Paste');
            paste.click();

            // Give the rejected promise a chance to surface if it were unhandled.
            await new Promise((resolve) => { setTimeout(resolve, 0); });

            expect(unhandled).toEqual([]);
            expect(editor.commands.insertHTML).not.toHaveBeenCalled();
        } finally {
            process.off('unhandledRejection', onUnhandled);
            if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
            else delete navigator.clipboard;
        }
    });

    it('Paste inserts escaped clipboard text when the read succeeds', async () => {
        const readText = vi.fn(() => Promise.resolve('pasted text'));
        const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { readText } });

        try {
            const el = openAt(editor.root);
            const paste = [...el.querySelectorAll('.ife-context-menu__item')].find((b) => b.textContent === 'Paste');
            paste.click();

            await new Promise((resolve) => { setTimeout(resolve, 0); });

            expect(editor.commands.insertHTML).toHaveBeenCalledWith('pasted text');
        } finally {
            if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
            else delete navigator.clipboard;
        }
    });

    it('Paste is a no-op when the clipboard API is unavailable', async () => {
        const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        delete navigator.clipboard;

        try {
            const el = openAt(editor.root);
            const paste = [...el.querySelectorAll('.ife-context-menu__item')].find((b) => b.textContent === 'Paste');

            expect(() => paste.click()).not.toThrow();
            await new Promise((resolve) => { setTimeout(resolve, 0); });
            expect(editor.commands.insertHTML).not.toHaveBeenCalled();
        } finally {
            if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
        }
    });

    it('actions that reference a disabled module do not throw', () => {
        editor.module = vi.fn(() => null); // disabledPlugins → module() returns null
        editor.root.innerHTML = '<table class="ife-table"><tr><td>cell</td></tr></table>';
        const cell = editor.root.querySelector('td');
        const el = openAt(cell);

        const rowBelow = [...el.querySelectorAll('.ife-context-menu__item')].find((b) => b.textContent === 'Row below');
        expect(() => rowBelow.click()).not.toThrow();
        expect(() => menu.destroy()).not.toThrow();
    });
});
