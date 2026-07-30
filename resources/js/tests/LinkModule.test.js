import { describe, it, expect, beforeEach } from 'vitest';
import LinkModule from '../src/modules/LinkModule.js';
import Sanitizer from '../src/core/Sanitizer.js';

describe('LinkModule', () => {
    let editor;

    function createForm(href, text) {
        const form = document.createElement('form');
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.name = 'text';
        textInput.value = text ?? 'link text';
        form.appendChild(textInput);
        const urlInput = document.createElement('input');
        urlInput.type = 'url';
        urlInput.name = 'href';
        urlInput.value = href;
        form.appendChild(urlInput);
        return form;
    }

    let savedRange = null;

    beforeEach(() => {
        const root = document.createElement('div');
        root.contentEditable = 'true';
        root.innerHTML = '<p>hello</p>';
        const wrapper = document.createElement('div');
        wrapper.appendChild(root);
        document.body.innerHTML = '';
        document.body.appendChild(wrapper);

        savedRange = null;

        editor = {
            root,
            wrapper,
            sanitizer: new Sanitizer(),
            history: { push: () => {} },
            selection: {
                save: () => {},
                restore: () => {},
                getRange: () => {
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount > 0) return sel.getRangeAt(0);
                    return null;
                },
                getText: () => window.getSelection()?.toString() ?? '',
                closest: (selector) => {
                    const sel = window.getSelection();
                    if (!sel || sel.rangeCount === 0) return null;
                    let node = sel.getRangeAt(0).commonAncestorContainer;
                    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
                    while (node && node !== wrapper) {
                        if (node instanceof HTMLElement && node.matches(selector)) return node;
                        node = node.parentElement;
                    }
                    return null;
                },
                setRange: (r) => {
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(r);
                },
            },
            commands: {},
            events: { emit: () => {} },
            emitChange: () => {},
        };
    });

    it('blocks javascript: href and falls back to #', () => {
        const module = new LinkModule(editor);
        const form = createForm('javascript:alert(1)');
        const anchor = document.createElement('a');
        anchor.textContent = 'malicious';

        module.apply(form, anchor);

        expect(anchor.getAttribute('href')).toBe('#');
    });

    it('blocks javascript: in mixed case', () => {
        const module = new LinkModule(editor);
        const form = createForm('JAVASCRIPT:alert(1)');
        const anchor = document.createElement('a');
        anchor.textContent = 'malicious';

        module.apply(form, anchor);

        expect(anchor.getAttribute('href')).toBe('#');
    });

    it('allows https:// href', () => {
        const module = new LinkModule(editor);
        const form = createForm('https://example.com');
        const anchor = document.createElement('a');
        anchor.textContent = 'safe';

        module.apply(form, anchor);

        expect(anchor.getAttribute('href')).toBe('https://example.com');
    });

    it('allows mailto: href', () => {
        const module = new LinkModule(editor);
        const form = createForm('mailto:test@example.com');
        const anchor = document.createElement('a');
        anchor.textContent = 'email';

        module.apply(form, anchor);

        expect(anchor.getAttribute('href')).toBe('mailto:test@example.com');
    });

    it('allows fragment-only href', () => {
        const module = new LinkModule(editor);
        const form = createForm('#section');
        const anchor = document.createElement('a');
        anchor.textContent = 'anchor';

        module.apply(form, anchor);

        expect(anchor.getAttribute('href')).toBe('#section');
    });

    it('allows relative path href', () => {
        const module = new LinkModule(editor);
        const form = createForm('/relative/path');
        const anchor = document.createElement('a');
        anchor.textContent = 'relative';

        module.apply(form, anchor);

        expect(anchor.getAttribute('href')).toBe('/relative/path');
    });

    it('sets anchor text from form data on apply', () => {
        const module = new LinkModule(editor);
        const form = createForm('https://example.com', 'custom text');
        const anchor = document.createElement('a');

        module.apply(form, anchor);

        expect(anchor.textContent).toBe('custom text');
    });

    describe('open', () => {
        it('creates dialog with link fields', () => {
            const module = new LinkModule(editor);
            module.open();
            const overlay = document.body.querySelector('.ife-dialog-overlay');
            expect(overlay).not.toBeNull();
            expect(overlay.querySelector('input[name="href"]')).not.toBeNull();
            expect(overlay.querySelector('input[name="text"]')).not.toBeNull();
        });

        it('pre-fills existing link data', () => {
            const anchor = document.createElement('a');
            anchor.href = 'https://example.com';
            anchor.textContent = 'example link';
            anchor.target = '_blank';
            anchor.rel = 'nofollow noopener';
            editor.root.appendChild(anchor);

            const range = document.createRange();
            range.selectNodeContents(anchor);
            editor.selection.setRange(range);

            const module = new LinkModule(editor);
            module.open();

            const hrefInput = document.body.querySelector('input[name="href"]');
            expect(hrefInput.value).toBe('https://example.com');
            const textInput = document.body.querySelector('input[name="text"]');
            expect(textInput.value).toBe('example link');
            const newTabCheckbox = document.body.querySelector('input[name="newTab"]');
            expect(newTabCheckbox.checked).toBe(true);
        });

        it('adds remove button for existing link', () => {
            const anchor = document.createElement('a');
            anchor.href = 'https://example.com';
            anchor.textContent = 'link';
            editor.root.appendChild(anchor);

            const range = document.createRange();
            range.selectNodeContents(anchor);
            editor.selection.setRange(range);

            const module = new LinkModule(editor);
            module.open();

            const removeBtn = document.body.querySelector('.ife-btn--danger');
            expect(removeBtn).not.toBeNull();
            expect(removeBtn.textContent).toBe('Remove link');
        });

        it('saves selection before opening', () => {
            const saveSpy = vi.spyOn(editor.selection, 'save');
            const module = new LinkModule(editor);
            module.open();
            expect(saveSpy).toHaveBeenCalled();
        });
    });

    describe('handleDblClick', () => {
        it('opens edit dialog when double-clicking an anchor', () => {
            const anchor = document.createElement('a');
            anchor.href = 'https://example.com';
            anchor.textContent = 'clickable';
            editor.root.appendChild(anchor);

            const setRangeSpy = vi.spyOn(editor.selection, 'setRange');

            const module = new LinkModule(editor);
            const openSpy = vi.spyOn(module, 'open');

            const dblClickEvent = new MouseEvent('dblclick', { bubbles: true });
            anchor.dispatchEvent(dblClickEvent);

            expect(openSpy).toHaveBeenCalled();
            expect(setRangeSpy).toHaveBeenCalled();
        });

        it('ignores double-click on non-anchor elements', () => {
            const p = editor.root.querySelector('p');
            const module = new LinkModule(editor);
            const openSpy = vi.spyOn(module, 'open');

            p.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

            expect(openSpy).not.toHaveBeenCalled();
        });

        it('ignores double-click when anchor is outside editor root', () => {
            const outside = document.createElement('div');
            document.body.appendChild(outside);
            const anchor = document.createElement('a');
            anchor.href = 'https://example.com';
            anchor.textContent = 'outside';
            outside.appendChild(anchor);

            const module = new LinkModule(editor);
            const openSpy = vi.spyOn(module, 'open');

            anchor.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

            expect(openSpy).not.toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('unwraps anchor but preserves text content', () => {
            const anchor = document.createElement('a');
            anchor.href = 'https://example.com';
            anchor.textContent = 'link text';
            editor.root.appendChild(anchor);

            const module = new LinkModule(editor);
            module.remove(anchor);

            expect(editor.root.querySelector('a')).toBeNull();
            expect(editor.root.textContent).toContain('link text');
        });

        it('pushes history before removing', () => {
            const pushSpy = vi.spyOn(editor.history, 'push');
            const anchor = document.createElement('a');
            anchor.href = 'https://example.com';
            anchor.textContent = 'text';
            editor.root.appendChild(anchor);

            const module = new LinkModule(editor);
            module.remove(anchor);

            expect(pushSpy).toHaveBeenCalled();
        });

        it('emits change after removal', () => {
            const emitSpy = vi.spyOn(editor, 'emitChange');
            const anchor = document.createElement('a');
            anchor.href = 'https://example.com';
            anchor.textContent = 'text';
            editor.root.appendChild(anchor);

            const module = new LinkModule(editor);
            module.remove(anchor);

            expect(emitSpy).toHaveBeenCalled();
        });
    });
});
