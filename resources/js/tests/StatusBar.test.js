import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import StatusBar from '../src/modules/StatusBar.js';

function createMockEditor(initialText = '') {
    const root = document.createElement('div');
    root.contentEditable = 'true';
    root.textContent = initialText;
    const wrapper = document.createElement('div');
    wrapper.appendChild(root);
    const handlers = {};
    return {
        root,
        wrapper,
        on: vi.fn((event, handler) => {
            handlers[event] = handler;
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

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('builds DOM with word and character count', () => {
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
        expect(values[0].textContent).toBe('0');
        expect(values[1].textContent).toBe('0');
        statusBar.destroy();
    });

    it('shows correct word and character counts', () => {
        editor = createMockEditor('hello beautiful world');
        const statusBar = new StatusBar(editor);
        const values = statusBar.el.querySelectorAll('.ife-statusbar__value');
        expect(values[0].textContent).toBe('3');
        expect(values[1].textContent).toBe('21');
        statusBar.destroy();
    });

    it('updates counts on input event', () => {
        editor = createMockEditor('hello');
        const statusBar = new StatusBar(editor);
        editor.root.textContent = 'hello world';
        editor.root.dispatchEvent(new Event('input'));
        const values = statusBar.el.querySelectorAll('.ife-statusbar__value');
        expect(values[0].textContent).toBe('2');
        expect(values[1].textContent).toBe('11');
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
