import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Editor from '../src/core/Editor.js';

// Shared helpers for the audit regression tests (the older describes keep
// their own local copies; these are used by the new blocks below).
/** Makes document.activeElement resolve to the editor root. */
function focusRoot(editor) {
    Object.defineProperty(document, 'activeElement', {
        configurable: true,
        get: () => editor.root,
    });
    return editor;
}

function blurRoot() {
    Object.defineProperty(document, 'activeElement', {
        configurable: true,
        get: () => document.body,
    });
}

/** Collapses the native selection at (node, offset). */
function setCaretAt(node, offset) {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

function enterEvent(overrides = {}) {
    return { preventDefault: vi.fn(), key: 'Enter', shiftKey: false, ...overrides };
}

function keyEvent(key, overrides = {}) {
    return {
        preventDefault: vi.fn(),
        key,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        ...overrides,
    };
}

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
        expect(keydownAdds).toHaveLength(5);

        editor.destroy();

        const keydownRemoves = document.removeEventListener.mock.calls.filter(
            ([event]) => event === 'keydown'
        );
        expect(keydownRemoves).toHaveLength(5);
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

        it('auto-links URLs in plain text paste', () => {
            const editor = new Editor(textarea);
            const spy = vi.spyOn(editor.commands, 'insertHTML');
            const event = { preventDefault: vi.fn(), clipboardData: { getData: (type) => type === 'text/plain' ? 'visit https://example.com today' : '' } };
            editor.handlePaste(event);
            // Escaping runs first so the linkified markup stays real markup:
            // the URL must arrive as an actual <a>, not as literal text.
            expect(spy).toHaveBeenCalledWith('visit <a href="https://example.com">https://example.com</a> today');
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

    describe('handleEnter', () => {
        function withActiveFocus(ed) {
            Object.defineProperty(document, 'activeElement', {
                configurable: true,
                get: () => ed.root,
            });
            return ed;
        }

        function resetActiveElement() {
            Object.defineProperty(document, 'activeElement', {
                configurable: true,
                get: () => document.body,
            });
        }

        function createEnterEvent(overrides) {
            return { preventDefault: vi.fn(), key: 'Enter', shiftKey: false, ...overrides };
        }

        it('inserts a new paragraph inside blockquote on Enter', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const blockquote = document.createElement('blockquote');
            const p = document.createElement('p');
            p.textContent = 'hello';
            blockquote.appendChild(p);
            editor.root.appendChild(blockquote);

            const range = document.createRange();
            range.setStart(p.firstChild, 5);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            expect(editor.root.querySelector('blockquote')).not.toBeNull();
            const ps = editor.root.querySelectorAll('blockquote p');
            expect(ps.length).toBe(2);
            expect(ps[0].textContent).toBe('hello');
            expect(ps[1].innerHTML).toBe('<br>');
            resetActiveElement();
        });

        it('splits text at cursor position inside blockquote on Enter', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const blockquote = document.createElement('blockquote');
            const p = document.createElement('p');
            p.textContent = 'hello world';
            blockquote.appendChild(p);
            editor.root.appendChild(blockquote);

            const range = document.createRange();
            range.setStart(p.firstChild, 6);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            const ps = editor.root.querySelectorAll('blockquote p');
            expect(ps.length).toBe(2);
            expect(ps[0].textContent).toBe('hello ');
            expect(ps[1].textContent).toBe('world');
            resetActiveElement();
        });

        it('exits blockquote when current paragraph is empty on Enter', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const blockquote = document.createElement('blockquote');
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            blockquote.appendChild(p);
            editor.root.appendChild(blockquote);

            const range = document.createRange();
            range.setStart(p, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            expect(editor.root.querySelector('blockquote')).toBeNull();
            const ps = editor.root.querySelectorAll('p');
            expect(ps.length).toBe(1);
            expect(ps[0].innerHTML).toBe('<br>');
            resetActiveElement();
        });

        it('exits blockquote from empty paragraph at end of editor', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const blockquote = document.createElement('blockquote');
            const p1 = document.createElement('p');
            p1.textContent = 'text';
            const p2 = document.createElement('p');
            p2.innerHTML = '<br>';
            blockquote.appendChild(p1);
            blockquote.appendChild(p2);
            editor.root.appendChild(blockquote);

            const range = document.createRange();
            range.setStart(p2, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            const blockquotes = editor.root.querySelectorAll('blockquote');
            expect(blockquotes.length).toBe(1);
            expect(blockquotes[0].querySelectorAll('p').length).toBe(1);
            const allP = editor.root.querySelectorAll(':scope > p');
            expect(allP.length).toBe(1);
            resetActiveElement();
        });

        it('exits <pre> when empty on Enter', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const pre = document.createElement('pre');
            pre.innerHTML = '<br>';
            editor.root.appendChild(pre);

            const range = document.createRange();
            range.setStart(pre, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            expect(editor.root.querySelector('pre')).toBeNull();
            const p = editor.root.querySelector('p');
            expect(p).not.toBeNull();
            expect(p.innerHTML).toBe('<br>');
            resetActiveElement();
        });

        it('does nothing for Shift+Enter inside blockquote', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const blockquote = document.createElement('blockquote');
            const p = document.createElement('p');
            p.textContent = 'hello';
            blockquote.appendChild(p);
            editor.root.appendChild(blockquote);

            const range = document.createRange();
            range.setStart(p.firstChild, 5);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            vi.spyOn(editor.history, 'push');
            editor.handleEnter(createEnterEvent({ shiftKey: true }));
            expect(editor.history.push).not.toHaveBeenCalled();
            expect(editor.root.querySelectorAll('blockquote p').length).toBe(1);
            resetActiveElement();
        });

        it('does nothing when editor is destroyed', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.destroy();
            const blockquote = document.createElement('blockquote');
            const p = document.createElement('p');
            p.textContent = 'hello';
            blockquote.appendChild(p);
            editor.root.appendChild(blockquote);
            vi.spyOn(editor.history, 'push');
            editor.handleEnter(createEnterEvent());
            expect(editor.history.push).not.toHaveBeenCalled();
            resetActiveElement();
        });

        it('inserts a line break inside <pre> on Enter', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const pre = document.createElement('pre');
            pre.textContent = 'code';
            editor.root.appendChild(pre);

            const range = document.createRange();
            range.setStart(pre.firstChild, 4);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            expect(editor.root.querySelector('pre')).not.toBeNull();
            expect(pre.querySelector('br')).not.toBeNull();
            resetActiveElement();
        });

        it('splits text at cursor inside <pre> on Enter', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const pre = document.createElement('pre');
            pre.textContent = 'hello world';
            editor.root.appendChild(pre);

            const range = document.createRange();
            range.setStart(pre.firstChild, 6);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            expect(pre.textContent).toBe('hello world');
            expect(pre.querySelectorAll('br').length).toBe(1);
            resetActiveElement();
        });

        it('does nothing for Shift+Enter inside <pre>', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const pre = document.createElement('pre');
            pre.textContent = 'code';
            editor.root.appendChild(pre);

            const range = document.createRange();
            range.setStart(pre.firstChild, 4);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            vi.spyOn(editor.history, 'push');
            editor.handleEnter(createEnterEvent({ shiftKey: true }));
            expect(editor.history.push).not.toHaveBeenCalled();
            expect(pre.querySelector('br')).toBeNull();
            resetActiveElement();
        });

        it('does nothing when Enter is pressed outside a <pre>, blockquote or <code>', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<p>hello</p>';

            const range = document.createRange();
            range.selectNodeContents(editor.root.firstChild);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            expect(editor.root.innerHTML).toBe('<p>hello</p>');
            resetActiveElement();
        });

        it('splits paragraph and exits inline <code> on Enter at end of code', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const p = document.createElement('p');
            p.innerHTML = 'text <code>code</code> more';
            editor.root.appendChild(p);

            const codeEl = p.querySelector('code');
            const range = document.createRange();
            range.setStart(codeEl.firstChild, 4);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            const ps = editor.root.querySelectorAll('p');
            expect(ps.length).toBe(2);
            // Everything from the caret on moves to the new paragraph: the
            // tail " more" used to stay behind (old split moved only the
            // caret's own text node), scrambling the content order.
            expect(ps[0].innerHTML).toBe('text <code>code</code>');
            expect(ps[1].textContent).toBe(' more');
            resetActiveElement();
        });

        it('splits text after inline <code> into new paragraph without code', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const p = document.createElement('p');
            p.innerHTML = 'text <code>code</code> more';
            editor.root.appendChild(p);

            const codeEl = p.querySelector('code');
            const range = document.createRange();
            range.setStart(codeEl.firstChild, 2);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            const ps = editor.root.querySelectorAll('p');
            expect(ps.length).toBe(2);
            // The tail ("de" still inside <code> plus " more") moves as one
            // unit and the <code> wrapper is dropped from the moved part —
            // not the other way round (old split left " more" behind).
            expect(ps[0].innerHTML).toBe('text <code>co</code>');
            expect(ps[1].textContent).toBe('de more');
            resetActiveElement();
        });

        it('removes empty <code> after split on Enter', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const p = document.createElement('p');
            p.innerHTML = '<code>code</code>';
            editor.root.appendChild(p);

            const codeEl = p.querySelector('code');
            const range = document.createRange();
            range.setStart(codeEl.firstChild, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            const ps = editor.root.querySelectorAll('p');
            expect(ps.length).toBe(2);
            expect(ps[0].querySelector('code')).toBeNull();
            expect(ps[1].textContent).toBe('code');
            resetActiveElement();
        });

        it('does nothing for Shift+Enter inside inline <code>', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const p = document.createElement('p');
            p.innerHTML = 'text <code>code</code>';
            editor.root.appendChild(p);

            const codeEl = p.querySelector('code');
            const range = document.createRange();
            range.setStart(codeEl.firstChild, 4);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            vi.spyOn(editor.history, 'push');
            editor.handleEnter(createEnterEvent({ shiftKey: true }));
            expect(editor.history.push).not.toHaveBeenCalled();
            const ps = editor.root.querySelectorAll('p');
            expect(ps.length).toBe(1);
            resetActiveElement();
        });

        it('exits empty note on Enter', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const note = document.createElement('div');
            note.className = 'note note-info';
            note.innerHTML = '<br>';
            editor.root.appendChild(note);

            const range = document.createRange();
            range.setStart(note, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            expect(editor.root.querySelector('.note')).toBeNull();
            const p = editor.root.querySelector('p');
            expect(p).not.toBeNull();
            expect(p.innerHTML).toBe('<br>');
            resetActiveElement();
        });

        it('splits note content on Enter', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const note = document.createElement('div');
            note.className = 'note note-tip';
            note.textContent = 'hello world';
            editor.root.appendChild(note);

            const range = document.createRange();
            range.setStart(note.firstChild, 6);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            expect(editor.root.querySelector('.note')).not.toBeNull();
            expect(editor.root.querySelector('.note').textContent).toBe('hello ');
            const p = editor.root.querySelector(':scope > p');
            expect(p).not.toBeNull();
            expect(p.textContent).toBe('world');
            resetActiveElement();
        });

        it('does nothing for Shift+Enter inside a note', () => {
            const editor = withActiveFocus(new Editor(textarea));
            const note = document.createElement('div');
            note.className = 'note note-warning';
            note.textContent = 'text';
            editor.root.appendChild(note);

            const range = document.createRange();
            range.selectNodeContents(note);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            vi.spyOn(editor.history, 'push');
            editor.handleEnter(createEnterEvent({ shiftKey: true }));
            expect(editor.history.push).not.toHaveBeenCalled();
            expect(editor.root.querySelectorAll('.note').length).toBe(1);
            resetActiveElement();
        });

        it('leaves the list on Enter at an empty list item', () => {
            // Regression: an empty <li> could never exit the list, so typing
            // (and applying headings) stayed inside it.
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<ul><li>one</li><li><br></li></ul>';
            const li = editor.root.querySelectorAll('li')[1];
            const range = document.createRange();
            range.setStart(li, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            expect(editor.root.innerHTML).toBe('<ul><li>one</li></ul><p><br></p>');
            resetActiveElement();
        });

        it('replaces an exhausted list with a paragraph on Enter', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<ul><li><br></li></ul>';
            const li = editor.root.querySelector('li');
            const range = document.createRange();
            range.setStart(li, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            expect(editor.root.innerHTML).toBe('<p><br></p>');
            resetActiveElement();
        });

        it('leaves a non-empty list item to the browser Enter', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<ul><li>one</li></ul>';
            const li = editor.root.querySelector('li');
            const range = document.createRange();
            range.setStart(li.firstChild, 3);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            const event = createEnterEvent();
            editor.handleEnter(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(editor.root.innerHTML).toBe('<ul><li>one</li></ul>');
            resetActiveElement();
        });

        it('does not intercept Enter in a list item holding embedded content', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<ul><li><input type="checkbox"> Task</li></ul>';
            const li = editor.root.querySelector('li');
            const range = document.createRange();
            range.setStart(li, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            const event = createEnterEvent();
            editor.handleEnter(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
            resetActiveElement();
        });

        it('exits a nested list without breaking out of the parent item', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<ul><li>outer<ul><li><br></li></ul></li></ul>';
            const inner = editor.root.querySelectorAll('li')[1];
            const range = document.createRange();
            range.setStart(inner, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            expect(editor.root.innerHTML).toBe('<ul><li>outer<p><br></p></li></ul>');
            resetActiveElement();
        });

        it('exits a list inside a blockquote without nesting a paragraph in the list', () => {
            // Regression: the blockquote branch treated the <li> as the block
            // and injected a <p> straight into the <ul>.
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<blockquote><ul><li>hello</li></ul></blockquote>';
            const li = editor.root.querySelector('li');
            const range = document.createRange();
            range.setStart(li.firstChild, 5);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            const event = createEnterEvent();
            editor.handleEnter(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(editor.root.innerHTML).toBe('<blockquote><ul><li>hello</li></ul></blockquote>');
            resetActiveElement();
        });

        it('exits an empty list item inside a blockquote', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<blockquote><ul><li>one</li><li><br></li></ul></blockquote>';
            const li = editor.root.querySelectorAll('li')[1];
            const range = document.createRange();
            range.setStart(li, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            editor.handleEnter(createEnterEvent());
            expect(editor.root.innerHTML).toBe('<blockquote><ul><li>one</li></ul><p><br></p></blockquote>');
            resetActiveElement();
        });

        it('does not intercept Shift+Enter in a list item', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<ul><li><br></li></ul>';
            const li = editor.root.querySelector('li');
            const range = document.createRange();
            range.setStart(li, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            vi.spyOn(editor.history, 'push');
            const event = createEnterEvent({ shiftKey: true });
            editor.handleEnter(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(editor.history.push).not.toHaveBeenCalled();
            expect(editor.root.innerHTML).toBe('<ul><li><br></li></ul>');
            resetActiveElement();
        });
    });

    describe('handleBackspace in lists', () => {
        function withActiveFocus(ed) {
            Object.defineProperty(document, 'activeElement', {
                configurable: true,
                get: () => ed.root,
            });
            return ed;
        }

        function resetActiveElement() {
            Object.defineProperty(document, 'activeElement', {
                configurable: true,
                get: () => document.body,
            });
        }

        function createBackspaceEvent(overrides) {
            return {
                preventDefault: vi.fn(),
                key: 'Backspace',
                ctrlKey: false,
                metaKey: false,
                altKey: false,
                ...overrides,
            };
        }

        function setCaret(editor, node, offset) {
            const range = document.createRange();
            range.setStart(node, offset);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }

        it('removes an empty list item and keeps the list', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<ul><li>one</li><li><br></li></ul>';
            setCaret(editor, editor.root.querySelectorAll('li')[1], 0);

            editor.handleBackspace(createBackspaceEvent());
            expect(editor.root.innerHTML).toBe('<ul><li>one</li></ul>');
            resetActiveElement();
        });

        it('collapses an emptied list into a paragraph', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<ul><li><br></li></ul>';
            setCaret(editor, editor.root.querySelector('li'), 0);

            editor.handleBackspace(createBackspaceEvent());
            expect(editor.root.innerHTML).toBe('<p><br></p>');
            resetActiveElement();
        });

        it('does not intercept Backspace in a non-empty list item', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<ul><li>one</li></ul>';
            setCaret(editor, editor.root.querySelector('li'), 0);

            const event = createBackspaceEvent();
            editor.handleBackspace(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(editor.root.innerHTML).toBe('<ul><li>one</li></ul>');
            resetActiveElement();
        });

        it('does not intercept Backspace outside a list', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<p>hello</p>';
            setCaret(editor, editor.root.querySelector('p').firstChild, 0);

            const event = createBackspaceEvent();
            editor.handleBackspace(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
            resetActiveElement();
        });

        it('ignores Backspace with a modifier or a selection', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<ul><li><br></li></ul>';
            setCaret(editor, editor.root.querySelector('li'), 0);

            const modified = createBackspaceEvent({ ctrlKey: true });
            editor.handleBackspace(modified);
            expect(modified.preventDefault).not.toHaveBeenCalled();

            const sel = window.getSelection();
            const range = sel.getRangeAt(0);
            range.setEnd(editor.root, editor.root.childNodes.length);
            const selected = createBackspaceEvent();
            editor.handleBackspace(selected);
            expect(selected.preventDefault).not.toHaveBeenCalled();
            expect(editor.root.querySelector('ul')).not.toBeNull();
            resetActiveElement();
        });
    });

    describe('handleTab in lists', () => {
        function withActiveFocus(ed) {
            Object.defineProperty(document, 'activeElement', {
                configurable: true,
                get: () => ed.root,
            });
            return ed;
        }

        function resetActiveElement() {
            Object.defineProperty(document, 'activeElement', {
                configurable: true,
                get: () => document.body,
            });
        }

        function createTabEvent(overrides) {
            return { preventDefault: vi.fn(), key: 'Tab', shiftKey: false, ...overrides };
        }

        function setCaret(editor, node, offset) {
            const range = document.createRange();
            range.setStart(node, offset);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }

        it('indents the list item on Tab', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<ul><li>one</li><li>two</li></ul>';
            setCaret(editor, editor.root.querySelectorAll('li')[1].firstChild, 3);

            editor.handleTab(createTabEvent());
            expect(editor.root.innerHTML).toBe('<ul><li>one<ul><li>two</li></ul></li></ul>');
            resetActiveElement();
        });

        it('outdents the list item on Shift+Tab', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<ul><li>one<ul><li>two</li></ul></li></ul>';
            setCaret(editor, editor.root.querySelectorAll('li')[1].firstChild, 3);

            editor.handleTab(createTabEvent({ shiftKey: true }));
            expect(editor.root.innerHTML).toBe('<ul><li>one</li><li>two</li></ul>');
            resetActiveElement();
        });

        it('leaves Tab alone outside a list', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<p>hello</p>';
            setCaret(editor, editor.root.querySelector('p').firstChild, 2);

            const event = createTabEvent();
            editor.handleTab(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
            resetActiveElement();
        });

        it('does not intercept Tab while a table owns the caret', () => {
            const editor = withActiveFocus(new Editor(textarea));
            editor.root.innerHTML = '<table><tbody><tr><td>cell</td></tr></tbody></table><ul><li>one</li></ul>';
            vi.spyOn(editor, 'module').mockReturnValue({ getCurrentTable: () => editor.root.querySelector('table') });
            setCaret(editor, editor.root.querySelector('li').firstChild, 3);

            const event = createTabEvent();
            editor.handleTab(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
            resetActiveElement();
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
            expect(editor.root.innerHTML).toBe('<div><br></div>');
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

    describe('save/load round-trip', () => {
        it('preserves CSS-based formatting through getHTML/setHTML', () => {
            const editor = new Editor(textarea);
            const html = '<p>hello <span style="font-weight: bold;">world</span></p>';
            editor.setHTML(html);
            const saved = editor.getHTML();
            editor.setHTML(saved);
            const reloaded = editor.getHTML();
            expect(reloaded).toContain('font-weight');
            expect(reloaded).toContain('hello');
            expect(reloaded).toContain('world');
        });

        it('preserves legacy <b> tags through getHTML/setHTML', () => {
            const editor = new Editor(textarea);
            const html = '<p><b>bold text</b></p>';
            editor.setHTML(html);
            const saved = editor.getHTML();
            expect(saved).toContain('<b>');
            editor.setHTML(saved);
            const reloaded = editor.getHTML();
            expect(reloaded).toContain('<b>');
            expect(reloaded).toContain('bold text');
        });

        it('preserves legacy <i> tags through getHTML/setHTML', () => {
            const editor = new Editor(textarea);
            const html = '<p><i>italic text</i></p>';
            editor.setHTML(html);
            const saved = editor.getHTML();
            expect(saved).toContain('<i>');
            editor.setHTML(saved);
            const reloaded = editor.getHTML();
            expect(reloaded).toContain('<i>');
            expect(reloaded).toContain('italic text');
        });

        it('preserves legacy <strike> tags through getHTML/setHTML', () => {
            const editor = new Editor(textarea);
            const html = '<p><strike>struck text</strike></p>';
            editor.setHTML(html);
            const saved = editor.getHTML();
            expect(saved).toContain('<strike>');
            editor.setHTML(saved);
            const reloaded = editor.getHTML();
            expect(reloaded).toContain('<strike>');
        });

        it('preserves <font> tags with color through getHTML/setHTML', () => {
            const editor = new Editor(textarea);
            const html = '<p><font color="#ff0000">red text</font></p>';
            editor.setHTML(html);
            const saved = editor.getHTML();
            expect(saved).toContain('<font');
            expect(saved).toContain('color');
            editor.setHTML(saved);
            const reloaded = editor.getHTML();
            expect(reloaded).toContain('<font');
            expect(reloaded).toContain('red text');
        });

        it('preserves bold through textarea sync cycle', () => {
            const editor = new Editor(textarea);
            editor.setHTML('<p><b>bold</b></p>');
            editor.syncTextarea();
            const savedValue = textarea.value;
            expect(savedValue).toContain('<b>');
            expect(savedValue).toContain('bold');
        });

        it('preserves mixed formatting through full cycle', () => {
            const editor = new Editor(textarea);
            const html = '<p><b>bold</b> <i>italic</i> <u>underline</u> <strong>strong</strong> <em>emphasis</em></p>';
            editor.setHTML(html);
            const saved = editor.getHTML();
            editor.setHTML(saved);
            const reloaded = editor.getHTML();
            expect(reloaded).toContain('<b>');
            expect(reloaded).toContain('<i>');
            expect(reloaded).toContain('<u>');
            expect(reloaded).toContain('<strong>');
            expect(reloaded).toContain('<em>');
        });

        it('preserves nested list structure and the heading after it', () => {
            const editor = new Editor(textarea);
            const html = '<ul><li>one<ul><li>two</li></ul></li><li>three</li></ul><h2>after list</h2>';
            editor.setHTML(html);
            const saved = editor.getHTML();
            expect(saved).toBe(html);
            editor.setHTML(saved);
            expect(editor.getHTML()).toBe(html);
        });

        it('preserves checklist checkboxes through a full cycle', () => {
            const editor = new Editor(textarea);
            const html = '<ul class="ife-checklist"><li><input type="checkbox" checked> Item</li></ul>';
            editor.setHTML(html);
            expect(editor.getHTML()).toContain('type="checkbox"');
            expect(editor.getHTML()).toContain('checked');
        });
    });

    // ------------------------------------------------------------------
    // Regression tests — functional audit
    // ------------------------------------------------------------------

    describe('checklist checkboxes', () => {
        it('flips the checked attribute on click and records a change', () => {
            const editor = new Editor(textarea);
            editor.root.innerHTML = '<ul class="ife-checklist"><li><input type="checkbox"> Task</li></ul>';
            const checkbox = editor.root.querySelector('input[type="checkbox"]');
            const seen = [];
            editor.on('change', (html) => seen.push(html));

            editor.handleClick({ target: checkbox, preventDefault: vi.fn() });
            expect(checkbox.hasAttribute('checked')).toBe(true);

            editor.handleClick({ target: checkbox, preventDefault: vi.fn() });
            expect(checkbox.hasAttribute('checked')).toBe(false);
            // Both flips are undoable/observable changes.
            expect(seen).toHaveLength(2);
        });

        it('a real click keeps the attribute, the property and the HTML in sync', () => {
            const editor = new Editor(textarea);
            editor.root.innerHTML = '<ul class="ife-checklist"><li><input type="checkbox"> Task</li></ul>';
            const checkbox = editor.root.querySelector('input[type="checkbox"]');

            checkbox.click();
            // The attribute drives serialization; jsdom's legacy activation
            // double-toggle makes the live property unreliable here, and in
            // real browsers contenteditable checkboxes never self-toggle.
            expect(checkbox.hasAttribute('checked')).toBe(true);
            expect(editor.getHTML()).toContain('checked');

            checkbox.click();
            expect(checkbox.hasAttribute('checked')).toBe(false);
            expect(editor.getHTML()).not.toContain('checked');
        });

        it('ignores clicks that are not on a checkbox', () => {
            const editor = new Editor(textarea);
            editor.root.innerHTML = '<p>hello</p>';
            const event = {
                target: editor.root.querySelector('p'),
                preventDefault: vi.fn(),
            };

            editor.handleClick(event);

            expect(event.preventDefault).not.toHaveBeenCalled();
        });
    });

    describe('drop indicator', () => {
        it('shows the indicator on dragover and removes it on drop', () => {
            const editor = new Editor(textarea);
            editor.handleDragOver();
            expect(editor.wrapper.querySelector('.ife-drop-cursor')).not.toBeNull();

            const seen = [];
            editor.on('drop', (event) => seen.push(event));
            const event = { dataTransfer: null };
            editor.handleDrop(event);

            expect(editor.wrapper.querySelector('.ife-drop-cursor')).toBeNull();
            expect(seen).toEqual([event]);
        });

        it('keeps the indicator while the drag is still inside the editor', () => {
            const editor = new Editor(textarea);
            editor.handleDragOver();

            editor.handleDragLeave({ relatedTarget: editor.wrapper });

            expect(editor.wrapper.querySelector('.ife-drop-cursor')).not.toBeNull();
            editor.destroy();
        });

        it('detaches the root click/drop/drag listeners with the same references on destroy', () => {
            const addSpy = vi.spyOn(Element.prototype, 'addEventListener');
            const removeSpy = vi.spyOn(Element.prototype, 'removeEventListener');
            const watched = ['click', 'drop', 'dragover', 'dragleave'];

            const editor = new Editor(textarea);
            const added = addSpy.mock.calls.filter(([type]) => watched.includes(type));
            expect(added).toHaveLength(4);

            editor.destroy();

            for (const [type, handler] of added) {
                const removed = removeSpy.mock.calls.find(
                    ([t, h]) => t === type && h === handler
                );
                expect(removed, `listener "${type}" not removed with the same reference`).toBeDefined();
            }
        });
    });

    describe('handleBackspace with the Delete key', () => {
        afterEach(blurRoot);

        it('removes the empty list item forward and lands the caret in the next one', () => {
            const editor = focusRoot(new Editor(textarea));
            editor.root.innerHTML = '<ul><li><br></li><li>two</li></ul>';
            const two = editor.root.querySelectorAll('li')[1];
            setCaretAt(editor.root.querySelector('li'), 0);

            const event = keyEvent('Delete');
            editor.handleBackspace(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(editor.root.innerHTML).toBe('<ul><li>two</li></ul>');
            const range = window.getSelection().getRangeAt(0);
            expect(range.startContainer).toBe(two);
            expect(range.startOffset).toBe(0);
        });

        it('collapses an emptied list into a paragraph on Delete', () => {
            const editor = focusRoot(new Editor(textarea));
            editor.root.innerHTML = '<ul><li><br></li></ul>';
            setCaretAt(editor.root.querySelector('li'), 0);

            editor.handleBackspace(keyEvent('Delete'));

            expect(editor.root.innerHTML).toBe('<p><br></p>');
        });

        it('does not intercept Delete outside a list', () => {
            const editor = focusRoot(new Editor(textarea));
            editor.root.innerHTML = '<p>hello</p>';
            setCaretAt(editor.root.querySelector('p').firstChild, 0);

            const event = keyEvent('Delete');
            editor.handleBackspace(event);

            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(editor.root.innerHTML).toBe('<p>hello</p>');
        });

        it('ignores Delete with a modifier key', () => {
            const editor = focusRoot(new Editor(textarea));
            editor.root.innerHTML = '<ul><li><br></li><li>two</li></ul>';
            setCaretAt(editor.root.querySelector('li'), 0);

            const event = keyEvent('Delete', { ctrlKey: true });
            editor.handleBackspace(event);

            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(editor.root.innerHTML).toBe('<ul><li><br></li><li>two</li></ul>');
        });
    });

    describe('headings on Enter', () => {
        afterEach(blurRoot);

        it('splits a heading at the caret into a new paragraph', () => {
            const editor = focusRoot(new Editor(textarea));
            editor.root.innerHTML = '<h2>Title</h2>';
            setCaretAt(editor.root.querySelector('h2').firstChild, 5);

            editor.handleEnter(enterEvent());

            expect(editor.root.innerHTML).toBe('<h2>Title</h2><p><br></p>');
        });

        it('opens an empty paragraph above the heading when Enter is pressed at its start', () => {
            const editor = focusRoot(new Editor(textarea));
            editor.root.innerHTML = '<h2>Title</h2>';
            setCaretAt(editor.root.querySelector('h2').firstChild, 0);

            editor.handleEnter(enterEvent());

            // The content keeps its own block type — browser Enter semantics.
            expect(editor.root.innerHTML).toBe('<p><br></p><h2>Title</h2>');
        });

        it('turns an exhausted heading back into a plain paragraph', () => {
            const editor = focusRoot(new Editor(textarea));
            editor.root.innerHTML = '<h2><br></h2>';
            setCaretAt(editor.root.querySelector('h2'), 0);

            editor.handleEnter(enterEvent());

            expect(editor.root.innerHTML).toBe('<p><br></p>');
        });
    });

    describe('content order when splitting a block', () => {
        afterEach(blurRoot);

        it('keeps every inline node in order when Enter splits a blockquote line', () => {
            const editor = focusRoot(new Editor(textarea));
            editor.root.innerHTML = '<blockquote><p>ab<strong>cd</strong>ef</p></blockquote>';
            const p = editor.root.querySelector('p');
            setCaretAt(p.querySelector('strong').firstChild, 1);

            editor.handleEnter(enterEvent());

            // The old per-text-node split scrambled this: only the caret's
            // own text node moved, leaving " ef" behind and dropping "d".
            expect(editor.root.innerHTML).toBe(
                '<blockquote><p>ab<strong>c</strong></p><p><strong>d</strong>ef</p></blockquote>'
            );
        });

        it('never leaves content behind when Enter is pressed at the end of a block', () => {
            const editor = focusRoot(new Editor(textarea));
            editor.root.innerHTML = '<blockquote><p>hello</p></blockquote>';
            setCaretAt(editor.root.querySelector('p').firstChild, 5);

            editor.handleEnter(enterEvent());

            // The caret's tail is empty: the new block must still be a live
            // <p><br></p>, not a dead <p></p> the caret cannot enter.
            expect(editor.root.innerHTML).toBe(
                '<blockquote><p>hello</p><p><br></p></blockquote>'
            );
        });
    });

    describe('undo/redo with pending records', () => {
        it('undo right after typing flushes the pending snapshot instead of skipping it', () => {
            const editor = new Editor(textarea);
            editor.setHTML('<p>one</p>');
            editor.root.innerHTML = '<p>one two</p>';
            editor.emitChange(); // debounced record still pending (300 ms)

            editor.undo();

            // One step back to "one" — not two steps (seed) and not "one two".
            // (editor.undo() re-records via emitChange, so a fresh debounce
            // timer is expected to be pending here; only the content matters.)
            expect(editor.root.innerHTML).toBe('<p>one</p>');
        });

        it('redo settles its own pending record and returns the undone state', () => {
            const editor = new Editor(textarea);
            editor.setHTML('<p>one</p>');
            editor.root.innerHTML = '<p>two</p>';
            editor.emitChange();

            editor.undo();
            editor.redo();

            expect(editor.root.innerHTML).toBe('<p>two</p>');
        });

        it('undo and redo emit change so external consumers stay in sync', () => {
            const editor = new Editor(textarea);
            editor.setHTML('<p>one</p>');
            const seen = [];
            editor.on('change', (html) => seen.push(html));

            editor.undo();
            expect(seen).toHaveLength(1);
            expect(seen[0]).toBe(editor.getHTML());

            editor.redo();
            expect(seen).toHaveLength(2);
            expect(seen[1]).toBe(editor.getHTML());
        });

        it('records a manual DOM mutation made through emitChange as one undo step', () => {
            const editor = new Editor(textarea);
            editor.setHTML('<p>before</p>');
            editor.root.innerHTML = '<p>after</p>';
            editor.emitChange();
            editor.history.flushPendingRecord();

            editor.undo();
            expect(editor.root.innerHTML).toBe('<p>before</p>');
            editor.redo();
            expect(editor.root.innerHTML).toBe('<p>after</p>');
        });

        it('records native input events as a history step', () => {
            const editor = new Editor(textarea);
            editor.setHTML('<p>one</p>');
            editor.root.innerHTML = '<p>one two</p>';
            editor.root.dispatchEvent(new Event('input', { bubbles: true }));
            editor.history.flushPendingRecord();

            editor.undo();
            expect(editor.root.innerHTML).toBe('<p>one</p>');
        });
    });

    describe('caret bookmarks', () => {
        it('restores a caret saved in an empty block at that block, not at the document end', () => {
            const editor = new Editor(textarea);
            editor.root.innerHTML = '<p>one</p><p><br></p><p>two</p>';
            const emptyP = editor.root.querySelectorAll('p')[1];
            const range = document.createRange();
            range.setStart(emptyP, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            const bookmark = editor.saveSelectionBookmark();
            // The empty block starts at character 3; the document ends at 6.
            expect(bookmark.start).toBe(3);
            expect(bookmark.end).toBe(3);

            // Simulate the innerHTML swap undo performs.
            editor.root.innerHTML = '<p>one</p><p><br></p><p>two</p>';
            editor.restoreSelectionBookmark(bookmark);

            const restored = window.getSelection().getRangeAt(0);
            expect(restored.startContainer.textContent).toBe('one');
            expect(restored.startOffset).toBe(3);
        });
    });
});
