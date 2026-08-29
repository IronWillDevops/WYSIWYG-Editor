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
            restoreSavedOffsets: vi.fn(),
            getSavedRange: vi.fn(() => null),
            getSavedOffsets: vi.fn(() => null),
            setRange: vi.fn(),
            setRangeByOffsets: vi.fn(),
            getBlockElement: vi.fn(() => null),
            getNativeSelection: vi.fn(() => null),
            getRange: vi.fn(() => null),
        },
        commands: { queryState: vi.fn(() => false), exec: vi.fn(), applyColor: vi.fn(), clearColor: vi.fn() },
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

    it('renders a color picker for forecolor as a button holding an in-page picker', () => {
        toolbar = new Toolbar(editor);
        const button = toolbar.buttons.get('forecolor');
        expect(button).not.toBeNull();
        expect(button.tagName).toBe('BUTTON');
        expect(button.classList.contains('ife-toolbar__color')).toBe(true);
        expect(button.querySelector('input[type="color"]')).toBeNull();
        expect(toolbar._colorPickers.get('forecolor')).toBeDefined();
    });

    it('saves the editor selection and opens the in-page picker on button click', () => {
        toolbar = new Toolbar(editor);
        const button = toolbar.buttons.get('forecolor');
        button.click();
        const picker = toolbar._colorPickers.get('forecolor');
        expect(editor.selection.save).toHaveBeenCalled();
        expect(picker.picker).not.toBeNull();
        expect(document.body.contains(picker.picker)).toBe(true);
        // The in-page popover keeps editor focus, so no native focus is stolen.
        expect(editor.selection.restore).not.toHaveBeenCalled();
    });

    it('seeds the in-page picker from the current selection color', () => {
        editor.root.innerHTML = '<p><span style="color: rgb(255, 255, 0)">text</span></p>';
        const span = editor.root.querySelector('span');
        const range = document.createRange();
        range.selectNodeContents(span.firstChild);
        editor.selection.getRange = vi.fn(() => range);
        editor.selection.getBlockElement = vi.fn(() => span.closest('p'));
        toolbar = new Toolbar(editor);
        const picker = toolbar._colorPickers.get('forecolor');
        picker.open();
        expect(picker.hexEl.value).toBe('#ffff00');
    });

    it('picking a color in the in-page picker restores the selection and applies it live', () => {
        toolbar = new Toolbar(editor);
        const picker = toolbar._colorPickers.get('forecolor');
        picker.open();
        // A live pick (preset/hue/hex) flows through emit() -> the wired onChange.
        picker.hue = 0; picker.sat = 100; picker.value = 100;
        picker.emit();
        expect(editor.selection.restoreSavedOffsets).toHaveBeenCalled();
        expect(editor.commands.applyColor).toHaveBeenCalledWith('color', '#ff0000');
        // Live colour also arms recolouring as the selection grows.
        expect(toolbar._liveColor).toEqual({ command: 'foreColor', value: '#ff0000' });
    });

    it('picking a literal colour in the in-page picker applies it without clearing', () => {
        toolbar = new Toolbar(editor);
        const picker = toolbar._colorPickers.get('forecolor');
        picker.open();
        picker.hue = 0; picker.sat = 0; picker.value = 0;
        picker.emit();
        expect(editor.commands.applyColor).toHaveBeenCalledWith('color', '#000000');
    });

    it('clicking a preset swatch recolours the selected text live', () => {
        toolbar = new Toolbar(editor);
        const picker = toolbar._colorPickers.get('forecolor');
        picker.open();
        const swatch = picker.picker.querySelector('.ife-color-picker__swatch[data-color="#1b5e20"]');
        // green preset
        swatch.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        swatch.click();
        expect(editor.commands.applyColor).toHaveBeenCalledWith('color', '#1b5e20');
    });

    it('clearing the colour in the in-page picker clears the selection colour', () => {
        toolbar = new Toolbar(editor);
        const picker = toolbar._colorPickers.get('forecolor');
        picker.open();
        const clear = picker.picker.querySelector('.ife-color-picker__clear');
        clear.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        clear.click();
        expect(editor.selection.restoreSavedOffsets).toHaveBeenCalled();
        expect(editor.commands.clearColor).toHaveBeenCalledWith('color');
        expect(toolbar._liveColor).toBeNull();
        expect(picker.picker).toBeNull();
    });

    it('live recolouring re-applies the chosen color as the selection grows', () => {
        vi.useFakeTimers();
        try {
            editor.root.innerHTML = '<p>The quick brown fox</p>';

            // native selection mock that reports a growing selection
            const textNode = editor.root.querySelector('p').firstChild;
            let start = 4;
            let end = 9;
            editor.selection.getNativeSelection = vi.fn(() => ({
                rangeCount: 1,
                isCollapsed: false,
                getRangeAt: () => {
                    const r = document.createRange();
                    r.setStart(textNode, start);
                    r.setEnd(textNode, end);
                    return r;
                },
                toString: () => textNode.textContent.slice(start, end),
            }));

            toolbar = new Toolbar(editor);
            const picker = toolbar._colorPickers.get('forecolor');
            picker.open();
            picker.hue = 0; picker.sat = 100; picker.value = 100;
            picker.emit();
            editor.selection.save.mockClear();
            editor.commands.exec.mockClear();
            // simulate the drag expanding the selection
            end = 18;
            const handler = toolbar._handleLiveSelection;
            handler();
            vi.advanceTimersByTime(50);
            expect(editor.commands.exec).toHaveBeenLastCalledWith('foreColor', '#ff0000');
            // The grown selection must be re-saved before exec, otherwise exec()'s
            // restore() clobbers it back to the original pick and never recolours
            // the newly selected text.
            expect(editor.selection.save).toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it('does not live recolor a collapsed selection', () => {
        vi.useFakeTimers();
        try {
            editor.selection.getNativeSelection = vi.fn(() => null);
            toolbar = new Toolbar(editor);
            const picker = toolbar._colorPickers.get('forecolor');
            picker.open();
            picker.hue = 120; picker.sat = 100; picker.value = 100;
            picker.emit();
            editor.commands.exec.mockClear();

            toolbar._handleLiveSelection();
            vi.advanceTimersByTime(100);
            expect(editor.commands.exec).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
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

    it('blockFormat select change applies the user-chosen value, not the stale block tag', () => {
        toolbar = new Toolbar(editor);
        const select = toolbar.buttons.get('blockFormat');
        const p = document.createElement('p');
        p.textContent = 'Six heading';
        editor.selection.getBlockElement = vi.fn(() => p);

        // Simulate the real-browser failure: restoring the selection during the
        // change handler fires a selectionchange that re-runs syncActiveStates,
        // which rewrites the select to the current block tag (p) before
        // onChange reads it. The handler must still apply what the user picked.
        const origRestore = editor.selection.restore;
        editor.selection.restore = vi.fn(() => {
            origRestore();
            select.value = 'p'; // clobber, exactly like the resync would
        });

        select.value = 'h1';
        select.dispatchEvent(new Event('change'));
        expect(editor.commands.exec).toHaveBeenCalledWith('formatBlock', 'h1');
    });

});
