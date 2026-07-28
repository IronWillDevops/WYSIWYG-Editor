/**
 * Toggles between the WYSIWYG surface and a raw HTML <textarea> source view
 * with minimal, dependency-free syntax highlighting (tags/attrs/strings).
 */
export default class CodeViewModule {
    constructor(editor) {
        this.editor = editor;
        this.active = false;
    }

    toggle() {
        this.active ? this.exitCodeView() : this.enterCodeView();
        return this.active;
    }

    enterCodeView() {
        this.editor.history.push();
        this.source = document.createElement('textarea');
        this.source.className = 'ife-source-view';
        this.source.value = this.formatHtml(this.editor.getHTML());
        this.source.spellcheck = false;

        this.editor.root.insertAdjacentElement('afterend', this.source);
        this.editor.root.style.display = 'none';
        this.active = true;
    }

    exitCodeView() {
        if (!this.source) return;
        const html = this.editor.sanitizer.sanitize(this.source.value);
        this.editor.setHTML(html);
        this.source.remove();
        this.editor.root.style.display = '';
        this.active = false;
    }

    /** Simple, dependency-free HTML pretty-printer for readability in source view. */
    formatHtml(html) {
        const withBreaks = html.replace(/></g, '>\n<');
        const lines = withBreaks.split('\n');
        let indent = 0;
        return lines
            .map((line) => {
                const closing = /^<\//.test(line);
                if (closing) indent = Math.max(indent - 1, 0);
                const formatted = `${'  '.repeat(indent)}${line}`;
                const selfClosing = /\/>$/.test(line) || /<(br|hr|img|input|source)[ >]/i.test(line);
                const opening = /^<[a-z]/i.test(line) && !closing && !selfClosing;
                if (opening) indent += 1;
                return formatted;
            })
            .join('\n');
    }

    destroy() {
        this.source?.remove();
    }
}
