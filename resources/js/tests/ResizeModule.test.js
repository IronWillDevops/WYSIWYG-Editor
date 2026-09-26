import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WysiwygEditor from '../src/index.js';
import ResizeModule from '../src/modules/ResizeModule.js';

/** Mounts an editor whose box has a measurable height. */
function mount(options = {}) {
    document.body.innerHTML = '<textarea id="target">start</textarea>';
    const editor = WysiwygEditor.init('#target', { height: 420, ...options });
    return editor;
}

/**
 * jsdom performs no layout, so the editor's box is simulated: it reports
 * whatever `applyHeight()` last wrote to the wrapper, exactly like a browser
 * would (`.ife-wrapper` is `box-sizing: border-box`, so the border is already
 * part of the number and there is nothing to subtract).
 */
function stubLayout(el) {
    const boxHeight = () => parseFloat(el.style.height) || 0;
    el.getBoundingClientRect = () => {
        const height = boxHeight();
        return {
            height,
            top: 0,
            left: 0,
            right: 0,
            bottom: height,
            width: 0,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        };
    };
    Object.defineProperty(el, 'offsetHeight', { configurable: true, get: boxHeight });
}

function pointer(type, { clientY = 0, button = 0 } = {}) {
    // jsdom has no PointerEvent; MouseEvent carries everything the module reads.
    const event = new window.MouseEvent(type, { clientY, button, bubbles: true, cancelable: true });
    event.pointerId = 1;
    return event;
}

