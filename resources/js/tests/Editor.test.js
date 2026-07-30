import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Editor from '../src/core/Editor.js';

describe('Editor', () => {
    /** @type {HTMLTextAreaElement} */
    let textarea;

    beforeEach(() => {
        document.body.innerHTML = '<textarea></textarea>';
        textarea = document.querySelector('textarea');
        vi.spyOn(document, 'addEventListener');
        vi.spyOn(document, 'removeEventListener');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('removes keydown listener on destroy with the same function reference', () => {
        const editor = new Editor(textarea);

        const addCall = document.addEventListener.mock.calls.find(
            ([event]) => event === 'keydown'
        );
        expect(addCall).toBeDefined();
        const handler = addCall[1];

        editor.destroy();

        const removeCall = document.removeEventListener.mock.calls.find(
            ([event]) => event === 'keydown'
        );
        expect(removeCall).toBeDefined();
        expect(removeCall[1]).toBe(handler);
    });

    it('calls removeEventListener with the exact functions passed to addEventListener', () => {
        const editor = new Editor(textarea);

        const keydownAdds = document.addEventListener.mock.calls.filter(
            ([event]) => event === 'keydown'
        );
        expect(keydownAdds).toHaveLength(2);

        editor.destroy();

        const keydownRemoves = document.removeEventListener.mock.calls.filter(
            ([event]) => event === 'keydown'
        );
        expect(keydownRemoves).toHaveLength(2);
        expect(keydownRemoves[0][1]).toBe(keydownAdds[0][1]);
        expect(keydownRemoves[1][1]).toBe(keydownAdds[1][1]);
    });

    it('calls history.destroy() on editor destroy', () => {
        const editor = new Editor(textarea);
        vi.spyOn(editor.history, 'destroy');

        editor.destroy();

        expect(editor.history.destroy).toHaveBeenCalledOnce();
    });

    it('clears history timer after editor.destroy()', () => {
        const editor = new Editor(textarea);
        vi.spyOn(globalThis, 'clearTimeout');

        editor.destroy();

        expect(clearTimeout).toHaveBeenCalled();
    });

    describe('handlePaste', () => {
        it('sanitizes HTML paste and inserts via commands', () => {
            const editor = new Editor(textarea);
            const spy = vi.spyOn(editor.commands, 'insertHTML');
            const sanitizeSpy = vi.spyOn(editor.sanitizer, 'sanitize').mockReturnValue('<p>clean</p>');
            const event = { preventDefault: vi.fn(), clipboardData: { getData: (type) => type === 'text/html' ? '<script>alert(1)</script><p>hello</p>' : '' } };
            editor.handlePaste(event);
            expect(sanitizeSpy).toHaveBeenCalledWith('<script>alert(1)</script><p>hello</p>');
            expect(spy).toHaveBeenCalledWith('<p>clean</p>');
        });

        it('escapes plain text paste when no HTML is available', () => {
            const editor = new Editor(textarea);
            const spy = vi.spyOn(editor.commands, 'insertHTML');
            const event = { preventDefault: vi.fn(), clipboardData: { getData: (type) => (type === 'text/html' ? '' : type === 'text/plain' ? 'hello <world>\nline2' : '') } };
            editor.handlePaste(event);
            expect(spy).toHaveBeenCalledWith('hello &lt;world&gt;<br>line2');
        });

        it('auto-links URLs in plain text paste (escaped)', () => {
            const editor = new Editor(textarea);
            const spy = vi.spyOn(editor.commands, 'insertHTML');
            const event = { preventDefault: vi.fn(), clipboardData: { getData: (type) => type === 'text/plain' ? 'visit https://example.com today' : '' } };
            editor.handlePaste(event);
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('&lt;a href='));
        });

        it('emits paste event after insertion', () => {
            const editor = new Editor(textarea);
            const emitSpy = vi.spyOn(editor.events, 'emit');
            const event = { preventDefault: vi.fn(), clipboardData: { getData: (type) => (type === 'text/html' ? undefined : type === 'text/plain' ? 'text' : '') } };
            editor.handlePaste(event);
            expect(emitSpy).toHaveBeenCalledWith('paste', { html: undefined, text: 'text' });
        });

        it('does nothing when editor is destroyed', () => {
            const editor = new Editor(textarea);
            editor.destroy();
            const spy = vi.spyOn(editor.commands, 'insertHTML');
            const event = { preventDefault: vi.fn(), clipboardData: { getData: () => '<p>test</p>' } };
            editor.handlePaste(event);
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('handleShortcut', () => {
        let origActiveElementDescriptor;

        beforeEach(() => {
            document.execCommand = vi.fn();
        });

        function createShortcutEvent(overrides) {
            return { preventDefault: vi.fn(), key: 'b', ctrlKey: true, metaKey: false, shiftKey: false, ...overrides };
        }

        function withActiveFocus(editor) {
            Object.defineProperty(document, 'activeElement', {
                configurable: true,
                get: () => editor.root,
            });
            return editor;
        }

        afterEach(() => {
            Object.defineProperty(document, 'activeElement', {
                configurable: true,
                get: () => document.body,
            });
        });

        it('executes bold on Ctrl+B', () => {
            const editor = withActiveFocus(new Editor(textarea));
            vi.spyOn(editor.commands, 'exec');
            editor.handleShortcut(createShortcutEvent({ key: 'b' }));
            expect(editor.commands.exec).toHaveBeenCalledWith('bold');
        });

        it('executes italic on Ctrl+I', () => {
            const editor = withActiveFocus(new Editor(textarea));
            vi.spyOn(editor.commands, 'exec');
            editor.handleShortcut(createShortcutEvent({ key: 'i' }));
            expect(editor.commands.exec).toHaveBeenCalledWith('italic');
        });

        it('executes underline on Ctrl+U', () => {
            const editor = withActiveFocus(new Editor(textarea));
            vi.spyOn(editor.commands, 'exec');
            editor.handleShortcut(createShortcutEvent({ key: 'u' }));
            expect(editor.commands.exec).toHaveBeenCalledWith('underline');
        });

        it('undoes on Ctrl+Z', () => {
            const editor = withActiveFocus(new Editor(textarea));
            vi.spyOn(editor.history, 'undo');
            editor.handleShortcut(createShortcutEvent({ key: 'z' }));
            expect(editor.history.undo).toHaveBeenCalled();
        });

        it('redoes on Ctrl+Shift+Z', () => {
            const editor = withActiveFocus(new Editor(textarea));
            vi.spyOn(editor.history, 'redo');
            editor.handleShortcut(createShortcutEvent({ key: 'z', shiftKey: true }));
            expect(editor.history.redo).toHaveBeenCalled();
        });

        it('redoes on Ctrl+Y', () => {
            const editor = withActiveFocus(new Editor(textarea));
            vi.spyOn(editor.history, 'redo');
            editor.handleShortcut(createShortcutEvent({ key: 'y' }));
            expect(editor.history.redo).toHaveBeenCalled();
        });

        it('opens link module on Ctrl+K', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const linkMock = { open: vi.fn() };
            vi.spyOn(editor, 'module').mockReturnValue(linkMock);
            editor.handleShortcut(createShortcutEvent({ key: 'k' }));
            expect(linkMock.open).toHaveBeenCalled();
        });

        it('opens find module on Ctrl+F', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const findMock = { open: vi.fn() };
            vi.spyOn(editor, 'module').mockReturnValue(findMock);
            editor.handleShortcut(createShortcutEvent({ key: 'f' }));
            expect(findMock.open).toHaveBeenCalled();
        });

        it('emits save event on Ctrl+S', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const emitSpy = vi.spyOn(editor.events, 'emit');
            editor.handleShortcut(createShortcutEvent({ key: 's' }));
            expect(emitSpy).toHaveBeenCalledWith('save', expect.any(String));
        });

        it('does nothing when editor is destroyed', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.destroy();
            vi.spyOn(editor.commands, 'exec');
            editor.handleShortcut(createShortcutEvent({ key: 'b' }));
            expect(editor.commands.exec).not.toHaveBeenCalled();
        });

        it('does nothing when root does not contain active element', () => {
            const editor = new Editor(textarea);
            vi.spyOn(editor.commands, 'exec');
            editor.handleShortcut(createShortcutEvent({ key: 'b' }));
            expect(editor.commands.exec).not.toHaveBeenCalled();
        });
    });

    describe('setHTML', () => {
        it('sets sanitized HTML content', () => {
            const editor = new Editor(textarea);
            vi.spyOn(editor.sanitizer, 'sanitize').mockReturnValue('<p>sanitized</p>');
            editor.setHTML('<p>raw</p>');
            expect(editor.sanitizer.sanitize).toHaveBeenCalledWith('<p>raw</p>');
            expect(editor.root.innerHTML).toBe('<p>sanitized</p>');
        });

        it('pushes history after setting content', () => {
            const editor = new Editor(textarea);
            vi.spyOn(editor.history, 'push');
            editor.setHTML('<p>test</p>');
            expect(editor.history.push).toHaveBeenCalled();
        });
    });

    describe('clear', () => {
        it('clears editor content', () => {
            const editor = new Editor(textarea);
            editor.setHTML('<p>content</p>');
            editor.clear();
            expect(editor.root.innerHTML).toBe('');
        });

        it('clears history after clearing', () => {
            const editor = new Editor(textarea);
            vi.spyOn(editor.history, 'clear');
            editor.clear();
            expect(editor.history.clear).toHaveBeenCalled();
        });
    });

    describe('getText', () => {
        it('returns text content of the editor', () => {
            const editor = new Editor(textarea);
            editor.setHTML('<p>hello <strong>world</strong></p>');
            expect(editor.getText()).toBe('hello world');
        });

        it('returns empty string for empty editor', () => {
            const editor = new Editor(textarea);
            editor.clear();
            expect(editor.getText()).toBe('');
        });
    });

    describe('focus', () => {
        it('focuses the editor root', () => {
            const editor = new Editor(textarea);
            vi.spyOn(editor.root, 'focus');
            editor.focus();
            expect(editor.root.focus).toHaveBeenCalled();
        });
    });

    describe('getHTML', () => {
        it('returns sanitized HTML', () => {
            const editor = new Editor(textarea);
            vi.spyOn(editor.sanitizer, 'sanitize').mockReturnValue('<p>clean</p>');
            const result = editor.getHTML();
            expect(result).toBe('<p>clean</p>');
        });
    });
});
