/**
 * Wraps the native Fullscreen API (with a CSS-class fallback for browsers
 * that don't support it, e.g. inside cross-origin iframes).
 */
export default class FullscreenModule {
    constructor(editor) {
        this.editor = editor;
        this.active = false;
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
        this.active = false;
    }

    handleChange() {
        if (!document.fullscreenElement) {
            this.editor.wrapper.classList.remove('ife-fullscreen');
            this.active = false;
        }
    }

    destroy() {
        document.removeEventListener('fullscreenchange', this.handleChange);
    }
}
