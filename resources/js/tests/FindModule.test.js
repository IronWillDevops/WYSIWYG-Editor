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
});
