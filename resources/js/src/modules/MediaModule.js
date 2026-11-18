import Dialog from '../utils/Dialog.js';

const YOUTUBE_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
const VIMEO_RE = /vimeo\.com\/(\d+)/;

/** Video/audio embedding: YouTube, Vimeo, raw iframe, HTML5 <video>/<audio>. */
export default class MediaModule {
    constructor(editor) {
        this.editor = editor;
        this.dialog = null;
    }

    openVideo() {
        const body = `
            <label class="ife-field">
                <span>YouTube / Vimeo URL, direct .mp4 URL, or raw iframe embed code</span>
                <input type="text" name="source" placeholder="https://www.youtube.com/watch?v=..." required>
            </label>
            <label class="ife-field">
                <span>Width</span>
                <input type="number" name="width" value="640">
            </label>
            <label class="ife-field">
                <span>Height</span>
                <input type="number" name="height" value="360">
            </label>
        `;

        this.editor.selection.save();
        this.dialog = new Dialog(this.editor.wrapper, {
            title: 'Insert video',
            bodyHtml: body,
            confirmLabel: 'Insert',
            onConfirm: (form) => {
                const data = new FormData(form);
                const inserted = this.insertVideo(
                    String(data.get('source')),
                    Number(data.get('width')),
                    Number(data.get('height')),
                );
                // Keep the dialog open when there is nothing to insert.
                if (inserted === false) return false;
                this.dialog = null;
            },
        });
        this.dialog.open();
    }

    insertVideo(source, width, height) {
        const trimmed = String(source ?? '').trim();
        // Whitespace-only input (required passes a single space) — nothing to embed.
        if (!trimmed) return false;

        // Non-positive / NaN dimensions from manual input fall back to defaults
        // instead of rendering width="NaN".
        const w = Number.isFinite(width) && width > 0 ? width : 640;
        const h = Number.isFinite(height) && height > 0 ? height : 360;
        let html;

        if (/^<iframe/i.test(trimmed)) {
            html = trimmed;
        } else if (YOUTUBE_RE.test(trimmed)) {
            const id = trimmed.match(YOUTUBE_RE)[1];
            html = `<iframe width="${w}" height="${h}" src="https://www.youtube.com/embed/${id}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        } else if (VIMEO_RE.test(trimmed)) {
            const id = trimmed.match(VIMEO_RE)[1];
            html = `<iframe width="${w}" height="${h}" src="https://player.vimeo.com/video/${id}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
        } else {
            html = `<video controls width="${w}" height="${h}"><source src="${trimmed}"></video>`;
        }

        this.editor.commands.insertHTML(this.editor.sanitizer.sanitize(html));
        return true;
    }

    openAudio() {
        const body = `
            <label class="ife-field">
                <span>Audio file URL</span>
                <input type="url" name="source" required>
            </label>
        `;

        this.editor.selection.save();
        this.dialog = new Dialog(this.editor.wrapper, {
            title: 'Insert audio',
            bodyHtml: body,
            confirmLabel: 'Insert',
            onConfirm: (form) => {
                const src = String(new FormData(form).get('source') ?? '').trim();
                if (!src) return false;
                const html = `<audio controls><source src="${src}"></audio>`;
                this.editor.commands.insertHTML(this.editor.sanitizer.sanitize(html));
                this.dialog = null;
            },
        });
        this.dialog.open();
    }

    insertHorizontalRule() {
        this.editor.commands.insertHTML('<hr>');
    }

    destroy() {
        // Close an open dialog so its Escape listener and body scroll lock
        // don't outlive the module.
        this.dialog?.close();
        this.dialog = null;
    }
}
