import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MediaModule from '../src/modules/MediaModule.js';

function createMockEditor() {
    return {
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
});
