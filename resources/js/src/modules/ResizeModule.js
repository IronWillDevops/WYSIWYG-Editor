import Localization from '../i18n/Localization.js';

/** Never let the grip collapse the editor below this content height. */
const MIN_HEIGHT = 120;
/** Keyboard resize step: two lines of body text at a time, three with Shift. */
const KEYBOARD_STEP = 32;

/**
 * Manual height resize: a drag grip on the editor's bottom edge.
 *
 * The grip is chrome only — it owns no layout. Every height it produces is
 * written back into the `height` option and then applied by
 * `Editor.applyHeight()`, the single place allowed to size the content area.
 * A manual resize therefore follows exactly the same path as the configured
 * height, so the bounds survive fullscreen, code view, module reloads and
 * `destroy()`, and there is no second, competing height mechanism.
 */
export default class ResizeModule {
    constructor(editor) {
        this.editor = editor;
        this.drag = null;
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);

        this.buildDom();
        this.bindEvents();
    }

    buildDom() {
        this.el = document.createElement('div');
        this.el.className = 'ife-resize-handle';
        // A window splitter is the ARIA role for exactly this: a separator the
        // user drags. Keyboard resizing comes for free from tabindex + arrows.
        this.el.setAttribute('role', 'separator');
        this.el.setAttribute('aria-orientation', 'horizontal');
        this.el.setAttribute('aria-valuemin', String(MIN_HEIGHT));
        this.el.tabIndex = 0;
        this.updateAriaLabel();
        // The grip belongs to the wrapper (which is overflow:hidden), never to
        // the scrolling content area — otherwise it would scroll away with the
        // text instead of staying reachable.
        this.editor.wrapper.appendChild(this.el);
    }

    bindEvents() {
        // Pointer events cover mouse, touch and pen with one code path, and
        // `touch-action: none` on the grip keeps a touch drag from being
        // stolen by the page's pan gesture.
        this.el.addEventListener('pointerdown', this.handlePointerDown);
        this.el.addEventListener('keydown', this.handleKeyDown);
    }

    updateAriaLabel() {
        const locale = this.editor.options.locale ?? 'en';
        this.el.setAttribute('aria-label', Localization.t(locale, 'resizeHandle'));
    }

    /**
     * The content box height in px, measured from the live layout.
     *
     * `min-height`/`max-height` size the *content* box (box-sizing is
     * content-box here), so the padding is excluded — otherwise the first drag
     * step would jump by twice the padding.
     *
     * @returns {number}
     */
    getHeight() {
        const root = this.editor.root;
        const styles = window.getComputedStyle?.(root);
        const padding = styles
            ? (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0)
            : 0;
        return (root.getBoundingClientRect().height || root.offsetHeight) - padding;
    }

    /**
     * The single write path for a user-driven height: the option is the source
     * of truth, `applyHeight()` renders it.
     *
     * @param {number} height px
     */
    setHeight(height) {
        const next = Math.max(MIN_HEIGHT, Math.round(height));
        this.editor.options.height = next;
        this.editor.applyHeight();
        this.updateAriaValue();
    }

    updateAriaValue() {
        this.el.setAttribute('aria-valuenow', String(Math.round(this.getHeight())));
    }

    handlePointerDown(event) {
        // Only a primary click/tap starts a resize; a right-click must still
        // open the context menu.
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        this.drag = {
            startY: event.clientY,
            startHeight: this.getHeight(),
        };
        // The size is measured here rather than at mount, so assistive tech is
        // only told a value once the editor is actually laid out.
        this.updateAriaValue();
        this.editor.wrapper.classList.add('ife-resizing');
        window.addEventListener('pointermove', this.handlePointerMove);
        window.addEventListener('pointerup', this.handlePointerUp);
        window.addEventListener('pointercancel', this.handlePointerUp);
    }

    handlePointerMove(event) {
        if (!this.drag) return;
        this.setHeight(this.drag.startHeight + (event.clientY - this.drag.startY));
    }

    handlePointerUp() {
        if (!this.drag) return;
        this.drag = null;
        this.editor.wrapper.classList.remove('ife-resizing');
        window.removeEventListener('pointermove', this.handlePointerMove);
        window.removeEventListener('pointerup', this.handlePointerUp);
        window.removeEventListener('pointercancel', this.handlePointerUp);
    }

    /** Arrow keys resize in 32px steps, so the grip is usable without a mouse. */
    handleKeyDown(event) {
        const step = event.shiftKey ? KEYBOARD_STEP * 3 : KEYBOARD_STEP;
        let delta = 0;
        if (event.key === 'ArrowUp') delta = -step;
        else if (event.key === 'ArrowDown') delta = step;
        else return;

        event.preventDefault();
        this.setHeight(this.getHeight() + delta);
    }

    destroy() {
        this.handlePointerUp();
        this.el.removeEventListener('pointerdown', this.handlePointerDown);
        this.el.removeEventListener('keydown', this.handleKeyDown);
        this.el.remove();
    }
}
