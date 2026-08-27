const DEFAULT_ALLOWED_TAGS = new Set([
    'p', 'br', 'div', 'span', 'a', 'strong', 'em', 'u', 's', 'sup', 'sub',
    'b', 'i', 'strike', 'font',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'mark',
    'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'img', 'figure', 'figcaption', 'video', 'audio', 'source', 'iframe', 'hr',
    'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'text', 'stop', 'defs', 'linearGradient',
    'ellipse', 'clipPath', 'filter', 'feGaussianBlur', 'feOffset', 'feMerge',
    'feMergeNode', 'feColorMatrix', 'feBlend', 'use', 'tspan', 'symbol', 'mask',
]);

const DEFAULT_ALLOWED_ATTRS = {
    '*': new Set(['class', 'style', 'id', 'dir']),
    a: new Set(['href', 'target', 'rel', 'title', 'name']),
    img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
    iframe: new Set(['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder']),
    video: new Set(['src', 'controls', 'width', 'height', 'poster']),
    audio: new Set(['src', 'controls']),
    source: new Set(['src', 'type']),
    td: new Set(['colspan', 'rowspan']),
    th: new Set(['colspan', 'rowspan', 'scope']),
    svg: new Set(['viewBox', 'width', 'height', 'fill', 'xmlns', 'stroke', 'strokeWidth', 'stroke-linecap', 'stroke-linejoin']),
    path: new Set(['d', 'fill', 'stroke', 'strokeWidth', 'stroke-width', 'opacity']),
    circle: new Set(['cx', 'cy', 'r', 'fill', 'stroke', 'strokeWidth']),
    rect: new Set(['x', 'y', 'width', 'height', 'fill', 'rx', 'stroke', 'strokeWidth']),
    line: new Set(['x1', 'y1', 'x2', 'y2', 'stroke', 'strokeWidth']),
    polyline: new Set(['points', 'fill', 'stroke']),
    polygon: new Set(['points', 'fill', 'stroke']),
    g: new Set(['fill', 'stroke', 'opacity']),
    text: new Set(['x', 'y', 'fontSize', 'font-family', 'fill', 'textAnchor', 'text-anchor']),
    stop: new Set(['offset', 'stopColor', 'stop-color']),
    defs: new Set([]),
    linearGradient: new Set(['x1', 'y1', 'x2', 'y2', 'gradientUnits']),
    ellipse: new Set(['cx', 'cy', 'rx', 'ry', 'fill', 'stroke']),
    clipPath: new Set(['id']),
    filter: new Set(['id', 'x', 'y', 'width', 'height']),
    feGaussianBlur: new Set(['in', 'stdDeviation']),
    feOffset: new Set(['in', 'dx', 'dy']),
    feMerge: new Set([]),
    feMergeNode: new Set(['in']),
    feColorMatrix: new Set(['in', 'type', 'values']),
    feBlend: new Set(['in', 'in2', 'mode']),
    use: new Set(['href', 'x', 'y']),
    tspan: new Set(['x', 'dy', 'textAnchor']),
    symbol: new Set(['id', 'viewBox', 'width', 'height']),
    mask: new Set(['id']),
    font: new Set(['color', 'size', 'face']),
    ol: new Set(['start', 'type', 'reversed', 'class', 'style']),
    ul: new Set(['class', 'style']),
};

