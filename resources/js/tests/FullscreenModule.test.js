import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FullscreenModule from '../src/modules/FullscreenModule.js';

function createMockEditor() {
    const wrapper = document.createElement('div');
    wrapper.className = 'ife-wrapper';
    const root = document.createElement('div');
    root.className = 'ife-content';
    wrapper.appendChild(root);
    return {
        wrapper,
        root,
        // The editor owns the content-area height (the `height` option); the
        // module only asks it to lift or re-apply those bounds.
        applyHeight: vi.fn(),
        on: vi.fn(),
    };
}

describe('FullscreenModule', () => {
    let editor;
    let module;

    beforeEach(() => {
        document.body.innerHTML = '';
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
        module = new FullscreenModule(editor);
    });

    afterEach(() => {
        module.destroy();
        document.body.innerHTML = '';
    });

    it('starts inactive', () => {
        expect(module.active).toBe(false);
    });

    it('enter adds fullscreen class', async () => {
        await module.enter();
        expect(editor.wrapper.classList.contains('ife-fullscreen')).toBe(true);
        expect(module.active).toBe(true);
    });

    it('exit removes fullscreen class', async () => {
        await module.enter();
        await module.exit();
        expect(editor.wrapper.classList.contains('ife-fullscreen')).toBe(false);
        expect(module.active).toBe(false);
    });

    it('toggle switches between enter and exit', async () => {
        await module.toggle();
        expect(module.active).toBe(true);

        await module.toggle();
        expect(module.active).toBe(false);
    });

    it('handleChange reacts to fullscreenElement being null', () => {
        module.active = true;
        editor.wrapper.classList.add('ife-fullscreen');
        editor.applyHeight(true);
        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });

        module.handleChange();

        expect(module.active).toBe(false);
        expect(editor.wrapper.classList.contains('ife-fullscreen')).toBe(false);
        expect(editor.applyHeight).toHaveBeenLastCalledWith(false);
    });

    it('enter lifts the content bounds so the fullscreen column owns the scroll', async () => {
        await module.enter();

        expect(editor.applyHeight).toHaveBeenCalledWith(true);
    });

    it('exit re-applies the content bounds', async () => {
        await module.enter();
        editor.applyHeight.mockClear();

        await module.exit();

        expect(editor.applyHeight).toHaveBeenCalledWith(false);
    });

    it('handleChange re-applies the content bounds when fullscreen is left natively', () => {
        module.active = true;
        editor.wrapper.classList.add('ife-fullscreen');
        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });

        module.handleChange();

        expect(editor.applyHeight).toHaveBeenCalledWith(false);
    });

    it('re-applies the content bounds on every exit path, so none of them can drop them', async () => {
        // The bounds used to be snapshotted and restored here, and the restore
        // cleared the snapshot: the second exit path (the native
        // `fullscreenchange` event that also fires when the button is used to
        // leave fullscreen) then wrote the empty snapshot over the editor's own
        // bounds, leaving the content area unbounded for the rest of the page
        // life. Both paths now just ask the editor to re-apply them.
        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });

        await module.enter();
        await module.exit();
        module.handleChange();

        expect(editor.applyHeight.mock.calls).toEqual([[true], [false], [false]]);
    });

    it('does not crash when the editor has no root (headless mock)', async () => {
        const rootless = { wrapper: document.createElement('div'), applyHeight: vi.fn(), on: vi.fn() };
        const headless = new FullscreenModule(rootless);

        await headless.enter();

        expect(headless.active).toBe(true);
        expect(rootless.wrapper.classList.contains('ife-fullscreen')).toBe(true);
        headless.destroy();
    });

    it('destroy removes fullscreenchange listener', () => {
        const spy = vi.spyOn(document, 'removeEventListener');
        module.destroy();
        expect(spy).toHaveBeenCalledWith('fullscreenchange', module.handleChange);
    });
});
