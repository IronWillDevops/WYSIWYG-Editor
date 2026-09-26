import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WysiwygEditor from '../src/index.js';
import ResizeModule from '../src/modules/ResizeModule.js';

/** Mounts an editor whose content box has a measurable height. */
function mount(options = {}) {
    document.body.innerHTML = '<textarea id="target">start</textarea>';
    const editor = WysiwygEditor.init('#target', { height: 420, ...options });
    return editor;
}

/**
 * jsdom performs no layout, so the content box is simulated: it reports the
 * padding plus whatever `applyHeight()` last wrote, exactly like a browser
 * would. The 16px padding mirrors `.ife-content` in the stylesheet.
 */
const PADDING = 16;

function stubLayout(el) {
    const boxHeight = () => (parseFloat(el.style.maxHeight) || 0) + PADDING * 2;
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

    // jsdom resolves no stylesheet, so `.ife-content`'s padding is reported here
    // instead. Without it the module could not subtract the padding and every
    // drag would be off by exactly that amount.
    const computed = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((node, pseudo) => {
        if (node !== el) return computed(node, pseudo);
        return { ...computed(node, pseudo), paddingTop: `${PADDING}px`, paddingBottom: `${PADDING}px` };
    });
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

    it('applies a taller content box when the grip is dragged down', () => {
        stubLayout(editor.root);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 100 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 260 }));

        expect(editor.root.style.maxHeight).toBe('580px');
        expect(editor.root.style.minHeight).toBe('580px');
    });

    it('applies a shorter content box when the grip is dragged up', () => {
        stubLayout(editor.root);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 300 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 180 }));

        expect(editor.root.style.maxHeight).toBe('300px');
    });

    it('writes the dragged height into the height option, not into a private field', () => {
        // A second height source is exactly what made the editor unbounded
        // before; the grip must go through the option Editor.applyHeight reads.
        stubLayout(editor.root);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 100 }));

        expect(editor.options.height).toBe(520);
        expect(editor.root.style.maxHeight).toBe('520px');
    });

    it('keeps min-height and max-height in step so the box stays exactly that tall', () => {
        stubLayout(editor.root);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 40 }));

        expect(editor.root.style.minHeight).toBe(editor.root.style.maxHeight);
    });

    it('repeats cleanly: dragging again starts from the current height', () => {
        stubLayout(editor.root);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 80 }));
        window.dispatchEvent(pointer('pointerup', { clientY: 80 }));
        expect(editor.root.style.maxHeight).toBe('500px');

        handle.dispatchEvent(pointer('pointerdown', { clientY: 200 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 260 }));

        expect(editor.root.style.maxHeight).toBe('560px');
    });

    it('never collapses the editor below the minimum height', () => {
        stubLayout(editor.root);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 400 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 0 }));

        expect(editor.root.style.maxHeight).toBe('120px');
    });

    it('marks the editor while dragging and cleans up on release', () => {
        stubLayout(editor.root);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        expect(editor.wrapper.classList.contains('ife-resizing')).toBe(true);

        window.dispatchEvent(pointer('pointerup', { clientY: 0 }));
        expect(editor.wrapper.classList.contains('ife-resizing')).toBe(false);
    });

    it('stops listening for moves after the pointer is released', () => {
        stubLayout(editor.root);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 50 }));
        window.dispatchEvent(pointer('pointerup', { clientY: 50 }));
        const height = editor.root.style.maxHeight;

        window.dispatchEvent(pointer('pointermove', { clientY: 500 }));
        expect(editor.root.style.maxHeight).toBe(height);
    });

    it('cancels the drag when the pointer is cancelled', () => {
        stubLayout(editor.root);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        window.dispatchEvent(pointer('pointercancel', { clientY: 0 }));
        const height = editor.root.style.maxHeight;

        window.dispatchEvent(pointer('pointermove', { clientY: 300 }));
        expect(editor.root.style.maxHeight).toBe(height);
    });

    it('ignores a non-primary button so the context menu still opens', () => {
        stubLayout(editor.root);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0, button: 2 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 200 }));

        expect(editor.root.style.maxHeight).toBe('420px');
    });

    it('resizes with the arrow keys once the grip is focused', () => {
        stubLayout(editor.root);

        handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
        expect(editor.root.style.maxHeight).toBe('452px');

        handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
        expect(editor.root.style.maxHeight).toBe('420px');
    });

    it('takes bigger keyboard steps with shift', () => {
        stubLayout(editor.root);

        handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }));

        expect(editor.root.style.maxHeight).toBe('516px');
    });

    it('leaves other keys to the editor', () => {
        stubLayout(editor.root);

        handle.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }));

        expect(editor.root.style.maxHeight).toBe('420px');
    });

    it('publishes the current size for assistive technology', () => {
        stubLayout(editor.root);

        handle.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 30 }));

        expect(handle.getAttribute('aria-valuenow')).toBe('450');
    });

    it('reports the size as soon as a drag starts, before it changes it', () => {
        stubLayout(editor.root);

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
        stubLayout(editor.root);
        const el = handle;

        editor.destroy();

        expect(el.isConnected).toBe(false);
        // A drag in flight must not keep writing to a destroyed editor.
        el.dispatchEvent(pointer('pointerdown', { clientY: 0 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 300 }));
        expect(editor.root.style.maxHeight).toBe('420px');
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
