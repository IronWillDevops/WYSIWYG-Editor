const DEFAULT_ALLOWED_TAGS = new Set([
    'p', 'br', 'div', 'span', 'a', 'strong', 'em', 'u', 's', 'sup', 'sub',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
    'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'img', 'figure', 'figcaption', 'video', 'audio', 'source', 'iframe', 'hr',
]);

const DEFAULT_ALLOWED_ATTRS = {
    '*': new Set(['class', 'style', 'id']),
    a: new Set(['href', 'target', 'rel', 'title']),
    img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
    iframe: new Set(['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder']),
    video: new Set(['src', 'controls', 'width', 'height', 'poster']),
    audio: new Set(['src', 'controls']),
    source: new Set(['src', 'type']),
};

const ALLOWED_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:', '']);

/**
 * Whitelist-based HTML sanitizer. Strips <script>, event handler attributes
 * (onclick, onerror, ...), javascript: URLs and any tag/attribute not
 * explicitly allowed. Used both for pasted content and for the editor's
 * serialized output.
 */
export default class Sanitizer {
    /**
     * @param {object} [options]
     * @param {string[]} [options.allowedTags]
     * @param {Record<string, string[]>} [options.allowedAttributes]
     * @param {string[]} [options.allowedUrlSchemes]
     */
    constructor(options = {}) {
        this.allowedTags = options.allowedTags ? new Set(options.allowedTags) : DEFAULT_ALLOWED_TAGS;
        this.allowedAttrs = options.allowedAttributes
            ? Object.fromEntries(Object.entries(options.allowedAttributes).map(([k, v]) => [k, new Set(v)]))
            : DEFAULT_ALLOWED_ATTRS;
        this.allowedSchemes = options.allowedUrlSchemes
            ? new Set(options.allowedUrlSchemes.map((s) => `${s}:`))
            : ALLOWED_URL_SCHEMES;
    }

    /**
     * @param {string} dirtyHtml
     * @returns {string} sanitized HTML
     */
    sanitize(dirtyHtml) {
        const template = document.createElement('template');
        template.innerHTML = dirtyHtml;
        this.cleanNode(template.content);
        return template.innerHTML;
    }

    /** @param {Node} root */
    cleanNode(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
        const toRemove = [];
        let node = walker.nextNode();

        while (node) {
            const el = /** @type {HTMLElement} */ (node);
            const tag = el.tagName.toLowerCase();

            if (tag === 'script' || tag === 'style' || tag === 'noscript') {
                toRemove.push(el);
                node = walker.nextNode();
                continue;
            }

            if (!this.allowedTags.has(tag)) {
                // Unwrap unknown tags instead of deleting their (possibly safe) content.
                this.unwrap(el);
                node = walker.nextNode();
                continue;
            }

            this.cleanAttributes(el, tag);
            node = walker.nextNode();
        }

        toRemove.forEach((el) => el.remove());
    }

    /**
     * @param {HTMLElement} el
     * @param {string} tag
     */
    cleanAttributes(el, tag) {
        const allowedGlobal = this.allowedAttrs['*'] ?? new Set();
        const allowedForTag = this.allowedAttrs[tag] ?? new Set();

        [...el.attributes].forEach((attr) => {
            const name = attr.name.toLowerCase();

            if (name.startsWith('on')) {
                el.removeAttribute(attr.name);
                return;
            }

            if (!allowedGlobal.has(name) && !allowedForTag.has(name)) {
                el.removeAttribute(attr.name);
                return;
            }

            if ((name === 'href' || name === 'src') && !this.isSafeUrl(attr.value)) {
                el.removeAttribute(attr.name);
            }

            if (name === 'style') {
                el.setAttribute('style', this.cleanStyle(attr.value));
            }
        });
    }

    /** @param {string} value */
    isSafeUrl(value) {
        const trimmed = value.trim();
        if (trimmed.startsWith('#') || trimmed.startsWith('/')) return true;
        try {
            const url = new URL(trimmed, window.location.href);
            return this.allowedSchemes.has(url.protocol);
        } catch {
            return false;
        }
    }

    /** Strips dangerous CSS such as expression()/url(javascript:). */
    cleanStyle(style) {
        return style
            .split(';')
            .filter((decl) => !/expression\s*\(|javascript:/i.test(decl))
            .join(';');
    }

    /** @param {HTMLElement} el */
    unwrap(el) {
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
    }
}
