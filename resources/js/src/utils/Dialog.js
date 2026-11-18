/**
 * Lightweight, dependency-free modal dialog used by Link/Image/Table modules.
 * Renders inside the editor wrapper so it inherits the current theme.
 */
export default class Dialog {
    /**
     * @param {HTMLElement} container element the dialog is appended to (editor wrapper)
     * @param {object} config
     * @param {string} config.title
     * @param {string} config.bodyHtml
     * @param {string} [config.confirmLabel]
     * @param {string} [config.cancelLabel]
     * @param {(form: HTMLFormElement) => void|false} config.onConfirm return
     *   `false` to keep the dialog open (e.g. when the submitted input is
     *   invalid); any other value closes it after the handler runs
     * @param {() => void} [config.onClose]
     */
    constructor(container, { title, bodyHtml, confirmLabel = 'OK', cancelLabel = 'Cancel', onConfirm, onClose }) {
        this.container = container;
        this.onConfirm = onConfirm;
        this.onClose = onClose;
        // The dialog starts "closed": the Escape listener is only registered
        // by open(), so a dialog that is constructed but never shown (or
        // destroyed before it opens) never leaks a document-level listener.
        this._closed = true;

        this.overlay = document.createElement('div');
        this.overlay.className = 'ife-dialog-overlay';
        this.overlay.innerHTML = `
            <form class="ife-dialog" role="dialog" aria-modal="true" aria-label="${title}">
                <header class="ife-dialog__header">
                    <h2>${title}</h2>
                    <button type="button" class="ife-dialog__close" aria-label="Close">&times;</button>
                </header>
                <div class="ife-dialog__body">${bodyHtml}</div>
                <footer class="ife-dialog__footer">
                    <button type="button" class="ife-btn ife-btn--ghost" data-action="cancel">${cancelLabel}</button>
                    <button type="submit" class="ife-btn ife-btn--primary" data-action="confirm">${confirmLabel}</button>
                </footer>
            </form>
        `;

        this.form = this.overlay.querySelector('form');

        this.overlay.querySelectorAll('button, input, select, textarea').forEach((el) => {
            el.addEventListener('click', (e) => e.stopPropagation());
            el.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape') e.stopPropagation();
            });
        });
        this.overlay.querySelectorAll('button').forEach((el) => {
            el.addEventListener('mousedown', (e) => e.preventDefault());
        });

        this.overlay.querySelector('.ife-dialog__close').addEventListener('click', () => this.close());
        this.overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // A handler that returns `false` signals invalid input and asks
            // for the dialog to stay open so the user can correct it.
            if (this.onConfirm(this.form) === false) return;
            this.close();
        });
    }

    handleEscape = (event) => {
        if (event.key === 'Escape') this.close();
    };

    open() {
        this._closed = false;
        document.addEventListener('keydown', this.handleEscape);
        this.scrollPos = { x: window.scrollX, y: window.scrollY };
        this.containerScrollTop = this.container.scrollTop;
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;

        document.body.appendChild(this.overlay);

        const wrapperStyle = getComputedStyle(this.container);
        const ifeVars = [
            '--ife-bg', '--ife-text', '--ife-border', '--ife-toolbar-bg',
            '--ife-btn-hover', '--ife-btn-active', '--ife-accent',
            '--ife-danger', '--ife-radius', '--ife-font',
        ];
        ifeVars.forEach((v) => {
            this.overlay.style.setProperty(v, wrapperStyle.getPropertyValue(v));
        });

        const firstInput = this.form.querySelector('input, textarea, select');
        firstInput?.focus({ preventScroll: true });
    }

    close() {
        // Idempotent: destroy()/submit/Escape may race; running the teardown
        // twice would fire onClose again and clobber document.body styles.
        if (this._closed) return;
        this._closed = true;
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        if (this.scrollPos) {
            window.scrollTo(this.scrollPos.x, this.scrollPos.y);
        }
        this.container.scrollTop = this.containerScrollTop ?? 0;
        document.removeEventListener('keydown', this.handleEscape);
        this.overlay.remove();
        if (this.onClose) this.onClose();
    }
}
