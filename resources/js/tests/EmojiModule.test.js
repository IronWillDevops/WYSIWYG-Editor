import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EmojiModule from '../src/modules/EmojiModule.js';

function createMockEditor() {
    const root = document.createElement('div');
    root.contentEditable = 'true';
    const wrapper = document.createElement('div');
    wrapper.appendChild(root);
    return {
        root,
        wrapper,
        selection: { save: vi.fn(), restore: vi.fn() },
        commands: { insertHTML: vi.fn() },
    };
}

describe('EmojiModule', () => {
    let editor;
    let module;

    beforeEach(() => {
        document.body.innerHTML = '';
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
        module = new EmojiModule(editor);
    });

    afterEach(() => {
        module.destroy();
        document.body.innerHTML = '';
    });

    it('opens picker with emoji grid', () => {
        module.open();
        const picker = document.body.querySelector('.ife-emoji-picker');
        expect(picker).not.toBeNull();
        expect(picker.querySelector('.ife-emoji-picker__header')).not.toBeNull();
        expect(picker.querySelector('.ife-emoji-picker__body')).not.toBeNull();
        const buttons = picker.querySelectorAll('.ife-emoji-picker__btn');
        expect(buttons.length).toBeGreaterThan(100);
    });

    it('closes picker when close button is clicked', () => {
        module.open();
        expect(document.body.querySelector('.ife-emoji-picker')).not.toBeNull();
        const closeBtn = document.body.querySelector('.ife-emoji-picker__close');
        closeBtn.click();
        expect(document.body.querySelector('.ife-emoji-picker')).toBeNull();
    });

    it('inserts emoji on button click', () => {
        module.open();
        const firstBtn = document.body.querySelector('.ife-emoji-picker__btn');
        const emoji = firstBtn.textContent;
        firstBtn.click();
        expect(editor.selection.restore).toHaveBeenCalled();
        expect(editor.commands.insertHTML).toHaveBeenCalledWith(emoji);
    });

    it('toggles picker on second open call', () => {
        module.open();
        expect(document.body.querySelector('.ife-emoji-picker')).not.toBeNull();
        module.open();
        expect(document.body.querySelector('.ife-emoji-picker')).toBeNull();
    });

    it('close method removes picker from DOM', () => {
        module.open();
        module.close();
        expect(document.body.querySelector('.ife-emoji-picker')).toBeNull();
    });

    it('destroy removes picker', () => {
        module.open();
        module.destroy();
        expect(document.body.querySelector('.ife-emoji-picker')).toBeNull();
    });

    it('saves selection on open', () => {
        module.open();
        expect(editor.selection.save).toHaveBeenCalled();
    });

    it('closes when clicking outside the picker', () => {
        module.open();
        expect(document.body.querySelector('.ife-emoji-picker')).not.toBeNull();
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(document.body.querySelector('.ife-emoji-picker')).toBeNull();
    });

    it('does not close when clicking on the trigger element', () => {
        const btn = document.createElement('button');
        btn.className = 'ife-toolbar__btn';
        btn.setAttribute('data-command', 'emoji');
        document.body.appendChild(btn);

        module.open(btn);
        expect(document.body.querySelector('.ife-emoji-picker')).not.toBeNull();

        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(document.body.querySelector('.ife-emoji-picker')).not.toBeNull();

        document.body.removeChild(btn);
    });

    it('repositions on window scroll instead of closing', () => {
        module.open();
        expect(document.body.querySelector('.ife-emoji-picker')).not.toBeNull();
        window.dispatchEvent(new Event('scroll'));
        expect(document.body.querySelector('.ife-emoji-picker')).not.toBeNull();
    });

    it('closes when an emoji is selected', () => {
        module.open();
        const firstBtn = document.body.querySelector('.ife-emoji-picker__btn');
        firstBtn.click();
        expect(document.body.querySelector('.ife-emoji-picker')).toBeNull();
    });

    it('positions picker relative to trigger button with fixed positioning', () => {
        const btn = document.createElement('button');
        btn.className = 'ife-toolbar__btn';
        btn.getBoundingClientRect = vi.fn(() => ({
            top: 100, bottom: 132, left: 200, right: 232, width: 32, height: 32,
        }));
        document.body.appendChild(btn);

        module.open(btn);
        const picker = document.body.querySelector('.ife-emoji-picker');
        expect(picker).not.toBeNull();
        const topVal = parseFloat(picker.style.top);
        const leftVal = parseFloat(picker.style.left);
        expect(topVal).toBeGreaterThan(100);
        expect(leftVal).toBeGreaterThanOrEqual(200);
        document.body.removeChild(btn);
    });

    describe('positioning edge cases', () => {
        it('positions above when trigger is near bottom of viewport', () => {
            const btn = document.createElement('button');
            btn.className = 'ife-toolbar__btn';
            const rect = { top: 700, bottom: 732, left: 100, right: 132, width: 32, height: 32 };
            btn.getBoundingClientRect = vi.fn(() => rect);
            document.body.appendChild(btn);

            module.open(btn);
            const picker = document.body.querySelector('.ife-emoji-picker');
            picker.style.height = '200px';
            Object.defineProperty(picker, 'offsetHeight', { configurable: true, value: 200 });

            module.positionPicker();
            const topVal = parseFloat(picker.style.top);
            expect(topVal).toBeLessThan(700);
            document.body.removeChild(btn);
            module.close();
        });

        it('positions left when trigger is near right edge of viewport', () => {
            Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });

            const btn = document.createElement('button');
            btn.className = 'ife-toolbar__btn';
            btn.getBoundingClientRect = vi.fn(() => ({
                top: 100, bottom: 132, left: 450, right: 482, width: 32, height: 32,
            }));
            document.body.appendChild(btn);

            module.open(btn);
            const picker = document.body.querySelector('.ife-emoji-picker');
            picker.style.width = '352px';
            Object.defineProperty(picker, 'offsetWidth', { configurable: true, value: 352 });

            module.positionPicker();
            const leftVal = parseFloat(picker.style.left);
            expect(leftVal).toBeLessThan(450);
            document.body.removeChild(btn);
            module.close();
        });

        it('positionPicker does nothing when no trigger element', () => {
            expect(() => module.positionPicker()).not.toThrow();
        });

        it('positionPicker does nothing when no picker', () => {
            module._triggerEl = document.createElement('button');
            expect(() => module.positionPicker()).not.toThrow();
            module._triggerEl = null;
        });
    });
});