import { DEFAULT_TEXT_COLORS, DEFAULT_BG_COLORS, normalizeColor } from '../utils/colors.js';

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
        let cleaned = this.stripWordMso(dirtyHtml);
        cleaned = this.decodeDoubleEscapedEntities(cleaned);
        const template = document.createElement('template');
        template.innerHTML = cleaned;
        this.cleanNode(template.content);
        return template.innerHTML;
    }

    /**
     * Decodes HTML entities when content contains no raw HTML tags but does
     * contain entity-encoded tags (e.g. &lt;span&gt;). This handles
     * double-escaped content produced by htmlspecialchars() or similar.
     */
    decodeDoubleEscapedEntities(html) {
        if (!/&[a-z]+;|&#\d+;/i.test(html)) return html;
        const ta = document.createElement('textarea');
        ta.innerHTML = html;
        return ta.value;
    }

    /** Strips Microsoft Word/Copilot mso-* junk, XML wrappers, and empty elements. */
    stripWordMso(html) {
        return html
            .replace(/<!--\[if[^>]*>.*?<!\[endif\]-->/gs, '')
            .replace(/<!--[^>]*-->/g, '')
            .replace(/<(\w+)[^>]*\s(?:class|style)=["'][^"']*?mso-[^"']*["'][^>]*>/gi, (match) => {
                return match.replace(/\s(?:class|style)=["'][^"']*?mso-[^"']*["']/gi, '');
            })
            .replace(/<o:p>[^<]*<\/o:p>/gi, '')
            .replace(/<w:[^>]+>[^<]*<\/w:[^>]+>/gi, '')
            .replace(/<\\?\?(xml|mso)[^>]*>/gi, '')
            .replace(/style=["'][^"']*mso-[^"']*["']/gi, '')
            .replace(/class=["'][^"']*Mso[^"']*["']/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<meta[^>]*>/gi, '')
            .replace(/<link[^>]*>/gi, '')
            .replace(/<span[^>]*>\s*<\/span>/gi, '')
            .replace(/<p[^>]*>\s*<\/p>/gi, '')
            .replace(/&nbsp;/gi, ' ');
    }

    /** @param {Node} root */
    cleanNode(root) {
        const nodes = [...root.childNodes];
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.nodeType !== Node.ELEMENT_NODE) continue;

            const el = /** @type {HTMLElement} */ (node);
            const tag = el.tagName.toLowerCase();

            if (tag === 'script' || tag === 'style' || tag === 'noscript') {
                el.remove();
                continue;
            }

            // Recurse into children first so that unwrapping the current node
            // does not skip its descendants.
            this.cleanNode(el);

            if (!this.allowedTags.has(tag)) {
                this.unwrap(el);
                continue;
            }

            this.cleanAttributes(el, tag);
        }
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
                const cleaned = this.cleanStyle(attr.value);
                if (cleaned) {
                    el.setAttribute('style', cleaned);
                } else {
                    el.removeAttribute('style');
                }
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

    /**
     * Strips dangerous CSS such as expression()/url(javascript:) using a
     * simple regex filter over each declaration. This is sufficient for the
     * common XSS patterns found in pasted content. A full CSS parser would
     * be needed to catch obfuscated variants (e.g. nested expressions,
     * string-encoded javascript: inside url()), but the editor targets
     * typical copy-paste scenarios where a dedicated attacker would use
     * far simpler vectors like <script> or event handlers, which the
     * whitelist-based tag/attr sanitizer already blocks entirely.
     */
    cleanStyle(style) {
        return style
            .split(';')
            .map((decl) => decl.trim())
            .filter((decl) => decl.length > 0)
            .filter((decl) => !/expression\s*\(|javascript:/i.test(decl))
            .filter((decl) => !this.isThemeNeutralColor(decl))
            .join(';');
    }

    /**
     * Drops an inline CSS declaration when it only sets a default/theme-neutral
     * color — black text or white background. These are the values a "no
     * explicit color" selection or a browser paste injects, and letting them
     * reach the saved article couples the content to a light theme. A
     * deliberately chosen non-default color (e.g. `color: red`) is preserved.
     *
     * @param {string} declaration a single `property: value` declaration
     * @returns {boolean} true when the declaration should be removed
     */
    isThemeNeutralColor(declaration) {
        const match = /^([a-z-]+)\s*:\s*(.+)$/i.exec(declaration);
        if (!match) return false;

        const property = match[1].toLowerCase();
        const value = normalizeColor(match[2]);

        if (property === 'color') {
            return DEFAULT_TEXT_COLORS.has(value);
        }
        if (property === 'background-color') {
            return DEFAULT_BG_COLORS.has(value);
        }
        // The `background` shorthand — strip only when it is purely a solid
        // white color, never when it includes an image (a gradient or
        // background image contains something other than a single color).
        if (property === 'background') {
            return this.isSolidBalancedColor(value) && DEFAULT_BG_COLORS.has(value);
        }
        return false;
    }

    /**
     * Reports whether a value is a single balanced `color(...)` expression —
     * i.e. the `background` shorthand contains nothing but a color. Gradient
     * or image backgrounds contain unbalanced parens/`url(` and are skipped.
     * @param {string} value
     * @returns {boolean}
     */
    isSolidBalancedColor(value) {
        if (/url\(/i.test(value)) return false;
        let depth = 0;
        for (const ch of value) {
            if (ch === '(') depth += 1;
            if (ch === ')') depth -= 1;
            if (depth < 0) return false;
        }
        return depth === 0;
    }

    /** @param {HTMLElement} el */
    unwrap(el) {
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
    }
}
