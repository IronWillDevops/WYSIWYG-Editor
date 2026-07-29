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

    beforeEach(() => {
        const root = document.createElement('div');
        root.contentEditable = 'true';
        root.innerHTML = '<p>hello</p>';
        const wrapper = document.createElement('div');
        wrapper.appendChild(root);
        document.body.innerHTML = '';
        document.body.appendChild(wrapper);

        editor = {
            root,
            wrapper,
            sanitizer: new Sanitizer(),
            history: { push: () => {} },
            selection: {
                save: () => {},
                restore: () => {},
                getRange: () => null,
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
});
