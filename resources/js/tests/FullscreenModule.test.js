import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FullscreenModule from '../src/modules/FullscreenModule.js';

function createMockEditor() {
    const wrapper = document.createElement('div');
    wrapper.className = 'ife-wrapper';
    return {
        wrapper,
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
        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });

        module.handleChange();

        expect(module.active).toBe(false);
        expect(editor.wrapper.classList.contains('ife-fullscreen')).toBe(false);
    });

    it('emits fullscreenchange when leaving fullscreen so the toolbar can re-sync', () => {
        editor.events = { emit: vi.fn() };
        module.active = true;
        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });

        module.handleChange();

        expect(editor.events.emit).toHaveBeenCalledWith('fullscreenchange', editor);
    });

    it('does not emit fullscreenchange when already inactive', () => {
        editor.events = { emit: vi.fn() };
        module.active = false;
        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });

        module.handleChange();

        expect(editor.events.emit).not.toHaveBeenCalled();
    });

    it('enter swallows a rejected requestFullscreen and stays inactive', async () => {
        // Cross-origin iframes and permission denials reject the promise —
        // the editor must not enter a half-active state.
        editor.wrapper.requestFullscreen = vi.fn(() => Promise.reject(new Error('denied')));

        await expect(module.enter()).resolves.toBeUndefined();

        expect(module.active).toBe(false);
        expect(editor.wrapper.classList.contains('ife-fullscreen')).toBe(false);
    });

    it('exit still deactivates when exitFullscreen rejects', async () => {
        editor.wrapper.classList.add('ife-fullscreen');
        module.active = true;
        Object.defineProperty(document, 'fullscreenElement', { value: document.body, configurable: true, writable: true });
        const exitSpy = vi.fn(() => Promise.reject(new Error('not allowed')));
        document.exitFullscreen = exitSpy;

        await expect(module.exit()).resolves.toBeUndefined();

        expect(exitSpy).toHaveBeenCalled();
        expect(module.active).toBe(false);
        expect(editor.wrapper.classList.contains('ife-fullscreen')).toBe(false);
        delete document.exitFullscreen;
        Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true, writable: true });
    });

    it('destroy removes fullscreenchange listener', () => {
        const spy = vi.spyOn(document, 'removeEventListener');
        module.destroy();
        expect(spy).toHaveBeenCalledWith('fullscreenchange', module.handleChange);
    });
});