describe('ResizeModule', () => {
    let editor;
    let handle;

    beforeEach(async () => {
        editor = mount();
        await vi.waitFor(() => expect(editor.module('resize')).toBeDefined());
        handle = editor.wrapper.querySelector('.ife-resize-handle');
    });

    afterEach(() => {
        WysiwygEditor.destroyAll();
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('renders a focusable grip on the wrapper, not inside the scroll area', () => {
        expect(handle).not.toBeNull();
        // Inside the content area the grip would scroll away with the text.
        expect(editor.root.contains(handle)).toBe(false);
        expect(editor.wrapper.contains(handle)).toBe(true);
        expect(handle.getAttribute('role')).toBe('separator');
        expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
        expect(handle.tabIndex).toBe(0);
    });

    it('labels the grip for screen readers', () => {
        expect(handle.getAttribute('aria-label')).toBe('Drag to change the editor height');
    });

    it('applies a taller box when the grip is dragged down', () => {
        stubLayout(editor.wrapper);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 100 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 260 }));

        expect(editor.wrapper.style.height).toBe('580px');
        expect(editor.wrapper.style.maxHeight).toBe('580px');
    });

    it('applies a shorter box when the grip is dragged up', () => {
        stubLayout(editor.wrapper);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 300 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 180 }));

        expect(editor.wrapper.style.height).toBe('300px');
    });

    it('writes the dragged height into the height option, not into a private field', () => {
        // A second height source is exactly what made the editor unbounded
        // before; the grip must go through the option Editor.applyHeight reads.
        stubLayout(editor.wrapper);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 100 }));

        expect(editor.options.height).toBe(520);
        expect(editor.wrapper.style.height).toBe('520px');
    });

    it('keeps height and max-height in step so the box stays exactly that tall', () => {
        stubLayout(editor.wrapper);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 40 }));

        expect(editor.wrapper.style.height).toBe(editor.wrapper.style.maxHeight);
    });

    it('repeats cleanly: dragging again starts from the current height', () => {
        stubLayout(editor.wrapper);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 80 }));
        window.dispatchEvent(pointer('pointerup', { clientY: 80 }));
        expect(editor.wrapper.style.height).toBe('500px');

        handle.dispatchEvent(pointer('pointerdown', { clientY: 200 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 260 }));

        expect(editor.wrapper.style.height).toBe('560px');
    });

    it('never collapses the editor below the minimum height', () => {
        stubLayout(editor.wrapper);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 400 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 0 }));

        expect(editor.wrapper.style.height).toBe('120px');
    });

    it('marks the editor while dragging and cleans up on release', () => {
        stubLayout(editor.wrapper);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        expect(editor.wrapper.classList.contains('ife-resizing')).toBe(true);

        window.dispatchEvent(pointer('pointerup', { clientY: 0 }));
        expect(editor.wrapper.classList.contains('ife-resizing')).toBe(false);
    });

    it('stops listening for moves after the pointer is released', () => {
        stubLayout(editor.wrapper);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 50 }));
        window.dispatchEvent(pointer('pointerup', { clientY: 50 }));
        const height = editor.wrapper.style.height;

        window.dispatchEvent(pointer('pointermove', { clientY: 500 }));
        expect(editor.wrapper.style.height).toBe(height);
    });

    it('cancels the drag when the pointer is cancelled', () => {
        stubLayout(editor.wrapper);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        window.dispatchEvent(pointer('pointercancel', { clientY: 0 }));
        const height = editor.wrapper.style.height;

        window.dispatchEvent(pointer('pointermove', { clientY: 300 }));
        expect(editor.wrapper.style.height).toBe(height);
    });

    it('ignores a non-primary button so the context menu still opens', () => {
        stubLayout(editor.wrapper);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0, button: 2 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 200 }));

        expect(editor.wrapper.style.height).toBe('420px');
    });

    it('resizes with the arrow keys once the grip is focused', () => {
        stubLayout(editor.wrapper);

        handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
        expect(editor.wrapper.style.height).toBe('452px');

        handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
        expect(editor.wrapper.style.height).toBe('420px');
    });

    it('takes bigger keyboard steps with shift', () => {
        stubLayout(editor.wrapper);

        handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }));

        expect(editor.wrapper.style.height).toBe('516px');
    });

    it('leaves other keys to the editor', () => {
        stubLayout(editor.wrapper);

        handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }));

        expect(editor.wrapper.style.height).toBe('420px');
    });

    it('publishes the current size for assistive technology', () => {
        stubLayout(editor.wrapper);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 30 }));

        expect(handle.getAttribute('aria-valuenow')).toBe('450');
    });

    it('reports the size as soon as a drag starts, before it changes it', () => {
        stubLayout(editor.wrapper);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));

        // Measured at the start of the gesture, not guessed at mount time.
        expect(handle.getAttribute('aria-valuenow')).toBe('420');
        expect(handle.getAttribute('aria-valuemin')).toBe('120');
    });

    it('hides the grip while the source view is open, which resizes itself', async () => {
        await vi.waitFor(() => expect(editor.module('codeView')).toBeDefined());
        editor.module('codeView').enterCodeView();

        expect(editor.wrapper.classList.contains('ife-source-open')).toBe(true);

        editor.module('codeView').exitCodeView();
        expect(editor.wrapper.classList.contains('ife-source-open')).toBe(false);
    });

    it('removes the grip and its listeners on destroy', () => {
        stubLayout(editor.wrapper);
        const el = handle;

        editor.destroy();

        expect(el.isConnected).toBe(false);
        // A drag in flight must not keep writing to a destroyed editor.
        el.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 300 }));
        expect(editor.wrapper.style.height).toBe('420px');
    });
});

describe('ResizeModule without a mounted editor', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('does not crash on a headless mock editor', () => {
        const wrapper = document.createElement('div');
        const root = document.createElement('div');
        wrapper.appendChild(root);
        const mock = {
            wrapper,
            root,
            options: { locale: 'en', height: 420 },
            applyHeight: vi.fn(),
        };
        const module = new ResizeModule(mock);

        expect(wrapper.querySelector('.ife-resize-handle')).not.toBeNull();

        module.destroy();
        expect(wrapper.querySelector('.ife-resize-handle')).toBeNull();
    });
});
