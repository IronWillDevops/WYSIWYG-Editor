import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcCss = (file) => resolve(__dirname, '../../css', file);

/**
 * Guards the single-source-of-truth split of the editor's styles:
 *
 *  - `wysiwyg-editor.css`  → editor UI only
 *  - `wysiwyg-content.css` → content/prose only, shared with published posts
 *
 * These tests keep content/UI styles from leaking across the boundary so a
 * published post can render identically without shipping editor-UI styles.
 */
describe('content stylesheet boundary', () => {
    const contentCss = readFileSync(srcCss('wysiwyg-content.css'), 'utf8');
    const editorCss = readFileSync(srcCss('wysiwyg-editor.css'), 'utf8');

    it('ships a standalone content css file', () => {
        expect(existsSync(srcCss('wysiwyg-content.css'))).toBe(true);
    });

    it('styles the full set of generator-produced elements in the content css', () => {
        const required = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'table.ife-table', 'blockquote',
            'ul', 'ol', 'li',
            'pre', 'code',
            'a',
        ];

        for (const sel of required) {
            expect(contentCss, `expected .ife-content ${sel} rule`).toContain(`.ife-content ${sel}`);
        }
    });

    it('does not leak editor-UI styles into the content css', () => {
        const uiSelectors = [
            '.ife-toolbar',
            '.ife-dialog',
            '.ife-emoji-picker',
            '.ife-context-menu',
            '.ife-statusbar',
            '.ife-image-resize-handle',
            '.ife-col-resize-handle',
            '.ife-source-view',
            '.ife-table-toolbar',
        ];

        for (const sel of uiSelectors) {
            expect(contentCss, `content css must not contain ${sel}`).not.toContain(sel);
        }
    });

    it('does not leak content/prose rules into the editor-ui css', () => {
        const contentSelectors = [
            '.ife-content h1',
            '.ife-content h2',
            '.ife-content blockquote',
            '.ife-content table.ife-table',
            '.ife-content ul',
            '.ife-content pre',
            '.ife-content code',
        ];

        for (const sel of contentSelectors) {
            expect(editorCss, `editor css must not style ${sel}`).not.toContain(sel);
        }
    });

    it('defines standalone variable fallbacks on .ife-content for use without a wrapper', () => {
        // The content file must declare its own --ife-* defaults so a post page
        // has no dependency on .ife-wrapper variable definitions.
        expect(contentCss).toContain('--ife-text: #1f2328');
        expect(contentCss).toContain('--ife-border: #d0d7de');
        expect(contentCss).toContain('var(--ife-accent');
    });
});
