import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ColorPickerModule from '../src/toolbar/ColorPickerModule.js';

function createMockEditor() {
    const root = document.createElement('div');
    root.contentEditable = 'true';
    const wrapper = document.createElement('div');
    wrapper.appendChild(root);
    return {
        root,
        wrapper,
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

describe('ColorPickerModule', () => {
    let editor;
    let trigger;
    let onChange;
    let onClear;
    let module;

    beforeEach(() => {
        document.body.innerHTML = '';
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
        trigger = document.createElement('button');
        trigger.textContent = 'A';
        document.body.appendChild(trigger);
        onChange = vi.fn();
        onClear = vi.fn();
        module = new ColorPickerModule(editor, trigger, {
            id: 'forecolor',
            cssProp: 'color',
            label: 'Text color',
            onChange,
            onClear,
        });
    });

    afterEach(() => {
        module.destroy();
        document.body.innerHTML = '';
    });

    describe('state conversions', () => {
        it('derives and applies the hex from the current hue/sat/lum state via emit', () => {
            module.open();
            module.hue = 0; module.sat = 100; module.lum = 50;
            module.emit();
            expect(onChange).toHaveBeenLastCalledWith('#ff0000');
        });
    });

    describe('open / close', () => {
        it('builds a popover in the body and keeps the editor focused (no native dialog)', () => {
            module.open();
            expect(module.picker).not.toBeNull();
            expect(module.picker.classList.contains('ife-color-picker')).toBe(true);
            expect(document.body.contains(module.picker)).toBe(true);
            expect(editor.selection.restore).not.toHaveBeenCalled();
        });

        it('saves the selection when it opens', () => {
            module.open();
            expect(editor.selection.save).toHaveBeenCalled();
        });

        it('toggle opens then closes', () => {
            module.toggle();
            expect(module.picker).not.toBeNull();
            module.toggle();
            expect(module.picker).toBeNull();
        });

        it('open is idempotent', () => {
            module.open();
            const el = module.picker;
            module.open();
            expect(module.picker).toBe(el);
        });

        it('close removes the popover from the DOM', () => {
            module.open();
            module.close();
            expect(module.picker).toBeNull();
            expect(document.querySelector('.ife-color-picker')).toBeNull();
        });

        it('Escape closes the picker', () => {
            module.open();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            expect(module.picker).toBeNull();
        });

        it('clicking outside the picker and trigger closes it', () => {
            module.open();
            document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(module.picker).toBeNull();
        });

        it('clicking inside the picker does not close it', () => {
            module.open();
            const hex = module.picker.querySelector('.ife-color-picker__hex');
            hex.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(module.picker).not.toBeNull();
        });

        it('destroy closes the picker and clears the saved selection', () => {
            module.open();
            module.destroy();
            expect(module.picker).toBeNull();
        });
    });

    describe('drag interactions', () => {
        function firePointer(el, type, x, y) {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        }

        it('dragging the saturation/luminance square emits a live colour update', () => {
            module.open();
            const square = module.picker.querySelector('.ife-color-picker__square');
            Object.defineProperty(square, 'getBoundingClientRect', {
                configurable: true,
                value: () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }),
            });
            // pointer x -> saturation, pointer y -> (100 - lightness), so the
            // mid-right edge picks the fully saturated hue (sat 100, lum 50).
            firePointer(square, 'pointerdown', 100, 50);
            expect(module.sat).toBe(100);
            expect(module.lum).toBe(50);
            expect(onChange.mock.calls[onChange.mock.calls.length - 1][0]).toBe('#ff0000');
            // drag toward bottom-left -> lower saturation + black
            firePointer(document, 'pointermove', 0, 100);
            expect(module.sat).toBe(0);
            expect(module.lum).toBe(0);
            expect(onChange.mock.calls[onChange.mock.calls.length - 1][0]).toBe('#000000');
            // pointerup ends the drag; further movement is ignored
            firePointer(document, 'pointerup', 0, 100);
            onChange.mockClear();
            firePointer(document, 'pointermove', 50, 50);
            expect(onChange).not.toHaveBeenCalled();
        });

        it('dragging the hue slider changes hue and emits live', () => {
            module.open();
            module.sat = 100; module.lum = 50;
            const hue = module.picker.querySelector('.ife-color-picker__hue');
            Object.defineProperty(hue, 'getBoundingClientRect', {
                configurable: true,
                value: () => ({ left: 0, top: 0, width: 100, height: 10, right: 100, bottom: 10 }),
            });
            firePointer(hue, 'pointerdown', 50, 5);
            expect(module.hue).toBe(180);
            expect(onChange.mock.calls[onChange.mock.calls.length - 1][0]).toBe('#00ffff');
        });

        it('pointerdown on square/hue does not steal editor focus (preventDefault)', () => {
            module.open();
            const square = module.picker.querySelector('.ife-color-picker__square');
            const ev = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 });
            square.dispatchEvent(ev);
            expect(ev.defaultPrevented).toBe(true);
        });
    });

    describe('controls', () => {
        it('typing a valid hex applies it live and moves the handles', () => {
            module.open();
            const hex = module.picker.querySelector('.ife-color-picker__hex');
            hex.value = '#00ff00';
            hex.dispatchEvent(new Event('input'));
            expect(onChange).toHaveBeenLastCalledWith('#00ff00');
            expect(hex.value).toBe('#00ff00');
        });

        it('ignores an invalid hex entry', () => {
            module.open();
            const hex = module.picker.querySelector('.ife-color-picker__hex');
            onChange.mockClear();
            hex.value = 'nonsense';
            hex.dispatchEvent(new Event('input'));
            expect(onChange).not.toHaveBeenCalled();
        });

        it('the hex field does not preventDefault on mousedown so it can be edited', () => {
            module.open();
            const hex = module.picker.querySelector('.ife-color-picker__hex');
            const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
            hex.dispatchEvent(ev);
            expect(ev.defaultPrevented).toBe(false);
        });

        it('typing a hex recolours the selected text live', () => {
            module.open();
            onChange.mockClear();
            const hex = module.picker.querySelector('.ife-color-picker__hex');
            hex.value = '#ff0000';
            hex.dispatchEvent(new Event('input'));
            expect(onChange).toHaveBeenLastCalledWith('#ff0000');
        });

        it('clearing calls onClear and closes the picker', () => {
            module.open();
            const clear = module.picker.querySelector('.ife-color-picker__clear');
            clear.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            clear.click();
            expect(onClear).toHaveBeenCalledTimes(1);
            expect(module.picker).toBeNull();
        });

        it('preset swatches apply their exact colour', () => {
            module.open();
            const swatch = module.picker.querySelector('.ife-color-picker__swatch[data-color="#1b5e20"]');
            swatch.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            swatch.click();
            expect(onChange).toHaveBeenLastCalledWith('#1b5e20');
        });
    });

    describe('seeding', () => {
        it('seeds hue/sat/lum from the current selection colour', () => {
            editor.root.innerHTML = '<p><span style="color: rgb(255, 0, 0)">x</span></p>';
            const span = editor.root.querySelector('span');
            const range = document.createRange();
            range.selectNodeContents(span.firstChild);
            editor.selection.getRange = vi.fn(() => range);
            module.open();
            expect(module.hexEl.value).toBe('#ff0000');
        });

        it('defaults to a neutral colour when the selection has no colour', () => {
            module.open();
            expect(module.hexEl.value).toBe('#000000');
        });
    });
});
