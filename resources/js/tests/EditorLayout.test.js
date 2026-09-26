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

    it('anchors the resize grip to the wrapper instead of the viewport', () => {
        // Without a positioned wrapper the grip would be laid out against the
        // initial containing block and detach from the editor's bottom edge.
        expect(ruleFor('.ife-wrapper').position).toBe('relative');
    });

    it('keeps the resize grip out of the column flow so it cannot shift the bars', () => {
        // Absolute + its own fixed height: the grip adds no flex item, so the
        // toolbar, content area and status bar keep their places at any height.
        const grip = ruleFor('.ife-resize-handle');
        expect(grip.position).toBe('absolute');
        expect(grip.height).toBe('6px');
        expect(grip.cursor).toBe('ns-resize');
        // A touch drag on the grip must not be stolen by the page's pan gesture.
        expect(grip['touch-action']).toBe('none');
    });

    it('gives the grip no stylesheet height of its own', () => {
        // The grip's size is chrome; the editor's height comes from the
        // `height` option via Editor.applyHeight(), never from a second rule.
        const grip = ruleFor('.ife-resize-handle');
        expect(grip['min-height']).toBeUndefined();
        expect(grip['max-height']).toBeUndefined();
    });

    it('offers exactly one resize affordance per surface', () => {
        // Fullscreen fills the window by definition, and the source view is
        // itself a resizable textarea, so the grip is hidden in both.
        for (const selector of [
            '.ife-wrapper.ife-fullscreen .ife-resize-handle',
            '.ife-wrapper.ife-source-open .ife-resize-handle',
        ]) {
            expect(ruleFor(selector).display, selector).toBe('none');
        }
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
        await vi.waitFor(() => expect(editor.wrapper.querySelector('.ife-resize-handle')).not.toBeNull());

        const toolbar = editor.wrapper.querySelector('.ife-toolbar');
        const statusbar = editor.wrapper.querySelector('.ife-statusbar');
        const grip = editor.wrapper.querySelector('.ife-resize-handle');

        expect(editor.root.contains(toolbar)).toBe(false);
        expect(editor.root.contains(statusbar)).toBe(false);
        expect(editor.root.contains(grip)).toBe(false);
        expect(toolbar.nextElementSibling).toBe(editor.root);
        // Only chrome (the grip) may follow the status bar; the content area
        // and the source view are the things that would push it around.
        const after = statusbar.nextElementSibling;
        expect(after === null || after === grip).toBe(true);
    });

    it('mounts the resize grip beside — not inside — the scroll area', async () => {
        const editor = mount();
        await vi.waitFor(() => expect(editor.wrapper.querySelector('.ife-resize-handle')).not.toBeNull());

        const grip = editor.wrapper.querySelector('.ife-resize-handle');
        // Inside the content area the grip would scroll away with the text.
        expect(editor.root.contains(grip)).toBe(false);
        expect(editor.wrapper.contains(grip)).toBe(true);
        // Absolute positioning is what keeps it out of the column flow; the
        // order in which the async modules mount is irrelevant.
        expect(grip.style.position).toBe('');
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
        // Only the grip may follow the status bar (it is out of flow, and
        // hidden in this state), never the source view itself.
        const after = statusbar.nextElementSibling;
        expect(after === null || after.classList.contains('ife-resize-handle')).toBe(true);
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

    it('falls back to the default height when the height option is unusable', () => {
        // An unusable value used to produce an invalid `height` declaration
        // ("undefinedpx"), which the browser drops — leaving the content area
        // unbounded, i.e. no inner scrollbar and bars that travel with the page.
        for (const height of [undefined, null, '', 'tall', -10, NaN]) {
            const editor = mount({ height });
            expect(editor.root.style.maxHeight, `height: ${String(height)}`).toBe('420px');
            expect(editor.root.style.minHeight, `height: ${String(height)}`).toBe('420px');
            WysiwygEditor.destroyAll();
        }
    });

    it('accepts a height given as a CSS length or a numeric string', () => {
        // Config and .env values arrive as strings, and Blade props are often
        // quoted numbers; both must still produce a real, bounded box instead
        // of falling back to the default height.
        for (const [height, expected] of [
            ['600', '600px'],
            ['600px', '600px'],
            ['40rem', '40rem'],
            ['75vh', '75vh'],
            [600, '600px'],
        ]) {
            const editor = mount({ height });
            expect(editor.root.style.maxHeight, `height: ${String(height)}`).toBe(expected);
            expect(editor.root.style.minHeight, `height: ${String(height)}`).toBe(expected);
            WysiwygEditor.destroyAll();
        }
    });

    it('rejects a relative height, which would compute to no bound at all', () => {
        // `max-height: 100%` against a parent of `height: auto` computes to
        // `none` — the exact unbounded editor the bounds exist to prevent.
        const editor = mount({ height: '100%' });

        expect(editor.root.style.maxHeight).toBe('420px');
        expect(editor.root.style.minHeight).toBe('420px');
    });

    it('keeps the configured content height after a fullscreen round trip', async () => {
        const editor = mount();
        // The module is loaded asynchronously, so wait for it to be registered.
        await vi.waitFor(() => expect(editor.module('fullscreen')).toBeDefined());
        const fullscreen = editor.module('fullscreen');

        await fullscreen.toggle();
        expect(editor.root.style.maxHeight).toBe('none');
        expect(editor.root.style.minHeight).toBe('0');

        await fullscreen.toggle();

        expect(editor.root.style.maxHeight).toBe('420px');
        expect(editor.root.style.minHeight).toBe('420px');
    });

    it('keeps the configured content height when the exit is repeated', async () => {
        // Leaving fullscreen by the toolbar button *and* the native
        // `fullscreenchange` event both run the exit path. The bounds used to
        // be snapshotted on the way in and restored — then cleared — on the
        // way out, so the second run wrote the empty snapshot over the
        // editor's own bounds and the content area grew with the document from
        // then on: no inner scrollbar, and the toolbar and status bar scrolled
        // away with the page.
        const editor = mount();
        await vi.waitFor(() => expect(editor.module('fullscreen')).toBeDefined());
        const fullscreen = editor.module('fullscreen');

        await fullscreen.toggle();
        await fullscreen.toggle();
        fullscreen.handleChange();
        fullscreen.handleChange();

        expect(editor.root.style.maxHeight).toBe('420px');
        expect(editor.root.style.minHeight).toBe('420px');

        editor.setHTML(Array.from({ length: 50 }, (_, i) => `<p>Paragraph ${i}</p>`).join(''));
        editor.emitChange();

        expect(editor.root.style.maxHeight).toBe('420px');
    });
});
