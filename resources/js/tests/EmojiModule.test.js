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
        const picker = editor.wrapper.querySelector('.ife-emoji-picker');
        expect(picker).not.toBeNull();
        expect(picker.querySelector('.ife-emoji-picker__header')).not.toBeNull();
        expect(picker.querySelector('.ife-emoji-picker__body')).not.toBeNull();
        const buttons = picker.querySelectorAll('.ife-emoji-picker__btn');
        expect(buttons.length).toBeGreaterThan(100);
    });

    it('closes picker when close button is clicked', () => {
        module.open();
        expect(editor.wrapper.querySelector('.ife-emoji-picker')).not.toBeNull();
        const closeBtn = editor.wrapper.querySelector('.ife-emoji-picker__close');
        closeBtn.click();
        expect(editor.wrapper.querySelector('.ife-emoji-picker')).toBeNull();
    });

    it('inserts emoji on button click', () => {
        module.open();
        const firstBtn = editor.wrapper.querySelector('.ife-emoji-picker__btn');
        const emoji = firstBtn.textContent;
        firstBtn.click();
        expect(editor.selection.restore).toHaveBeenCalled();
        expect(editor.commands.insertHTML).toHaveBeenCalledWith(emoji);
    });

    it('toggles picker on second open call', () => {
        module.open();
        expect(editor.wrapper.querySelector('.ife-emoji-picker')).not.toBeNull();
        module.open();
        expect(editor.wrapper.querySelector('.ife-emoji-picker')).toBeNull();
    });

    it('close method removes picker from DOM', () => {
        module.open();
        module.close();
        expect(editor.wrapper.querySelector('.ife-emoji-picker')).toBeNull();
    });

    it('destroy removes picker', () => {
        module.open();
        module.destroy();
        expect(editor.wrapper.querySelector('.ife-emoji-picker')).toBeNull();
    });

    it('saves selection on open', () => {
        module.open();
        expect(editor.selection.save).toHaveBeenCalled();
    });

    it('positions picker inside toolbar group when emoji button exists', () => {
        const group = document.createElement('div');
        group.className = 'ife-toolbar__group';
        const btn = document.createElement('button');
        btn.className = 'ife-toolbar__btn';
        btn.dataset.command = 'emoji';
        group.appendChild(btn);
        editor.wrapper.appendChild(group);

        module.open();
        expect(group.querySelector('.ife-emoji-picker')).not.toBeNull();
    });
});
