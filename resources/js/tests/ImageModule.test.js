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

    describe('open', () => {
        it('creates a dialog with image URL field', () => {
            const module = new ImageModule(editor);
            module.open();
            const overlay = document.body.querySelector('.ife-dialog-overlay');
            expect(overlay).not.toBeNull();
            const srcInput = overlay.querySelector('input[name="src"]');
            expect(srcInput).not.toBeNull();
            expect(srcInput.getAttribute('placeholder')).toBe('https://example.com/image.jpg');
        });

        it('pre-fills fields when editing an existing figure', () => {
            const figure = document.createElement('figure');
            figure.className = 'ife-image ife-image--center ife-image--selected';
            const img = document.createElement('img');
            img.src = 'https://example.com/photo.jpg';
            img.alt = 'test alt';
            img.loading = 'lazy';
            figure.appendChild(img);
            const caption = document.createElement('figcaption');
            caption.textContent = 'my caption';
            figure.appendChild(caption);
            editor.root.appendChild(figure);

            const module = new ImageModule(editor);
            module.open();

            const srcInput = document.body.querySelector('input[name="src"]');
            expect(srcInput.value).toBe('https://example.com/photo.jpg');
            const altInput = document.body.querySelector('input[name="alt"]');
            expect(altInput.value).toBe('test alt');
            const captionInput = document.body.querySelector('input[name="caption"]');
            expect(captionInput.value).toBe('my caption');
        });

        it('adds remove button for existing image', () => {
            const figure = document.createElement('figure');
            figure.className = 'ife-image ife-image--center ife-image--selected';
            const img = document.createElement('img');
            img.src = 'https://example.com/img.jpg';
            figure.appendChild(img);
            editor.root.appendChild(figure);

            const module = new ImageModule(editor);
            module.open();

            const removeBtn = document.body.querySelector('.ife-btn--danger');
            expect(removeBtn).not.toBeNull();
            expect(removeBtn.textContent).toBe('Remove image');
        });

        it('saves selection before opening', () => {
            const saveSpy = vi.spyOn(editor.selection, 'save');
            const module = new ImageModule(editor);
            module.open();
            expect(saveSpy).toHaveBeenCalled();
        });
    });

    describe('handleDrop', () => {
        it('uploads image file on drop', async () => {
            const module = new ImageModule(editor);
            vi.spyOn(module, 'upload').mockResolvedValue('https://example.com/uploaded.png');
            vi.spyOn(module, 'insert');

            const file = new File(['fake'], 'test.png', { type: 'image/png' });
            const event = {
                preventDefault: vi.fn(),
                dataTransfer: { files: [file] },
            };

            await module.handleDrop(event);

            expect(module.upload).toHaveBeenCalledWith(file);
            expect(module.insert).toHaveBeenCalledWith({ src: 'https://example.com/uploaded.png', alt: '', caption: '', align: 'center', lazy: true });
        });

        it('ignores non-image files', async () => {
            const module = new ImageModule(editor);
            vi.spyOn(module, 'upload');
            vi.spyOn(module, 'insert');

            const file = new File(['text'], 'test.txt', { type: 'text/plain' });
            const event = { dataTransfer: { files: [file] } };

            await module.handleDrop(event);

            expect(module.upload).not.toHaveBeenCalled();
            expect(module.insert).not.toHaveBeenCalled();
        });

        it('does nothing when no file is dropped', async () => {
            const module = new ImageModule(editor);
            vi.spyOn(module, 'upload');
            const event = { dataTransfer: { files: [] } };
            await module.handleDrop(event);
            expect(module.upload).not.toHaveBeenCalled();
        });
    });

    describe('handleResizeStart', () => {
        it('resizes image on mousemove', () => {
            const module = new ImageModule(editor);
            const img = document.createElement('img');
            img.src = 'https://example.com/img.jpg';
            img.getBoundingClientRect = vi.fn(() => ({ width: 200, height: 100 }));
            editor.root.appendChild(img);

            const resizeEvent = new MouseEvent('mousedown', { clientX: 100, clientY: 50, bubbles: true });
            module.handleResizeStart(resizeEvent, img);

            expect(img.style.width).toBe('');

            const moveEvent = new MouseEvent('mousemove', { clientX: 150, clientY: 50 });
            document.dispatchEvent(moveEvent);

            expect(parseFloat(img.style.width)).toBeGreaterThan(40);

            const upEvent = new MouseEvent('mouseup');
            document.dispatchEvent(upEvent);
        });
    });

    describe('handleMouseDown', () => {
        it('resizes image on alt+drag', () => {
            const module = new ImageModule(editor);
            const figure = document.createElement('figure');
            figure.className = 'ife-image ife-image--center';
            const img = document.createElement('img');
            img.src = 'https://example.com/img.jpg';
            img.getBoundingClientRect = vi.fn(() => ({ width: 200 }));
            figure.appendChild(img);
            editor.root.appendChild(figure);

            img.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, altKey: true, bubbles: true }));
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }));
            expect(parseFloat(img.style.width)).toBeGreaterThan(40);
            document.dispatchEvent(new MouseEvent('mouseup'));
        });

        it('ignores mousedown without altKey', () => {
            const module = new ImageModule(editor);
            const figure = document.createElement('figure');
            figure.className = 'ife-image ife-image--center';
            const img = document.createElement('img');
            img.src = 'https://example.com/img.jpg';
            figure.appendChild(img);
            editor.root.appendChild(figure);

            img.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, altKey: false, bubbles: true }));
            expect(img.style.width).toBe('');
        });
    });

    describe('upload', () => {
        beforeEach(() => {
            globalThis.fetch = vi.fn();
            globalThis.URL.createObjectURL = vi.fn(() => 'blob:test');
        });

        it('returns object URL when uploadUrl is not configured', async () => {
            const module = new ImageModule(editor);
            const file = new File(['data'], 'test.png', { type: 'image/png' });
            const result = await module.upload(file);
            expect(result).toBe('blob:test');
        });

        it('uploads file via fetch when uploadUrl is set', async () => {
            editor.options.uploadUrl = '/upload';
            const module = new ImageModule(editor);
            globalThis.fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true, url: 'https://cdn.example.com/img.png' }),
            });

            const file = new File(['data'], 'test.png', { type: 'image/png' });
            const result = await module.upload(file);

            expect(result).toBe('https://cdn.example.com/img.png');
            expect(globalThis.fetch).toHaveBeenCalledWith('/upload', expect.objectContaining({ method: 'POST' }));
        });

        it('returns null on upload failure', async () => {
            editor.options.uploadUrl = '/upload';
            const module = new ImageModule(editor);
            globalThis.fetch.mockResolvedValue({
                ok: false,
                json: () => Promise.resolve({ success: false, message: 'error' }),
            });

            const file = new File(['data'], 'test.png', { type: 'image/png' });
            const result = await module.upload(file);

            expect(result).toBeNull();
        });

        it('emits error event on upload exception', async () => {
            editor.options.uploadUrl = '/upload';
            editor.events = { emit: vi.fn() };
            const module = new ImageModule(editor);
            globalThis.fetch.mockRejectedValue(new Error('network error'));

            const file = new File(['data'], 'test.png', { type: 'image/png' });
            const result = await module.upload(file);

            expect(result).toBeNull();
            expect(editor.events.emit).toHaveBeenCalledWith('error', expect.any(Error));
        });
    });
});
