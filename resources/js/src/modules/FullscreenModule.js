/**
 * Wraps the native Fullscreen API (with a CSS-class fallback for browsers
 * that don't support it, e.g. inside cross-origin iframes).
 */
export default class FullscreenModule {
    constructor(editor) {
        this.editor = editor;
        this.active = false;
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
            // Lift the content-area height cap so the fullscreen flex column owns
            // the scrolling (see .ife-fullscreen .ife-content in the stylesheet).
            // Without this, an inline max-height set by buildDom/TableModule
            // would keep the content trapped in a non-scrollable mini-box
            // overlaid on top of the fullscreen viewport.
            if (this.editor.root) {
                this._previousMaxHeight = this.editor.root.style.maxHeight;
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
        this._restoreMaxHeight();
        this.active = false;
    }

    handleChange() {
        if (!document.fullscreenElement) {
            this.editor.wrapper.classList.remove('ife-fullscreen');
            this._restoreMaxHeight();
            this.active = false;
        }
    }

    /** Puts the editor's previous inline max-height back ('' = unset). */
    _restoreMaxHeight() {
        if (this.editor.root) {
            this.editor.root.style.maxHeight = this._previousMaxHeight || '';
        }
        this._previousMaxHeight = '';
    }

    destroy() {
        document.removeEventListener('fullscreenchange', this.handleChange);
    }
}