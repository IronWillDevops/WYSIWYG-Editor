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

/** Whether a rule for `selector` exists at all. */
function hasRule(selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^\\s*${escaped}\\s*\\{`, 'm').test(editorCss);
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
 * Guards the editor layout contract: the editor's own box is sized by the
 * `height` option (inline, from `Editor.applyHeight`), the toolbar and status
 * bar are pinned flex items of it, and `.ife-content` is the only flexible,
 * self-scrolling part.
 *
 * The bound deliberately lives on the *box*, not on the content area: a bound
 * on the innermost element is a floor nothing above it can lower, so a host box
 * shorter than the configured height pushed the whole editor — content area and
 * status bar — outside it, clipped and unreachable by the wrapper's
 * `overflow: hidden`. CSS must not reintroduce a competing height either.
 */
describe('editor layout stylesheet contract', () => {
    it('lays the editor out as a column so the bars keep their places', () => {
        const wrapper = ruleFor('.ife-wrapper');
        expect(wrapper.display).toBe('flex');
        expect(wrapper['flex-direction']).toBe('column');
        expect(wrapper.overflow).toBe('hidden');
        // `height` is then the editor's visible height, border included, so the
        // configured number needs no arithmetic to become the box it measures.
        expect(wrapper['box-sizing']).toBe('border-box');
    });

    it('never compresses the toolbar, the table toolbar or the status bar', () => {
        for (const selector of ['.ife-toolbar', '.ife-table-toolbar', '.ife-statusbar']) {
            expect(ruleFor(selector).flex, `${selector} must not shrink`).toBe('0 0 auto');
        }
    });

    it('makes the content area the single scroll container that may shrink', () => {
        // `min-height: 0` is what allows a column flex item to shrink below its
        // content; without it the content keeps its full height, the page
        // scrolls and the bars travel with it. `flex: 1 1 auto` is what makes it
        // take the space the bars leave rather than only as much as it needs.
        const content = ruleFor('.ife-content');
        expect(content.overflow).toBe('auto');
        expect(content['min-height']).toBe('0');
        // `flex-basis: 0` keeps the base size at 0 instead of the content's
        // height, which is what makes the wrapper's `min-content` floor come
        // out as the two bars rather than as the whole document.
        expect(content.flex).toBe('1 1 0');
    });

    it('gives the content area no height of its own', () => {
        // The `height` option is applied to the wrapper by Editor.applyHeight; a
        // height here would either duplicate that single source or — as a
        // min-height — reintroduce a floor no host box can lower.
        const content = ruleFor('.ife-content');
        expect(content.height).toBeUndefined();
        expect(content['max-height']).toBeUndefined();
    });

    it('lets the host box size the editor instead of the other way round', () => {
        // `.ife-wrapper` is the box the `height` option sizes; these two
        // declarations are what let a host box that is *shorter* win: it is
        // capped at the host's definite height and, as a flex item, may shrink
        // below its own content.
        const wrapper = ruleFor('.ife-wrapper');
        expect(wrapper['max-height']).toBe('100%');
        expect(wrapper.flex).toBe('1 1 auto');
    });

    it('never lets the editor shrink below its own bars', () => {
        // The content area contributes nothing to the wrapper's min-content (it
        // is a scroll container), so this floor is exactly toolbar + status bar.
        // A host box smaller than the bars themselves — a 300px panel on a phone,
        // where the toolbar wraps to several rows — used to squeeze the editing
        // area to nothing and push the status bar past the bottom of the
        // `overflow: hidden` wrapper, where it was clipped and unreachable.
        expect(ruleFor('.ife-wrapper')['min-height']).toBe('min-content');
    });

    it('uses one content rule for both normal mode and fullscreen', () => {
        // Fullscreen only changes what defines the box (`position: fixed;
        // inset: 0`); the content area's own rule already fills whatever box it
        // is given, so a mode-specific override would be duplicated CSS.
        expect(hasRule('.ife-wrapper.ife-fullscreen .ife-content')).toBe(false);
    });

    it('gives the source view the same flexible, self-scrolling box', () => {
        // It replaces the content area inside the wrapper, so the fixed
        // `min-height` it used to carry grew the editor past its own box and
        // pushed the status bar out of it.
        const sourceView = ruleFor('.ife-source-view');
        expect(sourceView.flex).toBe('1 1 auto');
        expect(sourceView['min-height']).toBe('0');
        expect(sourceView.overflow).toBe('auto');
        expect(sourceView.height).toBeUndefined();
        expect(hasRule('.ife-wrapper.ife-fullscreen .ife-source-view')).toBe(false);
    });

    it('leaves the source view no resize affordance of its own', () => {
        // The editor's grip is the single height affordance (and it is hidden
        // while the source view is open). A native `resize: vertical` could
        // drag the textarea past the bottom of the `overflow: hidden` wrapper,
        // clipping the status bar and the grip away with no way to reach them.
        expect(ruleFor('.ife-source-view').resize).toBe('none');
    });

    it('keeps the fullscreen wrapper inside the viewport', () => {
        const fullscreen = ruleFor('.ife-wrapper.ife-fullscreen');
        expect(fullscreen.position).toBe('fixed');
        expect(fullscreen.inset).toBe('0');
        // The box's height there is the one `Editor.applyHeight()` writes inline
        // (a percentage of the viewport), so a height in this rule would either
        // be a second source or — as `auto` — let the wrapper's `min-content`
        // floor win: Chromium resolves a content-based min-height on an
        // absolutely positioned box against the box's own content, which drops
        // the `inset: 0` stretch and left fullscreen as tall as the two bars.
        expect(fullscreen.height).toBeUndefined();
        expect(fullscreen['max-height']).toBeUndefined();
    });

    it('anchors the resize grip to the wrapper instead of the viewport', () => {
        // Without a positioned wrapper the grip would be laid out against the
        // initial containing block and detach from the editor's bottom edge.
        expect(ruleFor('.ife-wrapper').position).toBe('relative');
    });

    it('never lets the editor grow wider than the box that holds it', () => {
        // A long unbreakable run of text (URL, base64, minified code) used to
        // set the wrapper's max-content width, so inside a flex/grid/table-cell
        // parent the editor became as wide as that text: the bars ran off-screen
        // and the scrollbar ended up out of reach.
        const wrapper = ruleFor('.ife-wrapper');
        expect(wrapper['min-width']).toBe('0');
        expect(wrapper['max-width']).toBe('100%');
    });

    it('lets the <x-editor> wrapper element shrink too', () => {
        // The component wraps the editor in its own div, so that div — not
        // `.ife-wrapper` — is the box a flex/grid/table-cell parent sizes. It
        // has to pass that size down, which is what being a shrinkable column
        // capped at the host's definite height does.
        const host = ruleFor('div[data-wysiwyg-editor-wrapper]');
        expect(host.display).toBe('flex');
        expect(host['flex-direction']).toBe('column');
        expect(host['min-width']).toBe('0');
        expect(host['max-width']).toBe('100%');
        expect(host['min-height']).toBe('0');
        expect(host['max-height']).toBe('100%');
    });

    it('lets an unbreakable run of text wrap inside the editor surface', () => {
        // `break-word` from the shared content stylesheet leaves the box's
        // intrinsic width alone, so an auto-width table cell / float / inline
        // block got stretched to the length of a pasted URL or base64 blob.
        // `anywhere` breaks at the same places and keeps that width sane; a
        // published post renders `.ife-content` on its own and is unaffected.
        expect(ruleFor('.ife-wrapper .ife-content')['overflow-wrap']).toBe('anywhere');
        expect(ruleFor('.ife-content')['overflow-wrap']).toBeUndefined();
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
        // Fullscreen fills the window by definition, and the source view takes
        // the content area's slot (its own resize is removed in CSS), so the
        // grip is hidden in both.
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

    it('sizes the editor box, not the content area', () => {
        // One place owns the height, and it is the box the host page constrains.
        // The content area takes what is left between the two bars and scrolls.
        const editor = mount();

        expect(editor.wrapper.style.height).toBe('420px');
        expect(editor.wrapper.style.maxHeight).toBe('420px');
        expect(editor.root.style.height).toBe('');
        expect(editor.root.style.maxHeight).toBe('');
        expect(editor.root.style.minHeight).toBe('');
    });

    it('lets a host box that is shorter than the configured height win', () => {
        // The regression: a bound on the content area is a floor nothing above
        // it can lower, so a host box shorter than the configured height (a
        // panel, a grid row, a `class` on the <x-editor> component) had the whole
        // editor — content area *and* status bar — rendered outside it, clipped
        // and unreachable by the wrapper's `overflow: hidden`. The chain from
        // the host box down to the content area must therefore be shrinkable end
        // to end, with `max-height: 100%` passing the host's height down.
        for (const selector of ['div[data-wysiwyg-editor-wrapper]', '.ife-wrapper']) {
            const block = ruleFor(selector);
            expect(block['max-height'], selector).toBe('100%');
        }
        // The only height floor left in the chain is the one that lets the
        // content area and the source view yield.
        expect(ruleFor('.ife-content')['min-height']).toBe('0');
        expect(ruleFor('.ife-source-view')['min-height']).toBe('0');
    });

    it('keeps the editor height when a large amount of text is inserted', async () => {
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

        expect(editor.wrapper.style.height).toBe('420px');
        expect(editor.wrapper.style.maxHeight).toBe('420px');
    });

    it('keeps the editor height after the text is deleted again', async () => {
        const editor = mount();
        await vi.waitFor(() => expect(editor.module('table')).toBeDefined());

        editor.setHTML(`<p>${'some words '.repeat(500)}</p>`);
        editor.emitChange();
        editor.setHTML('<p>Short again.</p>');
        editor.emitChange();

        expect(editor.wrapper.style.height).toBe('420px');
        expect(editor.wrapper.style.maxHeight).toBe('420px');
    });

    it('leaves the editor height alone when the window is resized', async () => {
        const editor = mount();
        await vi.waitFor(() => expect(editor.module('table')).toBeDefined());

        window.dispatchEvent(new Event('resize'));

        expect(editor.wrapper.style.maxHeight).toBe('420px');
    });

    it('falls back to the default height when the height option is unusable', () => {
        // An unusable value used to produce an invalid `height` declaration
        // ("undefinedpx"), which the browser drops — leaving the editor
        // unbounded, i.e. no inner scrollbar and bars that travel with the page.
        for (const height of [undefined, null, '', 'tall', -10, NaN]) {
            const editor = mount({ height });
            expect(editor.wrapper.style.height, `height: ${String(height)}`).toBe('420px');
            expect(editor.wrapper.style.maxHeight, `height: ${String(height)}`).toBe('420px');
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
            expect(editor.wrapper.style.height, `height: ${String(height)}`).toBe(expected);
            expect(editor.wrapper.style.maxHeight, `height: ${String(height)}`).toBe(expected);
            WysiwygEditor.destroyAll();
        }
    });

    it('rejects a relative height, which would compute to no bound at all', () => {
        // `max-height: 100%` against a parent of `height: auto` computes to
        // `none` — the exact unbounded editor the bounds exist to prevent. The
        // stylesheet still uses `max-height: 100%` on the wrapper, but only so a
        // *definite* host height can win, which is the opposite case.
        const editor = mount({ height: '100%' });

        expect(editor.wrapper.style.height).toBe('420px');
        expect(editor.wrapper.style.maxHeight).toBe('420px');
    });

    it('hands the box over to fullscreen and takes it back on exit', async () => {
        const editor = mount();
        // The module is loaded asynchronously, so wait for it to be registered.
        await vi.waitFor(() => expect(editor.module('fullscreen')).toBeDefined());
        const fullscreen = editor.module('fullscreen');

        await fullscreen.toggle();
        // The box is handed to the viewport. It must be a percentage and not
        // `auto`: the box's floor is `min-content` (its own bars), and
        // Chromium resolves a content-based min-height on an absolutely
        // positioned box against the box's own content, which drops the
        // `position: fixed; inset: 0` stretch and left fullscreen exactly as
        // tall as the two bars.
        expect(editor.wrapper.style.height).toBe('100%');
        expect(editor.wrapper.style.maxHeight).toBe('none');

        await fullscreen.toggle();

        expect(editor.wrapper.style.height).toBe('420px');
        expect(editor.wrapper.style.maxHeight).toBe('420px');
    });

    it('keeps the editor height when the fullscreen exit is repeated', async () => {
        // Leaving fullscreen by the toolbar button *and* the native
        // `fullscreenchange` event both run the exit path. The height used to be
        // snapshotted on the way in and restored — then cleared — on the way
        // out, so the second run wrote the empty snapshot over the editor's own
        // height and the editor grew with the document from then on: no inner
        // scrollbar, and the toolbar and status bar scrolled away with the page.
        const editor = mount();
        await vi.waitFor(() => expect(editor.module('fullscreen')).toBeDefined());
        const fullscreen = editor.module('fullscreen');

        await fullscreen.toggle();
        await fullscreen.toggle();
        fullscreen.handleChange();
        fullscreen.handleChange();

        expect(editor.wrapper.style.height).toBe('420px');
        expect(editor.wrapper.style.maxHeight).toBe('420px');

        editor.setHTML(Array.from({ length: 50 }, (_, i) => `<p>Paragraph ${i}</p>`).join(''));
        editor.emitChange();

        expect(editor.wrapper.style.height).toBe('420px');
    });

    /** Selects the whole editing surface, as Ctrl+A does. */
    function selectAll(editor) {
        const range = document.createRange();
        range.selectNodeContents(editor.root);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        editor.selection.save();
    }

    it('keeps the editor height when a select-all is cleared of formatting', () => {
        // "Clear formatting" used to treat the editing surface as a formatting
        // target and strip its style attribute, which is where the height lived
        // before the bound moved to the box. The editor was then unbounded, so a
        // large paste grew it instead of scrolling inside: the page became the
        // only scroll area, the toolbar and status bar travelled with it, and no
        // scrollbar appeared.
        const editor = mount();
        editor.setHTML('<p><span style="color: red;">red</span> text</p>');
        selectAll(editor);

        editor.commands.clearInlineStyles();

        expect(editor.wrapper.style.height).toBe('420px');
        expect(editor.wrapper.style.maxHeight).toBe('420px');
    });

    it('keeps the editor height when a select-all has a colour cleared', () => {
        // Same hazard through the colour picker's "clear" control: it swept the
        // selection's common ancestor, which is the editing surface itself.
        const editor = mount();
        editor.setHTML('<p><span style="color: red;">red</span> text</p>');
        selectAll(editor);

        editor.commands.clearColor('color');

        expect(editor.wrapper.style.height).toBe('420px');
        expect(editor.wrapper.style.maxHeight).toBe('420px');
    });

    it('still clears the content formatting around a select-all', () => {
        // The sweep must keep doing its job on the content — only the editing
        // surface is off limits.
        const editor = mount();
        editor.setHTML('<p><span style="color: red;">red</span> text</p>');
        selectAll(editor);

        editor.commands.clearInlineStyles();

        // The content is still swept — the emptied span is unwrapped, its text kept.
        expect(editor.root.querySelector('span')).toBeNull();
        expect(editor.root.textContent).toContain('red');
    });

    it('restores the editor height when something drops it', () => {
        // Defence in depth: whatever clears the inline height (a plugin, a host
        // page's own script) can no longer leave the editor unbounded — the next
        // change re-asserts it, so a following large paste scrolls inside again.
        const editor = mount();
        editor.wrapper.removeAttribute('style');

        editor.setHTML(Array.from({ length: 50 }, (_, i) => `<p>Paragraph ${i}</p>`).join(''));

        expect(editor.wrapper.style.height).toBe('420px');
        expect(editor.wrapper.style.maxHeight).toBe('420px');
    });

    it('leaves the fullscreen height alone while restoring the dropped one', async () => {
        // The guard must re-assert the *current* mode's height, not always the
        // configured one: in fullscreen the box is defined by the viewport.
        const editor = mount();
        await vi.waitFor(() => expect(editor.module('fullscreen')).toBeDefined());

        await editor.module('fullscreen').toggle();
        editor.wrapper.style.height = '123px';
        editor.wrapper.style.maxHeight = '123px';

        editor.emitChange();

        expect(editor.wrapper.style.height).toBe('100%');
        expect(editor.wrapper.style.maxHeight).toBe('none');
    });

    it('keeps the editor height on every change, not just the first', async () => {
        // The height belongs to the editor, so a long editing session that
        // re-applies it (drag resize, undo/redo, formatting) must not
        // accumulate a second, competing height.
        const editor = mount();
        await vi.waitFor(() => expect(editor.module('resize')).toBeDefined());

        editor.module('resize').setHeight(600);
        expect(editor.wrapper.style.height).toBe('600px');

        editor.emitChange();
        editor.setHTML('<p>short</p>');
        editor.emitChange();

        expect(editor.wrapper.style.height).toBe('600px');
        expect(editor.wrapper.style.maxHeight).toBe('600px');
    });
});
