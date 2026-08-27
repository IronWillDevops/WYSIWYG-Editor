import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Toolbar from '../src/toolbar/Toolbar.js';

function createMockEditor() {
    const root = document.createElement('div');
    root.contentEditable = 'true';
    const wrapper = document.createElement('div');
    wrapper.appendChild(root);
    return {
        root,
        wrapper,
        options: { locale: 'en' },
        selection: {
            save: vi.fn(),
            restore: vi.fn(),
            getBlockElement: vi.fn(() => null),
            getNativeSelection: vi.fn(() => null),
            getRange: vi.fn(() => null),
        },
        commands: { queryState: vi.fn(() => false), exec: vi.fn() },
        on: vi.fn(),
    };
}

describe('Toolbar', () => {
    let editor;
    let toolbar;

    beforeEach(() => {
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
        vi.spyOn(editor, 'on');
    });

    afterEach(() => {
        toolbar?.destroy();
        document.body.innerHTML = '';
    });

    it('renders toolbar groups from default layout', () => {
        toolbar = new Toolbar(editor);
        const groups = toolbar.el.querySelectorAll('.ife-toolbar__group');
        expect(groups.length).toBeGreaterThan(0);
    });

    it('renders a bold button', () => {
        toolbar = new Toolbar(editor);
        const btn = toolbar.el.querySelector('[data-command="bold"]');
        expect(btn).not.toBeNull();
        expect(btn.tagName).toBe('BUTTON');
    });

    it('renders a color picker for forecolor', () => {
        toolbar = new Toolbar(editor);
        const wrapper = toolbar.buttons.get('forecolor');
        expect(wrapper).not.toBeNull();
        expect(wrapper.classList.contains('ife-toolbar__color')).toBe(true);
        expect(wrapper.querySelector('input[type="color"]')).not.toBeNull();
    });

    it('color picker saves the selection on pointerdown before focus is stolen', () => {
        toolbar = new Toolbar(editor);
        const input = toolbar.buttons.get('forecolor').querySelector('input[type="color"]');
        input.dispatchEvent(new Event('pointerdown'));
        expect(editor.selection.save).toHaveBeenCalled();
    });

    it('color picker saves the selection on mousedown (mirrors block-format select)', () => {
        toolbar = new Toolbar(editor);
        const input = toolbar.buttons.get('forecolor').querySelector('input[type="color"]');
        input.dispatchEvent(new Event('mousedown'));
        expect(editor.selection.save).toHaveBeenCalled();
    });

    it('color picker restores selection and applies the chosen color on input', () => {
        toolbar = new Toolbar(editor);
        const input = toolbar.buttons.get('forecolor').querySelector('input[type="color"]');
        input.value = '#ff0000';
        input.dispatchEvent(new Event('input'));
        expect(editor.selection.restore).toHaveBeenCalled();
        expect(editor.commands.exec).toHaveBeenCalledWith('foreColor', '#ff0000');
    });

    it('captures the selection on any toolbar mousedown (e.g. native select) so commands keep the text selection', () => {
        toolbar = new Toolbar(editor);
        const select = toolbar.buttons.get('blockFormat');
        select.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        expect(editor.selection.save).toHaveBeenCalled();
    });

    it('inserts toolbar before editor root', () => {
        toolbar = new Toolbar(editor);
        expect(editor.wrapper.firstChild).toBe(toolbar.el);
    });

    it('calls editor.commands.exec on command button click', () => {
        toolbar = new Toolbar(editor);
        const btn = toolbar.el.querySelector('[data-command="bold"]');
        btn.click();
        expect(editor.commands.exec).toHaveBeenCalledWith('bold');
    });

    it('restores selection before executing command', () => {
        toolbar = new Toolbar(editor);
        const btn = toolbar.el.querySelector('[data-command="italic"]');
        btn.click();
        expect(editor.selection.restore).toHaveBeenCalled();
    });

    it('syncs active states on selectionchange event', () => {
        toolbar = new Toolbar(editor);
        expect(editor.on).toHaveBeenCalledWith('selectionchange', expect.any(Function));
        expect(editor.on).toHaveBeenCalledWith('focus', expect.any(Function));
    });

    it('setEnabled disables a button', () => {
        toolbar = new Toolbar(editor);
        toolbar.setEnabled('bold', false);
        const btn = toolbar.buttons.get('bold');
        expect(btn.disabled).toBe(true);
    });

    it('setEnabled enables a button', () => {
        toolbar = new Toolbar(editor);
        toolbar.setEnabled('bold', false);
        toolbar.setEnabled('bold', true);
        const btn = toolbar.buttons.get('bold');
        expect(btn.disabled).toBe(false);
    });

    it('destroy removes toolbar from DOM', () => {
        toolbar = new Toolbar(editor);
        expect(editor.wrapper.contains(toolbar.el)).toBe(true);
        toolbar.destroy();
        expect(editor.wrapper.contains(toolbar.el)).toBe(false);
    });

    it('uses custom layout when provided', () => {
        toolbar = new Toolbar(editor, [['bold', 'italic'], ['link']]);
        const groups = toolbar.el.querySelectorAll('.ife-toolbar__group');
        expect(groups.length).toBe(2);
        expect(groups[0].querySelector('[data-command="bold"]')).not.toBeNull();
        expect(groups[0].querySelector('[data-command="italic"]')).not.toBeNull();
        expect(groups[1].querySelector('[data-command="link"]')).not.toBeNull();
    });

    it('skips unknown button ids', () => {
        toolbar = new Toolbar(editor, [['nonExistentButton']]);
        const groups = toolbar.el.querySelectorAll('.ife-toolbar__group');
        expect(groups.length).toBe(0);
    });

    it('activates blockquote button when cursor is inside a blockquote', () => {
        const blockquote = document.createElement('blockquote');
        blockquote.textContent = 'test';
        editor.selection.getBlockElement = vi.fn(() => blockquote);
        toolbar = new Toolbar(editor);
        const btn = toolbar.buttons.get('blockquote');
        toolbar.syncActiveStates();
        expect(btn.classList.contains('is-active')).toBe(true);
    });

    it('does not activate blockquote button when cursor is inside a paragraph', () => {
        const p = document.createElement('p');
        p.textContent = 'test';
        editor.selection.getBlockElement = vi.fn(() => p);
        toolbar = new Toolbar(editor);
        const btn = toolbar.buttons.get('blockquote');
        toolbar.syncActiveStates();
        expect(btn.classList.contains('is-active')).toBe(false);
    });

    it('activates blockquote button when paragraph is nested inside blockquote', () => {
        const blockquote = document.createElement('blockquote');
        const p = document.createElement('p');
        p.textContent = 'test';
        blockquote.appendChild(p);
        editor.root.appendChild(blockquote);
        editor.selection.getBlockElement = vi.fn(() => p);
        toolbar = new Toolbar(editor);
        const btn = toolbar.buttons.get('blockquote');
        toolbar.syncActiveStates();
        expect(btn.classList.contains('is-active')).toBe(true);
    });

    it('renders a blockFormat select control', () => {
        toolbar = new Toolbar(editor);
        const select = toolbar.buttons.get('blockFormat');
        expect(select).not.toBeNull();
        expect(select.tagName).toBe('SELECT');
    });

    it('blockFormat select has paragraph and heading options', () => {
        toolbar = new Toolbar(editor);
        const select = toolbar.buttons.get('blockFormat');
        const options = Array.from(select.options);
        expect(options.map(o => o.value)).toEqual(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
    });

    it('blockFormat select value syncs to current block tag', () => {
        toolbar = new Toolbar(editor);
        const h2 = document.createElement('h2');
        h2.textContent = 'test';
        editor.selection.getBlockElement = vi.fn(() => h2);
        toolbar.syncActiveStates();
        const select = toolbar.buttons.get('blockFormat');
        expect(select.value).toBe('h2');
    });

    it('blockFormat select defaults to p for unknown block tag', () => {
        toolbar = new Toolbar(editor);
        const div = document.createElement('div');
        div.textContent = 'test';
        editor.selection.getBlockElement = vi.fn(() => div);
        toolbar.syncActiveStates();
        const select = toolbar.buttons.get('blockFormat');
        expect(select.value).toBe('p');
    });

    it('blockFormat select change triggers formatBlock command', () => {
        toolbar = new Toolbar(editor);
        const select = toolbar.buttons.get('blockFormat');
        select.value = 'h1';
        select.dispatchEvent(new Event('change'));
        expect(editor.commands.exec).toHaveBeenCalledWith('formatBlock', 'h1');
    });

});
