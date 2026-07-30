import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MediaModule from '../src/modules/MediaModule.js';

function createMockEditor() {
    const wrapper = document.createElement('div');
    wrapper.scrollTop = 0;
    document.body.appendChild(wrapper);
    return {
        wrapper,
        commands: { insertHTML: vi.fn() },
        sanitizer: { sanitize: vi.fn((html) => html) },
        selection: { save: vi.fn(), restore: vi.fn() },
        on: vi.fn(),
    };
}

describe('MediaModule', () => {
    let editor;
    let module;

    beforeEach(() => {
        editor = createMockEditor();
        module = new MediaModule(editor);
    });

    afterEach(() => {
        module.destroy();
        document.body.querySelectorAll('.ife-dialog-overlay').forEach((el) => el.remove());
    });

    describe('insertVideo', () => {
        it('creates YouTube iframe for youtube.com URLs', () => {
            module.insertVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 640, 360);
            expect(editor.commands.insertHTML).toHaveBeenCalledWith(
                expect.stringContaining('youtube.com/embed/dQw4w9WgXcQ')
            );
            expect(editor.commands.insertHTML).toHaveBeenCalledWith(
                expect.stringContaining('width="640"')
            );
            expect(editor.commands.insertHTML).toHaveBeenCalledWith(
                expect.stringContaining('height="360"')
            );
        });

        it('creates YouTube iframe for youtu.be URLs', () => {
            module.insertVideo('https://youtu.be/dQw4w9WgXcQ', 640, 360);
            expect(editor.commands.insertHTML).toHaveBeenCalledWith(
                expect.stringContaining('youtube.com/embed/dQw4w9WgXcQ')
            );
        });

        it('creates Vimeo iframe for vimeo.com URLs', () => {
            module.insertVideo('https://vimeo.com/123456789', 800, 450);
            expect(editor.commands.insertHTML).toHaveBeenCalledWith(
                expect.stringContaining('player.vimeo.com/video/123456789')
            );
        });

        it('creates video tag for direct mp4 URLs', () => {
            module.insertVideo('https://example.com/video.mp4', 640, 360);
            expect(editor.commands.insertHTML).toHaveBeenCalledWith(
                expect.stringContaining('<video controls')
            );
            expect(editor.commands.insertHTML).toHaveBeenCalledWith(
                expect.stringContaining('src="https://example.com/video.mp4"')
            );
        });

        it('passes through raw iframe HTML', () => {
            const iframeHtml = '<iframe src="https://example.com/embed" width="600" height="400"></iframe>';
            module.insertVideo(iframeHtml, 600, 400);
            expect(editor.commands.insertHTML).toHaveBeenCalledWith(iframeHtml);
        });

        it('sanitizes HTML before insertion', () => {
            const sanitizeSpy = vi.spyOn(editor.sanitizer, 'sanitize');
            module.insertVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 640, 360);
            expect(sanitizeSpy).toHaveBeenCalled();
        });

        it('handles empty source gracefully', () => {
            expect(() => module.insertVideo('', 640, 360)).not.toThrow();
        });
    });

    describe('insertHorizontalRule', () => {
        it('inserts hr tag', () => {
            module.insertHorizontalRule();
            expect(editor.commands.insertHTML).toHaveBeenCalledWith('<hr>');
        });
    });

    describe('openVideo', () => {
        it('creates dialog with source input', () => {
            module.openVideo();
            const overlay = document.body.querySelector('.ife-dialog-overlay');
            expect(overlay).not.toBeNull();
            const sourceInput = overlay.querySelector('input[name="source"]');
            expect(sourceInput).not.toBeNull();
            expect(sourceInput.getAttribute('placeholder')).toContain('youtube.com');
        });

        it('saves selection before opening', () => {
            module.openVideo();
            expect(editor.selection.save).toHaveBeenCalled();
        });

        it('inserts video on form submit', () => {
            module.openVideo();
            const form = document.body.querySelector('form');
            const sourceInput = form.querySelector('input[name="source"]');
            sourceInput.value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            form.querySelector('[data-action="confirm"]').click();
            expect(editor.commands.insertHTML).toHaveBeenCalledWith(
                expect.stringContaining('youtube.com/embed/dQw4w9WgXcQ')
            );
        });
    });

    describe('openAudio', () => {
        it('creates dialog with audio URL input', () => {
            module.openAudio();
            const overlay = document.body.querySelector('.ife-dialog-overlay');
            expect(overlay).not.toBeNull();
            const sourceInput = overlay.querySelector('input[name="source"]');
            expect(sourceInput).not.toBeNull();
            expect(sourceInput.name).toBe('source');
        });

        it('saves selection before opening', () => {
            module.openAudio();
            expect(editor.selection.save).toHaveBeenCalled();
        });

        it('inserts audio element on form submit', () => {
            module.openAudio();
            const form = document.body.querySelector('form');
            const sourceInput = form.querySelector('input[name="source"]');
            sourceInput.value = 'https://example.com/audio.mp3';
            form.querySelector('[data-action="confirm"]').click();
            expect(editor.sanitizer.sanitize).toHaveBeenCalledWith(
                expect.stringContaining('<audio controls')
            );
            expect(editor.commands.insertHTML).toHaveBeenCalled();
        });

        it('inserted audio HTML contains source with correct src', () => {
            module.openAudio();
            const form = document.body.querySelector('form');
            const sourceInput = form.querySelector('input[name="source"]');
            sourceInput.value = 'https://example.com/audio.mp3';
            vi.spyOn(editor.sanitizer, 'sanitize').mockImplementation((html) => html);
            form.querySelector('[data-action="confirm"]').click();
            expect(editor.commands.insertHTML).toHaveBeenCalledWith(
                '<audio controls><source src="https://example.com/audio.mp3"></audio>'
            );
        });
    });
});
