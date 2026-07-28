import Dialog from '../utils/Dialog.js';

/**
 * Image insertion: file upload (to the Laravel upload endpoint), external URL,
 * drag & drop, clipboard paste, plus alignment/caption/alt/lazy-loading options.
 */
export default class ImageModule {
    constructor(editor) {
        this.editor = editor;
        this.uploadUrl = editor.options.uploadUrl;
        this.handleDrop = this.handleDrop.bind(this);
        editor.root.addEventListener('dragover', (e) => e.preventDefault());
        editor.root.addEventListener('drop', this.handleDrop);
    }

    open() {
        const body = `
            <div class="ife-tabs">
                <label class="ife-field">
                    <span>Image URL</span>
                    <input type="url" name="src" placeholder="https://example.com/image.jpg">
                </label>
                <label class="ife-field">
                    <span>Or upload a file</span>
                    <input type="file" name="file" accept="image/*">
                </label>
                <label class="ife-field">
                    <span>Alt text</span>
                    <input type="text" name="alt">
                </label>
                <label class="ife-field">
                    <span>Caption</span>
                    <input type="text" name="caption">
                </label>
                <label class="ife-field">
                    <span>Alignment</span>
                    <select name="align">
                        <option value="none">None</option>
                        <option value="left">Left</option>
                        <option value="center" selected>Center</option>
                        <option value="right">Right</option>
                    </select>
                </label>
                <label class="ife-field--inline">
                    <input type="checkbox" name="lazy" checked>
                    <span>Lazy loading</span>
                </label>
            </div>
        `;

        this.dialog = new Dialog(this.editor.wrapper, {
            title: 'Insert image',
            bodyHtml: body,
            confirmLabel: 'Insert',
            onConfirm: (form) => this.handleSubmit(form),
        });

        this.editor.selection.save();
        this.dialog.open();
    }

    async handleSubmit(form) {
        const data = new FormData(form);
        const file = data.get('file');
        let src = String(data.get('src') ?? '');

        if (file instanceof File && file.size > 0) {
            src = await this.upload(file);
            if (!src) return;
        }

        if (!src) return;

        this.insert({
            src,
            alt: String(data.get('alt') ?? ''),
            caption: String(data.get('caption') ?? ''),
            align: String(data.get('align') ?? 'center'),
            lazy: Boolean(data.get('lazy')),
        });
    }

    /** @param {File} file */
    async upload(file) {
        if (!this.uploadUrl) {
            // eslint-disable-next-line no-console
            console.warn('InkForge Editor: no uploadUrl configured, falling back to a local object URL.');
            return URL.createObjectURL(file);
        }

        const formData = new FormData();
        formData.append('file', file);
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

        try {
            const response = await fetch(this.uploadUrl, {
                method: 'POST',
                headers: csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {},
                body: formData,
                credentials: 'same-origin',
            });
            const json = await response.json();
            if (!response.ok || !json.success) {
                throw new Error(json.message ?? 'Upload failed');
            }
            return json.url;
        } catch (error) {
            this.editor.events.emit('error', error);
            return null;
        }
    }

    /**
     * @param {{src:string, alt:string, caption:string, align:string, lazy:boolean}} options
     */
    insert({ src, alt, caption, align, lazy }) {
        this.editor.history.push();
        this.editor.selection.restore();

        const figure = document.createElement('figure');
        figure.className = `ife-image ife-image--${align}`;

        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        if (lazy) img.loading = 'lazy';
        figure.appendChild(img);

        if (caption) {
            const figcaption = document.createElement('figcaption');
            figcaption.textContent = caption;
            figure.appendChild(figcaption);
        }

        this.makeResizable(img);

        const range = this.editor.selection.getRange();
        range?.deleteContents();
        range?.insertNode(figure);

        this.editor.emitChange();
    }

    /** Adds a simple drag-corner resize handle to an inserted image. */
    makeResizable(img) {
        img.addEventListener('click', () => {
            this.editor.root.querySelectorAll('.ife-image--selected').forEach((el) => el.classList.remove('ife-image--selected'));
            img.closest('figure')?.classList.add('ife-image--selected');
        });

        img.addEventListener('mousedown', (event) => {
            if (!event.altKey) return; // Alt+drag to resize, avoids clashing with normal caret placement.
            event.preventDefault();
            const startX = event.clientX;
            const startWidth = img.getBoundingClientRect().width;

            const onMove = (moveEvent) => {
                const delta = moveEvent.clientX - startX;
                img.style.width = `${Math.max(40, startWidth + delta)}px`;
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                this.editor.emitChange();
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    /** @param {DragEvent} event */
    async handleDrop(event) {
        const file = event.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;

        event.preventDefault();
        const src = await this.upload(file);
        if (!src) return;

        this.editor.selection.save();
        this.insert({ src, alt: '', caption: '', align: 'center', lazy: true });
    }

    destroy() {
        this.dialog?.close();
        this.editor.root.removeEventListener('drop', this.handleDrop);
    }
}
