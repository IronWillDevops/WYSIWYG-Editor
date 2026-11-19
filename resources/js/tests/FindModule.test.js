import { describe, it, expect, beforeEach } from 'vitest';
import FindModule from '../src/modules/FindModule.js';

function createMockEditor(html) {
    const root = document.createElement('div');
    root.contentEditable = 'true';
    root.innerHTML = html;
    const wrapper = document.createElement('div');
    wrapper.appendChild(root);
    return {
        root,
        wrapper,
        history: { push: () => {} },
        on: () => {},
        getText: () => root.textContent ?? '',
        emitChange: () => {},
        selection: { save: vi.fn(), restore: vi.fn() },
    };
}

describe('FindModule', () => {
    let editor;
    let module;

    beforeEach(() => {
        document.body.innerHTML = '';
        editor = createMockEditor('<p>hello world</p><p>foo bar hello</p>');
        document.body.appendChild(editor.wrapper);
        module = new FindModule(editor);
    });

    it('highlights matching text', () => {
        const form = new FormData();
        form.set('query', 'hello');
        form.set('caseSensitive', '');
        form.set('useRegex', '');
        module.highlightAll(form);

        const marks = editor.root.querySelectorAll('mark.ife-search-highlight');
        expect(marks.length).toBe(2);
        marks.forEach((m) => expect(m.textContent).toBe('hello'));
    });

    it('highlights case-insensitively by default', () => {
        const form = new FormData();
        form.set('query', 'HELLO');
        form.set('caseSensitive', '');
        form.set('useRegex', '');
        module.highlightAll(form);

        const marks = editor.root.querySelectorAll('mark.ife-search-highlight');
        expect(marks.length).toBe(2);
    });

    it('respects case-sensitive flag', () => {
        const form = new FormData();
        form.set('query', 'HELLO');
        form.set('caseSensitive', 'on');
        form.set('useRegex', '');
        module.highlightAll(form);

        const marks = editor.root.querySelectorAll('mark.ife-search-highlight');
        expect(marks.length).toBe(0);
    });

    it('does not freeze or create marks on empty query', () => {
        const form = new FormData();
        form.set('query', '');
        form.set('caseSensitive', '');
        form.set('useRegex', '');
        module.highlightAll(form);

        const marks = editor.root.querySelectorAll('mark.ife-search-highlight');
        expect(marks.length).toBe(0);
    });

    it('does not freeze or create marks on whitespace-only query', () => {
        const form = new FormData();
        form.set('query', '   ');
        form.set('caseSensitive', '');
        form.set('useRegex', '');
        module.highlightAll(form);

        const marks = editor.root.querySelectorAll('mark.ife-search-highlight');
        expect(marks.length).toBe(0);
    });

    function createForm(values) {
        const f = document.createElement('form');
        Object.entries(values).forEach(([k, v]) => {
            const inp = document.createElement('input');
            inp.name = k;
            inp.value = v;
            f.appendChild(inp);
        });
        return f;
    }

    it('does not freeze on empty query in replaceAll', () => {
        const f = createForm({ query: '', replacement: 'x' });
        expect(() => module.replaceAll(f)).not.toThrow();
    });

    it('replaces all matches', () => {
        const f = createForm({ query: 'hello', replacement: 'hi' });
        module.replaceAll(f);

        expect(editor.root.textContent).toBe('hi worldfoo bar hi');
    });

    it('clears previous highlights before new search', () => {
        const form = new FormData();
        form.set('query', 'hello');
        form.set('caseSensitive', '');
        form.set('useRegex', '');
        module.highlightAll(form);
        expect(editor.root.querySelectorAll('mark.ife-search-highlight').length).toBe(2);

        form.set('query', 'world');
        module.highlightAll(form);
        const marks = editor.root.querySelectorAll('mark.ife-search-highlight');
        expect(marks.length).toBe(1);
        expect(marks[0].textContent).toBe('world');
    });

    it('uses regex pattern when useRegex is set', () => {
        const form = new FormData();
        form.set('query', 'he.+o');
        form.set('caseSensitive', '');
        form.set('useRegex', 'on');
        module.highlightAll(form);

        const marks = editor.root.querySelectorAll('mark.ife-search-highlight');
        expect(marks.length).toBe(2);
    });

    it('clears highlights on destroy', () => {
        const form = new FormData();
        form.set('query', 'hello');
        form.set('caseSensitive', '');
        form.set('useRegex', '');
        module.highlightAll(form);
        expect(editor.root.querySelectorAll('mark.ife-search-highlight').length).toBe(2);

        module.destroy();
        expect(editor.root.querySelectorAll('mark.ife-search-highlight').length).toBe(0);
    });

    it('buildRegex throws on invalid regex pattern', () => {
        const form = new FormData();
        form.set('query', '[invalid');
        form.set('caseSensitive', '');
        form.set('useRegex', 'on');
        expect(() => module.buildRegex(form)).toThrow();
    });

    it('does not highlight anything when regex is empty after trim', () => {
        const form = new FormData();
        form.set('query', '   ');
        form.set('caseSensitive', '');
        form.set('useRegex', 'on');
        module.highlightAll(form);
        expect(editor.root.querySelectorAll('mark.ife-search-highlight').length).toBe(0);
    });

    it('buildRegex returns null for empty query', () => {
        const form = new FormData();
        form.set('query', '');
        form.set('caseSensitive', '');
        form.set('useRegex', '');
        const regex = module.buildRegex(form);
        expect(regex).toBeNull();
    });

    it('does not hang on zero-length regex matches', () => {
        // `x*` matches the empty string at every index: without the
        // lastIndex skip this looped forever inside highlightAll().
        const form = new FormData();
        form.set('query', 'x*');
        form.set('caseSensitive', '');
        form.set('useRegex', 'on');
        module.highlightAll(form);

        // Zero-width matches have nothing to mark, but the original text
        // must survive untouched and the call must return.
        expect(editor.root.textContent).toBe('hello worldfoo bar hello');
        expect(editor.root.querySelectorAll('mark.ife-search-highlight').length).toBe(0);
    });

    it('does not throw when highlightAll gets an invalid regex', () => {
        const form = new FormData();
        form.set('query', '[invalid');
        form.set('caseSensitive', '');
        form.set('useRegex', 'on');
        expect(() => module.highlightAll(form)).not.toThrow();
        expect(editor.root.querySelectorAll('mark.ife-search-highlight').length).toBe(0);
    });

    it('replaceAll returns false for an invalid regex', () => {
        // useRegex must be on: without it the pattern is escaped to a literal.
        const f = createForm({ query: '[invalid', replacement: 'x', useRegex: 'on' });
        expect(module.replaceAll(f)).toBe(false);
        expect(editor.root.textContent).toBe('hello worldfoo bar hello');
    });

    it('replaceAll returns false for an empty query', () => {
        const f = createForm({ query: '', replacement: 'x' });
        expect(module.replaceAll(f)).toBe(false);
    });

    it('replaceAll returns true when it replaces something', () => {
        const f = createForm({ query: 'hello', replacement: 'hi' });
        expect(module.replaceAll(f)).toBe(true);
    });

    describe('open dialog', () => {
        it('saves the selection before opening', () => {
            module.open();
            expect(editor.selection.save).toHaveBeenCalled();
        });

        it('clears highlights and restores the selection on close', () => {
            const form = new FormData();
            form.set('query', 'hello');
            form.set('caseSensitive', '');
            form.set('useRegex', '');
            module.highlightAll(form);
            expect(editor.root.querySelectorAll('mark.ife-search-highlight').length).toBe(2);

            module.open();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            expect(editor.root.querySelectorAll('mark.ife-search-highlight').length).toBe(0);
            expect(editor.selection.restore).toHaveBeenCalled();
        });

        it('keeps the dialog open when Replace all gets an invalid pattern', () => {
            module.open();
            const form = document.body.querySelector('form');
            form.querySelector('input[name="query"]').value = '[invalid';
            form.querySelector('input[name="useRegex"]').checked = true;

            form.dispatchEvent(new Event('submit', { cancelable: true }));

            expect(document.body.querySelector('.ife-dialog-overlay')).not.toBeNull();
            module.destroy();
        });
    });
});
