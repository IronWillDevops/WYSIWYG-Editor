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

    it('destroy removes fullscreenchange listener', () => {
        const spy = vi.spyOn(document, 'removeEventListener');
        module.destroy();
        expect(spy).toHaveBeenCalledWith('fullscreenchange', module.handleChange);
    });
});
