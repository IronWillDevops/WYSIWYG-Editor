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
     * @param {(form: HTMLFormElement) => void} config.onConfirm
     */
    constructor(container, { title, bodyHtml, confirmLabel = 'OK', cancelLabel = 'Cancel', onConfirm }) {
        this.container = container;
        this.onConfirm = onConfirm;

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
        this.overlay.querySelector('.ife-dialog__close').addEventListener('click', () => this.close());
        this.overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.onConfirm(this.form);
            this.close();
        });

        document.addEventListener('keydown', this.handleEscape);
    }

    handleEscape = (event) => {
        if (event.key === 'Escape') this.close();
    };

    open() {
        const savedScrollY = window.scrollY;
        this.container.appendChild(this.overlay);
        const firstInput = this.form.querySelector('input, textarea, select');
        if (firstInput) {
            firstInput.focus({ preventScroll: true });
        }
        window.scrollTo(0, savedScrollY);
    }

    close() {
        document.removeEventListener('keydown', this.handleEscape);
        this.overlay.remove();
    }
}
