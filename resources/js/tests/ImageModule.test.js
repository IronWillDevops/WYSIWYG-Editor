import { describe, it, expect, beforeEach } from 'vitest';
import ImageModule from '../src/modules/ImageModule.js';
import Sanitizer from '../src/core/Sanitizer.js';

describe('ImageModule', () => {
    let editor;

    function rangeAtEndOf(root) {
        const range = document.createRange();
        range.selectNodeContents(root);
        range.collapse(false);
        return range;
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
            options: {},
            sanitizer: new Sanitizer(),
            history: { push: () => {} },
            selection: {
                save: () => {},
                restore: () => {},
                getRange: () => rangeAtEndOf(root),
                getText: () => '',
                closest: () => null,
            },
            commands: {},
            events: { emit: () => {} },
            emitChange: () => {},
        };
    });

    describe('insert', () => {
        it('blocks javascript: src and leaves img.src empty', () => {
            const module = new ImageModule(editor);
            const img = document.createElement('img');
            img.src = 'javascript:alert(1)';

            module.insert({ src: 'javascript:alert(1)', alt: '', caption: '', align: 'center', lazy: false });

            const figures = editor.root.querySelectorAll('figure.ife-image img');
            expect(figures.length).toBe(1);
            expect(figures[0].hasAttribute('src')).toBe(false);
        });

        it('allows https:// src in insert', () => {
            const module = new ImageModule(editor);
            module.insert({ src: 'https://example.com/img.jpg', alt: '', caption: '', align: 'center', lazy: false });

            const img = editor.root.querySelector('figure.ife-image img');
            expect(img).not.toBeNull();
            expect(img.getAttribute('src')).toBe('https://example.com/img.jpg');
        });
    });

    describe('update', () => {
        it('blocks javascript: src in update and preserves old src', () => {
            const module = new ImageModule(editor);
            const figure = document.createElement('figure');
            figure.className = 'ife-image ife-image--center';
            const img = document.createElement('img');
            img.src = 'https://old.example.com/img.jpg';
            figure.appendChild(img);
            editor.root.appendChild(figure);

            module.update(figure, { src: 'javascript:alert(1)', alt: 'test', caption: '', align: 'center', lazy: false });

            expect(img.getAttribute('src')).toBe('https://old.example.com/img.jpg');
        });

        it('allows https:// src in update', () => {
            const module = new ImageModule(editor);
            const figure = document.createElement('figure');
            figure.className = 'ife-image ife-image--center';
            const img = document.createElement('img');
            img.src = 'https://old.example.com/img.jpg';
            figure.appendChild(img);
            editor.root.appendChild(figure);

            module.update(figure, { src: 'https://new.example.com/img.jpg', alt: '', caption: '', align: 'center', lazy: false });

            expect(img.getAttribute('src')).toBe('https://new.example.com/img.jpg');
        });

        it('preserves other attributes when src is blocked', () => {
            const module = new ImageModule(editor);
            const figure = document.createElement('figure');
            figure.className = 'ife-image ife-image--center';
            const img = document.createElement('img');
            img.src = 'https://old.example.com/img.jpg';
            figure.appendChild(img);
            editor.root.appendChild(figure);

            module.update(figure, { src: 'javascript:alert(1)', alt: 'new alt', caption: 'new caption', align: 'left', lazy: true });

            expect(img.getAttribute('src')).toBe('https://old.example.com/img.jpg');
            expect(img.getAttribute('alt')).toBe('new alt');
            expect(img.getAttribute('loading')).toBe('lazy');
            expect(figure.className).toBe('ife-image ife-image--left');
        });
    });
});
