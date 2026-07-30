import { describe, it, expect, beforeEach } from 'vitest';
import CodeViewModule from '../src/modules/CodeViewModule.js';

function createMockEditor() {
    const root = document.createElement('div');
    const wrapper = document.createElement('div');
    return {
        root,
        wrapper,
        history: { push: () => {} },
        events: { on: () => {}, emit: () => {} },
        sanitizer: { sanitize: (h) => h },
        getHTML: () => root.innerHTML,
        setHTML: (html) => { root.innerHTML = html; },
    };
}

describe('CodeViewModule', () => {
    let editor;
    let module;

    beforeEach(() => {
        document.body.innerHTML = '';
        editor = createMockEditor();
        editor.root.innerHTML = '<p>hello</p>';
        editor.wrapper.appendChild(editor.root);
        document.body.appendChild(editor.wrapper);
        module = new CodeViewModule(editor);
    });

    it('starts inactive', () => {
        expect(module.active).toBe(false);
    });

    it('toggle switches to source view', () => {
        module.toggle();
        expect(module.active).toBe(true);
        const source = editor.wrapper.querySelector('textarea.ife-source-view');
        expect(source).not.toBeNull();
        expect(editor.root.style.display).toBe('none');
    });

    it('toggle returns to WYSIWYG view', () => {
        module.toggle();
        module.toggle();
        expect(module.active).toBe(false);
        expect(editor.root.style.display).toBe('');
        expect(editor.wrapper.querySelector('textarea.ife-source-view')).toBeNull();
    });

    it('formatHtml indents nested tags', () => {
        const html = '<ul><li>item</li></ul>';
        const formatted = module.formatHtml(html);
        expect(formatted).toContain('  <li>');
    });

    it('formatHtml handles self-closing tags', () => {
        const html = '<p>text<br>more</p>';
        const formatted = module.formatHtml(html);
        expect(formatted).not.toContain('    ');
    });

    it('entering code view records history', () => {
        const pushSpy = vi.spyOn(editor.history, 'push');
        module.toggle();
        expect(module.active).toBe(true);
        expect(pushSpy).toHaveBeenCalled();
    });

    it('destroy removes source textarea', () => {
        module.toggle();
        module.destroy();
        expect(editor.wrapper.querySelector('textarea.ife-source-view')).toBeNull();
    });

    describe('round-trip', () => {
        it('exiting code view sets sanitized HTML and restores WYSIWYG', () => {
            module.toggle();
            const textarea = editor.wrapper.querySelector('textarea.ife-source-view');
            textarea.value = '<p>modified content</p>';

            module.toggle();

            expect(module.active).toBe(false);
            expect(editor.root.style.display).toBe('');
            expect(editor.wrapper.querySelector('textarea.ife-source-view')).toBeNull();
            expect(editor.root.innerHTML).toBe('<p>modified content</p>');
        });

        it('code view round-trip passes through sanitizer', () => {
            const sanitizeSpy = vi.spyOn(editor.sanitizer, 'sanitize').mockImplementation((h) => h);
            module.toggle();
            const textarea = editor.wrapper.querySelector('textarea.ife-source-view');
            textarea.value = '<p>source</p>';
            module.toggle();
            expect(sanitizeSpy).toHaveBeenCalledWith('<p>source</p>');
        });

        it('restores editor root display after round-trip', () => {
            module.toggle();
            expect(editor.root.style.display).toBe('none');
            module.toggle();
            expect(editor.root.style.display).toBe('');
        });
    });
});
