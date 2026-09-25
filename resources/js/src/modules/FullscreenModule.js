/**
 * Wraps the native Fullscreen API (with a CSS-class fallback for browsers
 * that don't support it, e.g. inside cross-origin iframes).
 */
export default class FullscreenModule {
    constructor(editor) {
        this.editor = editor;
        this.active = false;
        this._previousMinHeight = '';
        this._previousMaxHeight = '';
        this.handleChange = this.handleChange.bind(this);
        document.addEventListener('fullscreenchange', this.handleChange);
    }

    async toggle() {
        if (this.active) {
            await this.exit();
        } else {
            await this.enter();
        }
        return this.active;
    }

    async enter() {
        try {
            if (this.editor.wrapper.requestFullscreen) {
                await this.editor.wrapper.requestFullscreen();
            }
            this.editor.wrapper.classList.add('ife-fullscreen');
            // Lift the content-area height bounds so the fullscreen flex column
            // owns the scrolling (see .ife-fullscreen .ife-content in the
            // stylesheet). Both bounds are inline (applied by buildDom from the
            // `height` option): without lifting max-height the content stays
            // trapped in a fixed-size mini-box over the fullscreen viewport, and
            // a leftover min-height would push the status bar out of a short
            // window instead of letting the content scroll.
            if (this.editor.root) {
                this._previousMinHeight = this.editor.root.style.minHeight;
                this._previousMaxHeight = this.editor.root.style.maxHeight;
                this.editor.root.style.minHeight = '0';
                this.editor.root.style.maxHeight = 'none';
            }
            this.active = true;
        } catch {
            return;
        }
    }

    async exit() {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            }
        } catch {
            // Ignore — element may already have left fullscreen (e.g. Esc key).
        }
        this.editor.wrapper.classList.remove('ife-fullscreen');
        this._restoreHeightBounds();
        this.active = false;
    }

    handleChange() {
        if (!document.fullscreenElement) {
            this.editor.wrapper.classList.remove('ife-fullscreen');
            this._restoreHeightBounds();
            this.active = false;
        }
    }

    /** Puts the editor's previous inline height bounds back ('' = unset). */
    _restoreHeightBounds() {
        if (this.editor.root) {
            this.editor.root.style.minHeight = this._previousMinHeight || '';
            this.editor.root.style.maxHeight = this._previousMaxHeight || '';
        }
        this._previousMinHeight = '';
        this._previousMaxHeight = '';
    }

    destroy() {
        document.removeEventListener('fullscreenchange', this.handleChange);
    }
}