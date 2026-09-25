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
        editor.root.style.maxHeight = '420px';
        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });

        module.handleChange();

        expect(module.active).toBe(false);
        expect(editor.wrapper.classList.contains('ife-fullscreen')).toBe(false);
        expect(editor.root.style.maxHeight).toBe('');
    });

    it('enter lifts an inline max-height so the fullscreen column owns the scroll', async () => {
        editor.root.style.maxHeight = '420px';

        await module.enter();

        expect(editor.root.style.maxHeight).toBe('none');
        // Remembered so exit can restore it.
        expect(module._previousMaxHeight).toBe('420px');
    });

    it('exit restores the previous inline max-height', async () => {
        editor.root.style.maxHeight = '420px';
        await module.enter();
        expect(editor.root.style.maxHeight).toBe('none');

        await module.exit();

        expect(editor.root.style.maxHeight).toBe('420px');
        expect(module._previousMaxHeight).toBe('');
    });

    it('enter lifts the inline min-height so a short fullscreen window still scrolls', async () => {
        editor.root.style.minHeight = '420px';

        await module.enter();

        expect(editor.root.style.minHeight).toBe('0');
        expect(module._previousMinHeight).toBe('420px');
    });

    it('exit restores the previous inline min-height', async () => {
        editor.root.style.minHeight = '420px';
        await module.enter();
        expect(editor.root.style.minHeight).toBe('0');

        await module.exit();

        expect(editor.root.style.minHeight).toBe('420px');
        expect(module._previousMinHeight).toBe('');
    });

    it('exit restores unset height bounds as empty', async () => {
        await module.enter();

        await module.exit();

        expect(editor.root.style.minHeight).toBe('');
        expect(editor.root.style.maxHeight).toBe('');
    });

    it('fullscreenchange exit restores the remembered max-height', () => {
        editor.root.style.maxHeight = '300px';
        module.active = true;
        module._previousMaxHeight = '300px';
        editor.wrapper.classList.add('ife-fullscreen');
        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });

        module.handleChange();

        expect(editor.root.style.maxHeight).toBe('300px');
        expect(module._previousMaxHeight).toBe('');
    });

    it('does not crash when the editor has no root (headless mock)', async () => {
        const rootless = { wrapper: document.createElement('div'), on: vi.fn() };
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
