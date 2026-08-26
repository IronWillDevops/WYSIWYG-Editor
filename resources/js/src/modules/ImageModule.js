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
        this.handleClick = this.handleClick.bind(this);
        this.handleDblClick = this.handleDblClick.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleResizeStart = this.handleResizeStart.bind(this);

        // Delegated on the root (rather than attached per-<img>) so this also
        // covers images that were already present in content loaded via
        // setHTML()/initial textarea value or pasted in, not just ones
        // inserted through this module.
        editor.root.addEventListener('dragover', (e) => e.preventDefault());
        editor.root.addEventListener('drop', this.handleDrop);
        editor.root.addEventListener('click', this.handleClick);
        editor.root.addEventListener('dblclick', this.handleDblClick);
        editor.root.addEventListener('mousedown', this.handleMouseDown);
    }

    open() {
        const existing = this.getSelectedFigure();
        const img = existing?.querySelector('img');
        const figcaption = existing?.querySelector('figcaption');
        const align = ['left', 'center', 'right'].find((value) => existing?.classList.contains(`ife-image--${value}`)) ?? 'center';

        const body = `
            <div class="ife-tabs">
                <label class="ife-field">
                    <span>Image URL</span>
                    <input type="url" name="src" placeholder="https://example.com/image.jpg" value="${this.escape(img?.getAttribute('src') ?? '')}">
                </label>
                <label class="ife-field">
                    <span>Or upload a file</span>
                    <input type="file" name="file" accept="image/*">
                </label>
                <label class="ife-field">
                    <span>Alt text</span>
                    <input type="text" name="alt" value="${this.escape(img?.getAttribute('alt') ?? '')}">
                </label>
                <label class="ife-field">
                    <span>Caption</span>
                    <input type="text" name="caption" value="${this.escape(figcaption?.textContent ?? '')}">
                </label>
                <label class="ife-field">
                    <span>Alignment</span>
                    <select name="align">
                        <option value="none" ${align === 'none' ? 'selected' : ''}>None</option>
                        <option value="left" ${align === 'left' ? 'selected' : ''}>Left</option>
                        <option value="center" ${align === 'center' ? 'selected' : ''}>Center</option>
                        <option value="right" ${align === 'right' ? 'selected' : ''}>Right</option>
                    </select>
                </label>
                <label class="ife-field--inline">
                    <input type="checkbox" name="lazy" ${!existing || img?.loading === 'lazy' ? 'checked' : ''}>
                    <span>Lazy loading</span>
                </label>
            </div>
        `;

        this.dialog = new Dialog(this.editor.wrapper, {
            title: existing ? 'Edit image' : 'Insert image',
            bodyHtml: body,
            confirmLabel: existing ? 'Update' : 'Insert',
            onConfirm: (form) => this.handleSubmit(form, existing),
        });

        this.editor.selection.save();
        this.dialog.open();

        if (existing) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'ife-btn ife-btn--danger';
            removeBtn.textContent = 'Remove image';
            removeBtn.addEventListener('mousedown', (e) => e.preventDefault());
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editor.history.push();
                existing.remove();
                this.editor.emitChange();
                this.dialog.close();
            });
            this.dialog.form.querySelector('.ife-dialog__footer').prepend(removeBtn);
        }
    }

    /** Returns the currently selected/edited image's <figure>, if any. */
    getSelectedFigure() {
        return (
            this.editor.root.querySelector('figure.ife-image--selected') ??
            this.editor.selection.closest('figure.ife-image')
        );
    }

    async handleSubmit(form, existing) {
        const data = new FormData(form);
        const file = data.get('file');
        let src = String(data.get('src') ?? '');

        if (file instanceof File && file.size > 0) {
            src = await this.upload(file);
            if (!src) return;
        }

        if (!src) return;

        const options = {
            src,
            alt: String(data.get('alt') ?? ''),
            caption: String(data.get('caption') ?? ''),
            align: String(data.get('align') ?? 'center'),
            lazy: Boolean(data.get('lazy')),
        };

        if (existing) {
            this.update(existing, options);
        } else {
            this.insert(options);
        }
    }

    /** @param {File} file */
    async upload(file) {
        if (!this.uploadUrl) {
            console.warn('WYSIWYG Editor: no uploadUrl configured, falling back to a local object URL.');
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
        // Only set src when the URL passes safety checks; leave it empty
        // otherwise so a malicious javascript:-link is never loaded.
        if (this.editor.sanitizer.isSafeUrl(src)) {
            img.src = src;
        }
        img.alt = alt;
        if (lazy) img.loading = 'lazy';
        figure.appendChild(img);

        if (caption) {
            const figcaption = document.createElement('figcaption');
            figcaption.textContent = caption;
            figure.appendChild(figcaption);
        }

        const range = this.editor.selection.getRange();
        range?.deleteContents();
        range?.insertNode(figure);

        const newRange = document.createRange();
        newRange.setStartAfter(figure);
        newRange.collapse(true);
        this.editor.selection.setRange(newRange);

        this.editor.emitChange();
    }

    /**
     * Updates an already-inserted <figure class="ife-image"> in place instead
     * of creating a new one, so the "edit image" flow doesn't duplicate it.
     * @param {HTMLElement} figure
     * @param {{src:string, alt:string, caption:string, align:string, lazy:boolean}} options
     */
    update(figure, { src, alt, caption, align, lazy }) {
        this.editor.history.push();

        figure.className = `ife-image ife-image--${align}`;

        const img = figure.querySelector('img');
        if (img) {
            if (this.editor.sanitizer.isSafeUrl(src)) {
                img.src = src;
            }
            img.alt = alt;
            if (lazy) img.setAttribute('loading', 'lazy');
            else img.removeAttribute('loading');
        }

        figure.querySelectorAll('figcaption').forEach((fc) => fc.remove());
        if (caption) {
            const figcaption = document.createElement('figcaption');
            figcaption.textContent = caption;
            figure.appendChild(figcaption);
        }

        figure.classList.remove('ife-image--selected');
        this.editor.emitChange();
    }

    /** Marks the clicked image's <figure> as selected (for edit/resize), or clears selection. */
    handleClick(event) {
        const img = event.target.closest('figure.ife-image img');
        this.editor.root.querySelectorAll('.ife-image--selected').forEach((el) => el.classList.remove('ife-image--selected'));
        if (img) {
            img.closest('figure')?.classList.add('ife-image--selected');
            this.showResizeHandles(img);
        } else {
            this.hideResizeHandles();
        }
    }

    /** Adds visible resize handles around a selected image. */
    showResizeHandles(img) {
        this.hideResizeHandles();
        const container = document.createElement('div');
        container.className = 'ife-image-resize-handles';
        const positions = ['nw', 'ne', 'sw', 'se'];
        positions.forEach((pos) => {
            const handle = document.createElement('div');
            handle.className = `ife-image-resize-handle ife-image-resize-handle--${pos}`;
            handle.addEventListener('mousedown', (e) => this.handleResizeStart(e, img));
            container.appendChild(handle);
        });
        if (img.parentElement) img.parentElement.appendChild(container);
    }

    /** Removes visible resize handles. */
    hideResizeHandles() {
        this.editor.root.querySelectorAll('.ife-image-resize-handles').forEach((el) => el.remove());
    }

    /** Drag-start for visible resize handles. */
    handleResizeStart(event, img) {
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = img.getBoundingClientRect().width;
        const startHeight = img.getBoundingClientRect().height;

        const onMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            const ratio = startWidth / startHeight;
            let newW = Math.max(40, startWidth + dx);
            let newH = Math.max(40, startHeight + dy);
            if (Math.abs(dx) > Math.abs(dy)) {
                newH = newW / ratio;
            } else {
                newW = newH * ratio;
            }
            img.style.width = `${Math.round(newW)}px`;
            img.style.height = `${Math.round(newH)}px`;
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            this.editor.emitChange();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    /** Double-clicking an image opens the edit dialog directly. */
    handleDblClick(event) {
        const img = event.target.closest('figure.ife-image img');
        if (!img) return;
        event.preventDefault();
        this.editor.root.querySelectorAll('.ife-image--selected').forEach((el) => el.classList.remove('ife-image--selected'));
        img.closest('figure')?.classList.add('ife-image--selected');
        this.open();
    }

    /** Alt+drag on an image resizes it (avoids clashing with normal caret placement). */
    handleMouseDown(event) {
        const img = event.target.closest('figure.ife-image img');
        if (!img || !event.altKey) return;
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

    escape(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    destroy() {
        this.dialog?.close();
        this.editor.root.removeEventListener('drop', this.handleDrop);
        this.editor.root.removeEventListener('click', this.handleClick);
        this.editor.root.removeEventListener('dblclick', this.handleDblClick);
        this.editor.root.removeEventListener('mousedown', this.handleMouseDown);
        this.hideResizeHandles();
    }
}
