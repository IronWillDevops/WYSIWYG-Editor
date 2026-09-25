import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import WysiwygEditor from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const editorCss = readFileSync(resolve(__dirname, '../../css/wysiwyg-editor.css'), 'utf8');

/** Returns the declaration block of the first rule matching `selector`. */
function ruleFor(selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = editorCss.match(new RegExp(`^\\s*${escaped}\\s*\\{([^}]*)\\}`, 'm'));
    expect(match, `expected a "${selector}" rule in wysiwyg-editor.css`).not.toBeNull();
    return declarations(match[1]);
}

function declarations(block) {
    return Object.fromEntries(
        block
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .split(';')
            .map((entry) => entry.split(':').map((part) => part.trim()))
            .filter(([property, value]) => property && value)
    );
}

/**
 * Guards the editor layout contract: the toolbar and status bar are pinned
 * flex items of the wrapper and `.ife-content` is the only scroll container.
 *
 * The content bounds themselves come from the `height` option as inline
 * styles (Editor.buildDom); CSS must not reintroduce a competing height for
 * the content area, otherwise the layout stops being height-stable.
 */
describe('editor layout stylesheet contract', () => {
    it('lays the editor out as a column so the bars keep their places', () => {
        const wrapper = ruleFor('.ife-wrapper');
        expect(wrapper.display).toBe('flex');
        expect(wrapper['flex-direction']).toBe('column');
        expect(wrapper.overflow).toBe('hidden');
    });

    it('never compresses the toolbar, the table toolbar or the status bar', () => {
        for (const selector of ['.ife-toolbar', '.ife-table-toolbar', '.ife-statusbar']) {
            expect(ruleFor(selector).flex, `${selector} must not shrink`).toBe('0 0 auto');
        }
    });

    it('makes the content area the single scroll container that may shrink', () => {
        // `min-height: 0` is what allows a column flex item to shrink below its
        // content; without it the content keeps its full height, the page
        // scrolls and the bars travel with it.
        const content = ruleFor('.ife-content');
        expect(content.overflow).toBe('auto');
        expect(content['min-height']).toBe('0');
        expect(content.flex).toBe('0 1 auto');
    });

    it('gives the configured height to the content area, not to the stylesheet', () => {
        // The `height` option is applied inline by Editor.buildDom; a stylesheet
        // height would either duplicate or override that single source.
        const content = ruleFor('.ife-content');
        expect(content.height).toBeUndefined();
        expect(content['max-height']).toBeUndefined();
    });

    it('lets the content fill the viewport in fullscreen', () => {
        const fullscreen = ruleFor('.ife-wrapper.ife-fullscreen .ife-content');
        expect(fullscreen.flex).toBe('1 1 auto');
        expect(fullscreen['min-height']).toBe('0');
        expect(fullscreen['max-height']).toBe('none');
    });

    it('lets the source view fill the viewport in fullscreen too', () => {
        // The source view replaces the content area inside the wrapper, so it
        // must not push the status bar out of a short fullscreen window.
        const sourceView = ruleFor('.ife-wrapper.ife-fullscreen .ife-source-view');
        expect(sourceView.flex).toBe('1 1 auto');
        expect(sourceView['min-height']).toBe('0');
    });

    it('keeps the fullscreen wrapper inside the viewport', () => {
        const fullscreen = ruleFor('.ife-wrapper.ife-fullscreen');
        expect(fullscreen.position).toBe('fixed');
        expect(fullscreen.inset).toBe('0');
    });
});

describe('editor layout with a mounted editor', () => {
    afterEach(() => {
        WysiwygEditor.destroyAll();
        document.body.innerHTML = '';
    });

    function mount(options = {}) {
        document.body.innerHTML = '<textarea id="target">start</textarea>';
        const editor = WysiwygEditor.init('#target', { height: 420, ...options });
        return editor;
    }

    it('mounts the toolbar and status bar around — not inside — the scroll area', async () => {
        const editor = mount();
        await vi.waitFor(() => expect(editor.wrapper.querySelector('.ife-statusbar')).not.toBeNull());

        const toolbar = editor.wrapper.querySelector('.ife-toolbar');
        const statusbar = editor.wrapper.querySelector('.ife-statusbar');

        expect(editor.root.contains(toolbar)).toBe(false);
        expect(editor.root.contains(statusbar)).toBe(false);
        expect(toolbar.nextElementSibling).toBe(editor.root);
        expect(statusbar.nextElementSibling).toBeNull();
    });

    it('keeps the status bar below the scroll area when the source view is open', async () => {
        const editor = mount();
        await vi.waitFor(() => expect(editor.module('codeView')).toBeDefined());
        await vi.waitFor(() => expect(editor.wrapper.querySelector('.ife-statusbar')).not.toBeNull());

        editor.module('codeView').enterCodeView();

        const source = editor.wrapper.querySelector('.ife-source-view');
        const statusbar = editor.wrapper.querySelector('.ife-statusbar');
        expect(source).not.toBeNull();
        expect(editor.root.contains(source)).toBe(false);
        expect(statusbar.nextElementSibling).toBeNull();
    });

    it('keeps the configured content height when a large amount of text is inserted', async () => {
        const editor = mount();
        // The table module used to recompute this bound from viewport geometry
        // on every change, which made the editor resize with the page scroll.
        await vi.waitFor(() => expect(editor.module('table')).toBeDefined());

        const bigHtml = Array.from(
            { length: 50 },
            (_, i) => `<p>Paragraph ${i}: ${'some words '.repeat(60)}</p>`
        ).join('');
        editor.setHTML(bigHtml);
        editor.emitChange();

        expect(editor.root.style.maxHeight).toBe('420px');
        expect(editor.root.style.minHeight).toBe('420px');
    });

    it('keeps the configured content height after the text is deleted again', async () => {
        const editor = mount();
        await vi.waitFor(() => expect(editor.module('table')).toBeDefined());

        editor.setHTML(`<p>${'some words '.repeat(500)}</p>`);
        editor.emitChange();
        editor.setHTML('<p>Short again.</p>');
        editor.emitChange();

        expect(editor.root.style.maxHeight).toBe('420px');
        expect(editor.root.style.minHeight).toBe('420px');
    });

    it('leaves the content height alone when the window is resized', async () => {
        const editor = mount();
        await vi.waitFor(() => expect(editor.module('table')).toBeDefined());

        window.dispatchEvent(new Event('resize'));

        expect(editor.root.style.maxHeight).toBe('420px');
    });
});
