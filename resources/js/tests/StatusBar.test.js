import { describe, it, expect, vi, beforeEach } from 'vitest';
import StatusBar from '../src/modules/StatusBar.js';

function createMockEditor(initialText = '') {
    const root = document.createElement('div');
    root.contentEditable = 'true';
    root.textContent = initialText;
    const wrapper = document.createElement('div');
    wrapper.appendChild(root);
    const handlers = {};
    const selection = {
        getBlockElement: vi.fn(() => null),
        closest: vi.fn(() => null),
    };
    return {
        root,
        wrapper,
        selection,
        options: { locale: 'en' },
        on: vi.fn((event, handler) => {
            handlers[event] = handler;
            return () => {};
        }),
        getText: vi.fn(() => root.textContent ?? ''),
        _trigger(event) {
            handlers[event]?.();
        },
    };
}

describe('StatusBar', () => {
    let editor;

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('builds DOM with element type, word and character count', () => {
        editor = createMockEditor();
        const statusBar = new StatusBar(editor);
        const el = editor.wrapper.querySelector('.ife-statusbar');
        expect(el).not.toBeNull();
        expect(el.querySelector('.ife-statusbar__left')).not.toBeNull();
        expect(el.querySelector('.ife-statusbar__right')).not.toBeNull();
        expect(editor.wrapper.contains(statusBar.el)).toBe(true);
        statusBar.destroy();
    });

    it('shows zero counts for empty content', () => {
        editor = createMockEditor('');
        const statusBar = new StatusBar(editor);
        const values = statusBar.el.querySelectorAll('.ife-statusbar__value');
        expect(values[0].textContent).toBe('Paragraph');
        expect(values[1].textContent).toBe('0');
        expect(values[2].textContent).toBe('0');
        statusBar.destroy();
    });

    it('shows correct word and character counts', () => {
        editor = createMockEditor('hello beautiful world');
        const statusBar = new StatusBar(editor);
        const values = statusBar.el.querySelectorAll('.ife-statusbar__value');
        expect(values[1].textContent).toBe('3');
        expect(values[2].textContent).toBe('21');
        statusBar.destroy();
    });

    it('updates counts on input event', () => {
        editor = createMockEditor('hello');
        const statusBar = new StatusBar(editor);
        editor.root.textContent = 'hello world';
        editor.root.dispatchEvent(new Event('input'));
        const values = statusBar.el.querySelectorAll('.ife-statusbar__value');
        expect(values[1].textContent).toBe('2');
        expect(values[2].textContent).toBe('11');
        statusBar.destroy();
    });

    it('shows Paragraph by default when no block element', () => {
        editor = createMockEditor();
        const statusBar = new StatusBar(editor);
        const values = statusBar.el.querySelectorAll('.ife-statusbar__value');
        expect(values[0].textContent).toBe('Paragraph');
        statusBar.destroy();
    });

    it('shows Heading 1 when cursor is in an h1 block', () => {
        editor = createMockEditor();
        editor.selection.getBlockElement.mockReturnValue(document.createElement('h1'));
        const statusBar = new StatusBar(editor);
        const values = statusBar.el.querySelectorAll('.ife-statusbar__value');
        expect(values[0].textContent).toBe('Heading 1');
        statusBar.destroy();
    });

    it('shows Link when cursor is inside an anchor', () => {
        editor = createMockEditor();
        editor.selection.closest.mockImplementation((sel) => sel === 'a' ? document.createElement('a') : null);
        const statusBar = new StatusBar(editor);
        const values = statusBar.el.querySelectorAll('.ife-statusbar__value');
        expect(values[0].textContent).toBe('Link');
        statusBar.destroy();
    });

    it('shows Code when cursor is inside a code element', () => {
        editor = createMockEditor();
        editor.selection.closest.mockImplementation((sel) => sel === 'code' ? document.createElement('code') : null);
        const statusBar = new StatusBar(editor);
        const values = statusBar.el.querySelectorAll('.ife-statusbar__value');
        expect(values[0].textContent).toBe('Code');
        statusBar.destroy();
    });

    it('shows Blockquote for blockquote element', () => {
        editor = createMockEditor();
        editor.selection.getBlockElement.mockReturnValue(document.createElement('blockquote'));
        const statusBar = new StatusBar(editor);
        const values = statusBar.el.querySelectorAll('.ife-statusbar__value');
        expect(values[0].textContent).toBe('Blockquote');
        statusBar.destroy();
    });

    it('shows Ordered list for li in ol', () => {
        editor = createMockEditor();
        const ol = document.createElement('ol');
        const li = document.createElement('li');
        ol.appendChild(li);
        editor.root.appendChild(ol);
        editor.selection.getBlockElement.mockReturnValue(li);
        const statusBar = new StatusBar(editor);
        const values = statusBar.el.querySelectorAll('.ife-statusbar__value');
        expect(values[0].textContent).toBe('Ordered list');
        statusBar.destroy();
    });

    it('shows Bullet list for li in ul', () => {
        editor = createMockEditor();
        const ul = document.createElement('ul');
        const li = document.createElement('li');
        ul.appendChild(li);
        editor.root.appendChild(ul);
        editor.selection.getBlockElement.mockReturnValue(li);
        const statusBar = new StatusBar(editor);
        const values = statusBar.el.querySelectorAll('.ife-statusbar__value');
        expect(values[0].textContent).toBe('Bullet list');
        statusBar.destroy();
    });

    it('updates element type on selectionchange event', () => {
        editor = createMockEditor();
        const statusBar = new StatusBar(editor);
        editor.selection.getBlockElement.mockReturnValue(document.createElement('h2'));
        editor._trigger('selectionchange');
        const values = statusBar.el.querySelectorAll('.ife-statusbar__value');
        expect(values[0].textContent).toBe('Heading 2');
        statusBar.destroy();
    });

    it('removes statusbar from DOM on destroy', () => {
        editor = createMockEditor();
        const statusBar = new StatusBar(editor);
        expect(editor.wrapper.querySelector('.ife-statusbar')).not.toBeNull();
        statusBar.destroy();
        expect(editor.wrapper.querySelector('.ife-statusbar')).toBeNull();
    });

    it('removes input listener on destroy', () => {
        editor = createMockEditor();
        const statusBar = new StatusBar(editor);
        const spy = vi.spyOn(editor.root, 'removeEventListener');
        statusBar.destroy();
        expect(spy).toHaveBeenCalledWith('input', expect.any(Function));
    });
});
