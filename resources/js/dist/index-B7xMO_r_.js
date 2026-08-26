var T = Object.defineProperty;
var M = (s, e, t) => e in s ? T(s, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : s[e] = t;
var C = (s, e, t) => M(s, typeof e != "symbol" ? e + "" : e, t);
class z {
  constructor() {
    this.listeners = /* @__PURE__ */ new Map();
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => void} handler
   * @returns {() => void} unsubscribe function
   */
  on(e, t) {
    return this.listeners.has(e) || this.listeners.set(e, /* @__PURE__ */ new Set()), this.listeners.get(e).add(t), () => this.off(e, t);
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => void} handler
   */
  off(e, t) {
    var n;
    (n = this.listeners.get(e)) == null || n.delete(t);
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => void} handler
   */
  once(e, t) {
    const n = (...o) => {
      this.off(e, n), t(...o);
    };
    this.on(e, n);
  }
  /**
   * @param {string} event
   * @param {...any} args
   */
  emit(e, ...t) {
    const n = this.listeners.get(e);
    n && [...n].forEach((o) => o(...t));
  }
  destroy() {
    this.listeners.clear();
  }
}
class x {
  /**
   * @param {HTMLElement} root contenteditable element
   */
  constructor(e) {
    this.root = e;
  }
  /** @returns {globalThis.Selection|null} */
  getNativeSelection() {
    return window.getSelection ? window.getSelection() : null;
  }
  /** @returns {Range|null} */
  getRange() {
    const e = this.getNativeSelection();
    if (!e || e.rangeCount === 0) return null;
    const t = e.getRangeAt(0);
    return this.root.contains(t.commonAncestorContainer) ? t : null;
  }
  /** @param {Range} range */
  setRange(e) {
    const t = this.getNativeSelection();
    t && (t.removeAllRanges(), t.addRange(e));
  }
  /** Save the current range so it can be restored after a toolbar click blurs the editor. */
  save() {
    const e = this.getRange();
    return this.savedRange = e ? e.cloneRange() : null, this.savedRange;
  }
  restore() {
    this.savedRange && (this.root.focus({ preventScroll: !0 }), this.setRange(this.savedRange));
  }
  collapseToEnd() {
    const e = document.createRange();
    e.selectNodeContents(this.root), e.collapse(!1), this.setRange(e);
  }
  isCollapsed() {
    var e;
    return ((e = this.getNativeSelection()) == null ? void 0 : e.isCollapsed) ?? !0;
  }
  /** @returns {string} plain text of the current selection */
  getText() {
    var e;
    return ((e = this.getNativeSelection()) == null ? void 0 : e.toString()) ?? "";
  }
  /**
   * Returns the closest ancestor element matching selector, bounded by root.
   * @param {string} selector
   * @returns {HTMLElement|null}
   */
  closest(e) {
    const t = this.getRange();
    if (!t) return null;
    let n = t.commonAncestorContainer;
    for (n.nodeType === Node.TEXT_NODE && (n = n.parentElement); n && n !== this.root.parentElement; ) {
      if (n instanceof HTMLElement && n.matches(e)) return n;
      n = n.parentElement;
    }
    return null;
  }
  /**
   * Returns block-level ancestor of the current selection (p, h1-h6, li, blockquote, pre...).
   * @returns {HTMLElement|null}
   */
  getBlockElement() {
    const e = this.getRange();
    if (!e) return null;
    let t = e.commonAncestorContainer;
    t.nodeType === Node.TEXT_NODE && (t = t.parentElement);
    const n = /* @__PURE__ */ new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "LI", "DIV"]);
    for (; t && t !== this.root; ) {
      if (t instanceof HTMLElement && n.has(t.tagName)) return t;
      t = t.parentElement;
    }
    return null;
  }
  /**
   * Wraps the current selection in a new element, splitting text nodes as needed.
   * @param {string} tagName
   * @returns {HTMLElement|null}
   */
  wrap(e) {
    const t = this.getRange();
    if (!t) return null;
    const n = document.createElement(e);
    try {
      t.surroundContents(n);
    } catch {
      const i = t.extractContents();
      n.appendChild(i), t.insertNode(n);
    }
    const o = document.createRange();
    return o.selectNodeContents(n), this.setRange(o), n;
  }
  focus() {
    this.root.focus(), this.restore();
  }
}
class N {
  /**
   * @param {object} options
   * @param {() => string} options.getContent
   * @param {(html: string) => void} options.setContent
   * @param {number} [options.maxSteps]
   * @param {number} [options.debounceMs]
   * @param {() => void} [options.saveBookmark]
   * @param {(bookmark: object) => void} [options.restoreBookmark]
   * @param {(event: string) => void} [options.onChange]
   */
  constructor({ getContent: e, setContent: t, maxSteps: n = 1e3, debounceMs: o = 300, saveBookmark: i, restoreBookmark: r, onChange: d }) {
    this.getContent = e, this.setContent = t, this.maxSteps = n, this.debounceMs = o, this.saveBookmark = i ?? (() => null), this.restoreBookmark = r ?? (() => {
    }), this.onChange = d ?? (() => {
    }), this.undoStack = [], this.redoStack = [], this.timer = null, this.isRestoring = !1, this.undoStack.push({ html: this.getContent(), bookmark: null });
  }
  /** Called on every input event; batches rapid keystrokes into one snapshot. */
  record() {
    this.isRestoring || (clearTimeout(this.timer), this.timer = setTimeout(() => this.push(), this.debounceMs));
  }
  /** Force-record immediately (e.g. before a toolbar command mutates content). */
  push() {
    if (this.isRestoring) return;
    const e = this.getContent(), t = this.undoStack[this.undoStack.length - 1];
    e !== t.html && (this.undoStack.push({ html: e, bookmark: this.saveBookmark() }), this.undoStack.length > this.maxSteps && this.undoStack.shift(), this.redoStack = []);
  }
  canUndo() {
    return this.undoStack.length > 1;
  }
  canRedo() {
    return this.redoStack.length > 0;
  }
  undo() {
    if (clearTimeout(this.timer), !this.canUndo()) return;
    const e = this.undoStack.pop();
    this.redoStack.push(e);
    const t = this.undoStack[this.undoStack.length - 1];
    this.isRestoring = !0, this.setContent(t.html), this.restoreBookmark(t.bookmark), this.isRestoring = !1, this.onChange("undo");
  }
  redo() {
    if (!this.canRedo()) return;
    const e = this.redoStack.pop();
    this.undoStack.push(e), this.isRestoring = !0, this.setContent(e.html), this.restoreBookmark(e.bookmark), this.isRestoring = !1, this.onChange("redo");
  }
  clear() {
    clearTimeout(this.timer), this.undoStack = [{ html: this.getContent(), bookmark: null }], this.redoStack = [];
  }
  destroy() {
    clearTimeout(this.timer), this.undoStack = [], this.redoStack = [];
  }
}
class R {
  /**
   * @param {import('./Editor').default} editor
   */
  constructor(e) {
    this.editor = e;
  }
  get root() {
    return this.editor.root;
  }
  get selection() {
    return this.editor.selection;
  }
  /** Ensures the root has focus and the saved selection is active before mutating. */
  prepare() {
    this.root.focus(), this.selection.restore();
    try {
      document.execCommand("styleWithCSS", !1, !0);
    } catch {
    }
  }
  exec(e, t = null) {
    switch (this.prepare(), this.editor.history.push(), e) {
      case "bold":
      case "italic":
      case "underline":
      case "strikeThrough":
      case "indent":
      case "outdent":
      case "justifyLeft":
      case "justifyCenter":
      case "justifyRight":
      case "justifyFull":
        document.execCommand(e, !1, t ?? void 0);
        break;
      case "superscript":
      case "subscript":
        try {
          document.execCommand("styleWithCSS", !1, !1);
        } catch {
        }
        document.execCommand(e, !1, t ?? void 0);
        try {
          document.execCommand("styleWithCSS", !1, !0);
        } catch {
        }
        break;
      case "insertUnorderedList":
        this.toggleList("ul");
        break;
      case "insertOrderedList":
        this.toggleList("ol");
        break;
      case "foreColor":
        t ? document.execCommand("foreColor", !1, t) : this.clearColor("color");
        break;
      case "backColor":
        t ? document.execCommand("hiliteColor", !1, t) : this.clearColor("backgroundColor");
        break;
      case "lineHeight":
        this.setInlineStyle("lineHeight", t, !0);
        break;
      case "direction":
        this.setDirection(t);
        break;
      case "removeFormat":
        document.execCommand("removeFormat", !1), this.clearInlineStyles();
        break;
      default:
        throw new Error(`Unknown command: ${e}`);
    }
    this.editor.emitChange(), this.editor.events.emit("selectionchange", this.editor);
  }
  queryState(e) {
    try {
      return document.queryCommandState(e);
    } catch {
      return !1;
    }
  }
  /**
   * Sets the text direction (ltr/rtl) on the current block element.
   * @param {'ltr'|'rtl'} dir
   */
  setDirection(e) {
    const t = this.selection.getBlockElement();
    if (t) {
      t.dir = e;
      return;
    }
  }
  /**
   * Applies an inline CSS property to the current selection by wrapping it in a <span>.
   * @param {string} cssProperty camelCase property name
   * @param {string} value
   * @param {boolean} [onBlock] apply to the enclosing block instead of wrapping inline
   */
  setInlineStyle(e, t, n = !1) {
    if (n) {
      const r = this.selection.getBlockElement();
      if (r) {
        r.style[e] = t;
        return;
      }
    }
    const o = this.selection.closest("span");
    if (o) {
      o.style[e] = t;
      return;
    }
    const i = this.selection.wrap("span");
    i && (i.style[e] = t);
  }
  /**
   * Toggles the current selection in/out of a <ul>/<ol> list, or converts
   * it from one list type to the other. Implemented by hand (instead of
   * relying on execCommand('insertUnorderedList'/'insertOrderedList'))
   * because that command is notoriously inconsistent across browsers when
   * the contenteditable root is a plain <div> with mixed block children
   * (as this editor's root is): it can silently no-op, or fail to remove
   * the list on a second click. Manual DOM manipulation gives predictable,
   * cross-browser behavior and matches how blockFormat is already handled.
   * @param {'ul'|'ol'} listTag
   */
  toggleList(e) {
    const t = this.selection.getRange();
    if (!t) return;
    const n = this.selection.closest("li");
    if (n) {
      const d = n.closest("ul, ol");
      d && d.tagName.toLowerCase() === e ? this.unwrapList(d) : d && this.convertList(d, e);
      return;
    }
    const o = this.getBlocksInRange(t);
    if (!o.length) return;
    const i = document.createElement(e);
    o.forEach((d) => {
      const a = document.createElement("li");
      a.innerHTML = d.innerHTML || "<br>", i.appendChild(a);
    }), o[0].replaceWith(i), o.slice(1).forEach((d) => d.remove());
    const r = document.createRange();
    r.selectNodeContents(i.lastElementChild), r.collapse(!1), this.selection.setRange(r);
  }
  /**
   * Finds the top-level block elements (paragraphs, headings, etc.)
   * touched by a range, so multi-line selections can become a single list.
   * @param {Range} range
   * @returns {HTMLElement[]}
   */
  getBlocksInRange(e) {
    const t = /* @__PURE__ */ new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "DIV"]), n = (a) => {
      let l = a.nodeType === Node.TEXT_NODE ? a.parentElement : a;
      for (; l && l !== this.root; ) {
        if (l instanceof HTMLElement && l.parentElement === this.root && t.has(l.tagName))
          return l;
        l = l.parentElement;
      }
      return null;
    }, o = n(e.startContainer);
    if (!o) return [];
    const i = n(e.endContainer) ?? o;
    if (o === i) return [o];
    const r = [];
    let d = o;
    for (; d && (r.push(d), d !== i); )
      d = d.nextElementSibling;
    return r.length ? r : [o];
  }
  /** @param {HTMLElement} list @param {'ul'|'ol'} listTag */
  convertList(e, t) {
    const n = document.createElement(t);
    n.className = e.className, n.innerHTML = e.innerHTML, e.replaceWith(n);
    const o = document.createRange();
    o.selectNodeContents(n), o.collapse(!1), this.selection.setRange(o);
  }
  /** Removes a list, turning each <li> back into a plain paragraph. @param {HTMLElement} list */
  unwrapList(e) {
    const t = document.createDocumentFragment();
    [...e.children].forEach((o) => {
      if (o.tagName !== "LI") return;
      const i = document.createElement("p");
      i.innerHTML = o.innerHTML || "<br>", t.appendChild(i);
    });
    const n = t.lastElementChild;
    if (e.replaceWith(t), n) {
      const o = document.createRange();
      o.selectNodeContents(n), o.collapse(!1), this.selection.setRange(o);
    }
  }
  /**
   * Removes a specific CSS property from every element touched by
   * the current selection. Used by the color button "clear" action.
   * @param {string} cssProp camelCase property name (e.g. 'color', 'backgroundColor')
   */
  clearColor(e) {
    var i;
    const t = this.selection.getRange();
    if (!t) return;
    let n = t.commonAncestorContainer;
    if (n.nodeType === Node.TEXT_NODE && (n = n.parentElement), !(n instanceof HTMLElement)) return;
    ((i = n.style) != null && i.length ? [n, ...n.querySelectorAll("*")] : [...n.querySelectorAll("*")]).forEach((r) => {
      var d;
      try {
        if (!t.intersectsNode(r)) return;
      } catch {
        return;
      }
      if ((d = r.style) != null && d[e] && (r.style[e] = "", r.style.length === 0 && r.removeAttribute("style")), ["SPAN", "FONT"].includes(r.tagName) && r.attributes.length === 0) {
        const a = r.parentNode;
        if (!a) return;
        for (; r.firstChild; ) a.insertBefore(r.firstChild, r);
        a.removeChild(r);
      }
    });
  }
  /**
   * Strips leftover inline style attributes (text color, background,
   * font, etc.) from every element touched by the current selection.
   * Backs the "clear formatting" / "reset text color" toolbar action.
   */
  clearInlineStyles() {
    var o;
    const e = this.selection.getRange();
    if (!e) return;
    let t = e.commonAncestorContainer;
    if (t.nodeType === Node.TEXT_NODE && (t = t.parentElement), !(t instanceof HTMLElement)) return;
    ((o = t.style) != null && o.length ? [t, ...t.querySelectorAll("*")] : [...t.querySelectorAll("*")]).forEach((i) => {
      if (!(!this.root.contains(i) || !e.intersectsNode(i)) && (i.removeAttribute("style"), ["SPAN", "FONT"].includes(i.tagName) && i.attributes.length === 0)) {
        const r = i.parentNode;
        if (!r) return;
        for (; i.firstChild; ) r.insertBefore(i.firstChild, i);
        r.removeChild(i);
      }
    });
  }
  /** Inserts raw (already sanitized) HTML at the current caret position. */
  insertHTML(e) {
    this.prepare(), this.editor.history.push();
    const t = this.selection.getRange();
    if (!t) return;
    t.deleteContents();
    const n = t.createContextualFragment(e), o = n.lastChild;
    if (t.insertNode(n), o) {
      const i = document.createRange();
      i.setStartAfter(o), i.collapse(!0), this.selection.setRange(i);
    }
    this.editor.emitChange();
  }
}
const B = /* @__PURE__ */ new Set([
  "p",
  "br",
  "div",
  "span",
  "a",
  "strong",
  "em",
  "u",
  "s",
  "sup",
  "sub",
  "b",
  "i",
  "strike",
  "font",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "code",
  "mark",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "img",
  "figure",
  "figcaption",
  "video",
  "audio",
  "source",
  "iframe",
  "hr",
  "svg",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "g",
  "text",
  "stop",
  "defs",
  "linearGradient",
  "ellipse",
  "clipPath",
  "filter",
  "feGaussianBlur",
  "feOffset",
  "feMerge",
  "feMergeNode",
  "feColorMatrix",
  "feBlend",
  "use",
  "tspan",
  "symbol",
  "mask"
]), A = {
  "*": /* @__PURE__ */ new Set(["class", "style", "id", "dir"]),
  a: /* @__PURE__ */ new Set(["href", "target", "rel", "title", "name"]),
  img: /* @__PURE__ */ new Set(["src", "alt", "title", "width", "height", "loading"]),
  iframe: /* @__PURE__ */ new Set(["src", "width", "height", "allow", "allowfullscreen", "frameborder"]),
  video: /* @__PURE__ */ new Set(["src", "controls", "width", "height", "poster"]),
  audio: /* @__PURE__ */ new Set(["src", "controls"]),
  source: /* @__PURE__ */ new Set(["src", "type"]),
  td: /* @__PURE__ */ new Set(["colspan", "rowspan"]),
  th: /* @__PURE__ */ new Set(["colspan", "rowspan", "scope"]),
  svg: /* @__PURE__ */ new Set(["viewBox", "width", "height", "fill", "xmlns", "stroke", "strokeWidth", "stroke-linecap", "stroke-linejoin"]),
  path: /* @__PURE__ */ new Set(["d", "fill", "stroke", "strokeWidth", "stroke-width", "opacity"]),
  circle: /* @__PURE__ */ new Set(["cx", "cy", "r", "fill", "stroke", "strokeWidth"]),
  rect: /* @__PURE__ */ new Set(["x", "y", "width", "height", "fill", "rx", "stroke", "strokeWidth"]),
  line: /* @__PURE__ */ new Set(["x1", "y1", "x2", "y2", "stroke", "strokeWidth"]),
  polyline: /* @__PURE__ */ new Set(["points", "fill", "stroke"]),
  polygon: /* @__PURE__ */ new Set(["points", "fill", "stroke"]),
  g: /* @__PURE__ */ new Set(["fill", "stroke", "opacity"]),
  text: /* @__PURE__ */ new Set(["x", "y", "fontSize", "font-family", "fill", "textAnchor", "text-anchor"]),
  stop: /* @__PURE__ */ new Set(["offset", "stopColor", "stop-color"]),
  defs: /* @__PURE__ */ new Set([]),
  linearGradient: /* @__PURE__ */ new Set(["x1", "y1", "x2", "y2", "gradientUnits"]),
  ellipse: /* @__PURE__ */ new Set(["cx", "cy", "rx", "ry", "fill", "stroke"]),
  clipPath: /* @__PURE__ */ new Set(["id"]),
  filter: /* @__PURE__ */ new Set(["id", "x", "y", "width", "height"]),
  feGaussianBlur: /* @__PURE__ */ new Set(["in", "stdDeviation"]),
  feOffset: /* @__PURE__ */ new Set(["in", "dx", "dy"]),
  feMerge: /* @__PURE__ */ new Set([]),
  feMergeNode: /* @__PURE__ */ new Set(["in"]),
  feColorMatrix: /* @__PURE__ */ new Set(["in", "type", "values"]),
  feBlend: /* @__PURE__ */ new Set(["in", "in2", "mode"]),
  use: /* @__PURE__ */ new Set(["href", "x", "y"]),
  tspan: /* @__PURE__ */ new Set(["x", "dy", "textAnchor"]),
  symbol: /* @__PURE__ */ new Set(["id", "viewBox", "width", "height"]),
  mask: /* @__PURE__ */ new Set(["id"]),
  font: /* @__PURE__ */ new Set(["color", "size", "face"]),
  ol: /* @__PURE__ */ new Set(["start", "type", "reversed", "class", "style"]),
  ul: /* @__PURE__ */ new Set(["class", "style"])
}, V = /* @__PURE__ */ new Set(["http:", "https:", "mailto:", "tel:", ""]);
class I {
  /**
   * @param {object} [options]
   * @param {string[]} [options.allowedTags]
   * @param {Record<string, string[]>} [options.allowedAttributes]
   * @param {string[]} [options.allowedUrlSchemes]
   */
  constructor(e = {}) {
    this.allowedTags = e.allowedTags ? new Set(e.allowedTags) : B, this.allowedAttrs = e.allowedAttributes ? Object.fromEntries(Object.entries(e.allowedAttributes).map(([t, n]) => [t, new Set(n)])) : A, this.allowedSchemes = e.allowedUrlSchemes ? new Set(e.allowedUrlSchemes.map((t) => `${t}:`)) : V;
  }
  /**
   * @param {string} dirtyHtml
   * @returns {string} sanitized HTML
   */
  sanitize(e) {
    let t = this.stripWordMso(e);
    t = this.decodeDoubleEscapedEntities(t);
    const n = document.createElement("template");
    return n.innerHTML = t, this.cleanNode(n.content), n.innerHTML;
  }
  /**
   * Decodes HTML entities when content contains no raw HTML tags but does
   * contain entity-encoded tags (e.g. &lt;span&gt;). This handles
   * double-escaped content produced by htmlspecialchars() or similar.
   */
  decodeDoubleEscapedEntities(e) {
    if (/<[a-z][\s\S]*>/i.test(e) || !/&[a-z]+;|&#\d+;/i.test(e)) return e;
    const t = document.createElement("textarea");
    return t.innerHTML = e, t.value;
  }
  /** Strips Microsoft Word/Copilot mso-* junk, XML wrappers, and empty elements. */
  stripWordMso(e) {
    return e.replace(/<!--\[if[^>]*>.*?<!\[endif\]-->/gs, "").replace(/<!--[^>]*-->/g, "").replace(/<(\w+)[^>]*\s(?:class|style)=["'][^"']*?mso-[^"']*["'][^>]*>/gi, (t) => t.replace(/\s(?:class|style)=["'][^"']*?mso-[^"']*["']/gi, "")).replace(/<o:p>[^<]*<\/o:p>/gi, "").replace(/<w:[^>]+>[^<]*<\/w:[^>]+>/gi, "").replace(/<\\?\?(xml|mso)[^>]*>/gi, "").replace(/style=["'][^"']*mso-[^"']*["']/gi, "").replace(/class=["'][^"']*Mso[^"']*["']/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<meta[^>]*>/gi, "").replace(/<link[^>]*>/gi, "").replace(/<span[^>]*>\s*<\/span>/gi, "").replace(/<p[^>]*>\s*<\/p>/gi, "").replace(/&nbsp;/gi, " ");
  }
  /** @param {Node} root */
  cleanNode(e) {
    const t = [...e.childNodes];
    for (let n = 0; n < t.length; n++) {
      const o = t[n];
      if (o.nodeType !== Node.ELEMENT_NODE) continue;
      const i = (
        /** @type {HTMLElement} */
        o
      ), r = i.tagName.toLowerCase();
      if (r === "script" || r === "style" || r === "noscript") {
        i.remove();
        continue;
      }
      if (this.cleanNode(i), !this.allowedTags.has(r)) {
        this.unwrap(i);
        continue;
      }
      this.cleanAttributes(i, r);
    }
  }
  /**
   * @param {HTMLElement} el
   * @param {string} tag
   */
  cleanAttributes(e, t) {
    const n = this.allowedAttrs["*"] ?? /* @__PURE__ */ new Set(), o = this.allowedAttrs[t] ?? /* @__PURE__ */ new Set();
    [...e.attributes].forEach((i) => {
      const r = i.name.toLowerCase();
      if (r.startsWith("on")) {
        e.removeAttribute(i.name);
        return;
      }
      if (!n.has(r) && !o.has(r)) {
        e.removeAttribute(i.name);
        return;
      }
      (r === "href" || r === "src") && !this.isSafeUrl(i.value) && e.removeAttribute(i.name), r === "style" && e.setAttribute("style", this.cleanStyle(i.value));
    });
  }
  /** @param {string} value */
  isSafeUrl(e) {
    const t = e.trim();
    if (t.startsWith("#") || t.startsWith("/")) return !0;
    try {
      const n = new URL(t, window.location.href);
      return this.allowedSchemes.has(n.protocol);
    } catch {
      return !1;
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
  cleanStyle(e) {
    return e.split(";").filter((t) => !/expression\s*\(|javascript:/i.test(t)).join(";");
  }
  /** @param {HTMLElement} el */
  unwrap(e) {
    const t = e.parentNode;
    if (t) {
      for (; e.firstChild; ) t.insertBefore(e.firstChild, e);
      t.removeChild(e);
    }
  }
}
const D = {
  theme: "auto",
  locale: "en",
  height: 420,
  history: { max_steps: 1e3, debounce_ms: 300 },
  autosave: { enabled: !1, interval_ms: 15e3, storage_key: "inkforge-editor-autosave" }
}, S = /* @__PURE__ */ new Map();
class E {
  /**
   * @param {HTMLTextAreaElement} textarea
   * @param {EditorOptions} options
   */
  constructor(e, t = {}) {
    var n, o;
    this.textarea = e, this.options = { ...D, ...t }, this.events = new z(), this.sanitizer = new I(this.options.sanitizer), this.plugins = /* @__PURE__ */ new Map(), this.buildDom(), this.selection = new x(this.root), this.commands = new R(this), this.history = new N({
      getContent: () => this.root.innerHTML,
      setContent: (i) => {
        this.root.innerHTML = i;
      },
      saveBookmark: () => this.saveSelectionBookmark(),
      restoreBookmark: (i) => this.restoreSelectionBookmark(i),
      maxSteps: ((n = this.options.history) == null ? void 0 : n.max_steps) ?? 1e3,
      debounceMs: ((o = this.options.history) == null ? void 0 : o.debounce_ms) ?? 300,
      onChange: (i) => this.events.emit(i)
    }), this.handleShortcut = this.handleShortcut.bind(this), this.handleTableTab = this.handleTableTab.bind(this), this.handleEnter = this.handleEnter.bind(this), this.handleDragOver = this.handleDragOver.bind(this), this.handleDragLeave = this.handleDragLeave.bind(this), this.bindEvents(), this.applyTheme(this.options.theme), this._debouncedSyncTextarea = this._debounce(() => this.syncTextarea(), 300), this.loadPlugins().catch((i) => {
      console.error("InkForge Editor: plugin loading failed", i);
    }), this.setupAutosave(), this.events.emit("init", this);
  }
  /** Builds the contenteditable root and hides the original textarea. */
  buildDom() {
    this.textarea.style.display = "none", this.wrapper = document.createElement("div"), this.wrapper.className = "ife-wrapper", this.wrapper.dataset.theme = this.options.theme, this.root = document.createElement("div"), this.root.className = "ife-content", this.root.contentEditable = "true", this.root.spellcheck = !0, this.root.style.minHeight = `${this.options.height}px`, this.root.innerHTML = this.sanitizer.sanitize(this.textarea.value || "") || "<div><br></div>", this.root.setAttribute("role", "textbox"), this.root.setAttribute("aria-multiline", "true"), this.wrapper.appendChild(this.root), this.textarea.insertAdjacentElement("afterend", this.wrapper);
  }
  bindEvents() {
    this.root.addEventListener("input", () => {
      this.history.record(), this.emitChange();
    }), this.root.addEventListener("keyup", () => this.syncSelectionState()), this.root.addEventListener("mouseup", () => this.syncSelectionState()), this.root.addEventListener("focus", () => this.events.emit("focus", this)), this.root.addEventListener("blur", () => {
      this.syncTextarea(), this.events.emit("blur", this);
    }), this.root.addEventListener("paste", (e) => this.handlePaste(e)), this.root.addEventListener("drop", (e) => this.events.emit("drop", e)), this.root.addEventListener("dragover", (e) => this.handleDragOver(e)), this.root.addEventListener("dragleave", (e) => this.handleDragLeave(e)), document.addEventListener("keydown", this.handleShortcut), document.addEventListener("keydown", this.handleTableTab), document.addEventListener("keydown", this.handleEnter), this.textarea.form && this.textarea.form.addEventListener("submit", () => this.syncTextarea());
  }
  syncSelectionState() {
    this.selection.save(), this.events.emit("selectionchange", this);
  }
  syncTextarea() {
    this.textarea.value = this.getHTML();
  }
  /** Serialize caret position as text offsets for undo/redo. */
  saveSelectionBookmark() {
    const e = window.getSelection();
    if (!e || e.rangeCount === 0) return null;
    const t = e.getRangeAt(0);
    return this.root.contains(t.commonAncestorContainer) ? {
      start: this.textOffset(t.startContainer, t.startOffset),
      end: this.textOffset(t.endContainer, t.endOffset)
    } : null;
  }
  /** Calculate character offset from root start to a given node+offset. */
  textOffset(e, t) {
    const n = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT, null);
    let o = 0, i;
    for (; i = n.nextNode(); ) {
      if (i === e) return o + t;
      o += (i.textContent || "").length;
    }
    return o;
  }
  /** Restore caret from a previously saved bookmark. */
  restoreSelectionBookmark(e) {
    if (!e) return;
    const { start: t, end: n } = e, o = this.nodeAtOffset(t), i = this.nodeAtOffset(n);
    if (!o || !i) return;
    const r = document.createRange();
    r.setStart(o.node, Math.min(o.offset, (o.node.textContent || "").length)), r.setEnd(i.node, Math.min(i.offset, (i.node.textContent || "").length));
    const d = window.getSelection();
    d && (d.removeAllRanges(), d.addRange(r));
  }
  /** Find text node and offset at a given character position from root start. */
  nodeAtOffset(e) {
    const t = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT, null);
    let n = 0, o;
    for (; o = t.nextNode(); ) {
      const i = (o.textContent || "").length;
      if (n + i >= e) return { node: o, offset: e - n };
      n += i;
    }
    return null;
  }
  _debounce(e, t) {
    let n;
    return (...o) => {
      clearTimeout(n), n = setTimeout(() => e(...o), t);
    };
  }
  emitChange() {
    this._debouncedSyncTextarea(), this.events.emit("change", this.getHTML());
  }
  /** @param {ClipboardEvent} event */
  handlePaste(e) {
    var i, r;
    if (e.preventDefault(), this.destroyed) return;
    const t = (i = e.clipboardData) == null ? void 0 : i.getData("text/html"), n = ((r = e.clipboardData) == null ? void 0 : r.getData("text/plain")) ?? "";
    let o;
    t ? o = this.sanitizer.sanitize(t) : o = this.escapeHtml(this.autoLink(n)), this.commands.insertHTML(o), this.events.emit("paste", { html: t, text: n });
  }
  /** Converts URLs in plain text to clickable <a> links. */
  autoLink(e) {
    return e.replace(
      /(https?:\/\/[^\s<]+)/gi,
      '<a href="$1">$1</a>'
    );
  }
  /** @param {string} text */
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML.replace(/\n/g, "<br>");
  }
  /** @param {KeyboardEvent} event */
  handleShortcut(e) {
    if (this.destroyed || !this.root.contains(document.activeElement) || !(e.ctrlKey || e.metaKey)) return;
    const o = {
      b: () => this.commands.exec("bold"),
      i: () => this.commands.exec("italic"),
      u: () => this.commands.exec("underline"),
      k: () => {
        var i;
        return (i = this.module("link")) == null ? void 0 : i.open();
      },
      f: () => {
        var i;
        return (i = this.module("find")) == null ? void 0 : i.open();
      },
      z: () => e.shiftKey ? this.history.redo() : this.history.undo(),
      y: () => this.history.redo(),
      s: () => this.events.emit("save", this.getHTML())
    }[e.key.toLowerCase()];
    o && (e.preventDefault(), o());
  }
  /** @param {KeyboardEvent} event */
  handleTableTab(e) {
    if (e.key !== "Tab" || this.destroyed || !this.root.contains(document.activeElement)) return;
    const t = this.module("table");
    if (!t || !t.getCurrentTable()) return;
    e.preventDefault();
    const n = e.shiftKey;
    t.navigateToCell(n ? "prev" : "next");
  }
  /** @param {KeyboardEvent} event */
  handleEnter(e) {
    if (e.key !== "Enter" || e.shiftKey || this.destroyed || !this.root.contains(document.activeElement)) return;
    const t = this.selection.getBlockElement();
    if (!t) return;
    const n = t.closest("blockquote"), o = t.tagName === "PRE" || !!t.closest("pre"), i = t.tagName === "DIV" && t.classList.contains("note"), r = this.selection.getRange();
    if (!r) return;
    if (!n && !o && !i) {
      let a = r.startContainer;
      if (a.nodeType === Node.TEXT_NODE && (a = a.parentElement), !(a instanceof HTMLElement) || !a.closest("code")) return;
    }
    if (e.preventDefault(), this.history.push(), o) {
      if (!t.textContent.trim()) {
        const l = document.createElement("p");
        l.innerHTML = "<br>", t.parentNode.insertBefore(l, t.nextSibling), t.parentNode.removeChild(t);
        const m = document.createRange();
        m.setStart(l, 0), m.collapse(!0), this.selection.setRange(m);
      } else
        this._insertBreakInPre(r);
      this.emitChange();
      return;
    }
    if (n) {
      if (!t.textContent.trim()) {
        const u = document.createElement("p");
        u.innerHTML = "<br>", n.parentNode.insertBefore(u, n.nextSibling), t.parentNode.removeChild(t), !n.textContent.trim() && !n.children.length && n.parentNode.removeChild(n);
        const p = document.createRange();
        p.setStart(u, 0), p.collapse(!0), this.selection.setRange(p), this.emitChange();
        return;
      }
      const l = document.createElement("p"), { startContainer: m, startOffset: g } = r;
      if (m.nodeType === Node.TEXT_NODE && t.contains(m)) {
        const u = m.textContent, p = u.slice(0, g), b = u.slice(g);
        m.textContent = p, b && (l.textContent = b);
      }
      l.textContent || (l.innerHTML = "<br>"), t.parentNode.insertBefore(l, t.nextSibling);
      const f = document.createRange(), v = l.firstChild || l;
      f.setStart(v, 0), f.collapse(!0), this.selection.setRange(f), this.emitChange();
      return;
    }
    if (i) {
      if (!t.textContent.trim()) {
        const u = document.createElement("p");
        u.innerHTML = "<br>", t.parentNode.insertBefore(u, t.nextSibling), t.parentNode.removeChild(t);
        const p = document.createRange();
        p.setStart(u, 0), p.collapse(!0), this.selection.setRange(p), this.emitChange();
        return;
      }
      const l = document.createElement("p"), { startContainer: m, startOffset: g } = r;
      if (m.nodeType === Node.TEXT_NODE && t.contains(m)) {
        const u = m.textContent, p = u.slice(0, g), b = u.slice(g);
        m.textContent = p, b && (l.textContent = b);
      }
      l.textContent || (l.innerHTML = "<br>"), t.parentNode.insertBefore(l, t.nextSibling);
      const f = document.createRange(), v = l.firstChild || l;
      f.setStart(v, 0), f.collapse(!0), this.selection.setRange(f), this.emitChange();
      return;
    }
    const d = (() => {
      let a = r.startContainer;
      return a.nodeType === Node.TEXT_NODE && (a = a.parentElement), a instanceof HTMLElement ? a.closest("code") : null;
    })();
    if (d) {
      const { startContainer: a, startOffset: l } = r;
      if (a.nodeType === Node.TEXT_NODE && t.contains(a)) {
        const m = a.textContent, g = m.slice(0, l), f = m.slice(l);
        a.textContent = g;
        const v = document.createElement("p");
        if (f ? v.textContent = f : v.innerHTML = "<br>", t.parentNode.insertBefore(v, t.nextSibling), !d.textContent.trim()) {
          const b = d.parentNode, H = document.createTextNode("");
          b.replaceChild(H, d);
        }
        const u = document.createRange(), p = v.firstChild || v;
        u.setStart(p, 0), u.collapse(!0), this.selection.setRange(u);
      } else {
        const m = document.createElement("p");
        m.innerHTML = "<br>", t.parentNode.insertBefore(m, t.nextSibling);
        const g = document.createRange();
        g.setStart(m, 0), g.collapse(!0), this.selection.setRange(g);
      }
      this.emitChange();
    }
  }
  _insertBreakInPre(e) {
    const { startContainer: t, startOffset: n } = e, o = document.createElement("br");
    if (t.nodeType === Node.TEXT_NODE) {
      const r = t.textContent, d = r.slice(0, n), a = r.slice(n);
      if (t.textContent = d, t.parentNode.insertBefore(o, t.nextSibling), a) {
        const l = document.createTextNode(a);
        t.parentNode.insertBefore(l, o.nextSibling);
      }
    } else {
      const r = t.childNodes[n] || null;
      t.insertBefore(o, r);
    }
    const i = document.createRange();
    i.setStartAfter(o), i.collapse(!0), this.selection.setRange(i);
  }
  handleDragOver() {
    if (this.destroyed) return;
    if (!this.wrapper.querySelector(".ife-drop-cursor")) {
      const t = document.createElement("div");
      t.className = "ife-drop-cursor", this.wrapper.appendChild(t);
    }
  }
  /** @param {DragEvent} event */
  handleDragLeave(e) {
    if (this.destroyed || e.relatedTarget && this.wrapper.contains(e.relatedTarget)) return;
    const t = this.wrapper.querySelector(".ife-drop-cursor");
    t && t.remove();
  }
  setupAutosave() {
    const e = this.options.autosave;
    e != null && e.enabled && (this.autosaveTimer = setInterval(() => {
      try {
        window.localStorage.setItem(e.storage_key, this.getHTML());
      } catch {
      }
    }, e.interval_ms ?? 15e3));
  }
  /**
   * Loads every registered plugin (built-in modules and third-party ones)
   * unless explicitly excluded via options.disabledPlugins. This keeps
   * built-in features (link, image, table, ...) equally pluggable while
   * still available out of the box without extra configuration.
   */
  async loadPlugins() {
    const e = new Set(this.options.disabledPlugins ?? []), t = [];
    S.forEach((n, o) => {
      e.has(o) || t.push(
        Promise.resolve(n(this)).then((i) => {
          this.plugins.set(o, i);
        })
      );
    }), await Promise.all(t);
  }
  /**
   * @param {string} name registered plugin/module name (e.g. "link", "table")
   */
  module(e) {
    return this.plugins.get(e);
  }
  applyTheme(e) {
    var t;
    if (this.wrapper.dataset.theme = e, e === "auto") {
      const n = (t = window.matchMedia) == null ? void 0 : t.call(window, "(prefers-color-scheme: dark)").matches;
      this.wrapper.dataset.resolvedTheme = n ? "dark" : "light";
    } else
      this.wrapper.dataset.resolvedTheme = e;
  }
  // --------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------
  getHTML() {
    return this.sanitizer.sanitize(this.root.innerHTML);
  }
  /** @param {string} html */
  setHTML(e) {
    this.root.innerHTML = this.sanitizer.sanitize(e), this.history.push(), this.emitChange();
  }
  /** @param {string} html */
  insertHTML(e) {
    this.commands.insertHTML(this.sanitizer.sanitize(e));
  }
  undo() {
    this.history.undo(), this.emitChange();
  }
  redo() {
    this.history.redo(), this.emitChange();
  }
  clear() {
    var e;
    if (this.setHTML("<div><br></div>"), this.history.clear(), (e = this.options.autosave) != null && e.enabled)
      try {
        window.localStorage.removeItem(this.options.autosave.storage_key);
      } catch {
      }
  }
  focus() {
    this.selection.focus();
  }
  getText() {
    return this.root.textContent ?? "";
  }
  destroy() {
    this.destroyed || (this.destroyed = !0, this.plugins.forEach((e) => {
      var t;
      return (t = e == null ? void 0 : e.destroy) == null ? void 0 : t.call(e);
    }), this.events.emit("destroy", this), clearInterval(this.autosaveTimer), document.removeEventListener("keydown", this.handleShortcut), document.removeEventListener("keydown", this.handleTableTab), document.removeEventListener("keydown", this.handleEnter), this.root.removeEventListener("dragover", this.handleDragOver), this.root.removeEventListener("dragleave", this.handleDragLeave), this.history.destroy(), this.wrapper.remove(), this.textarea.style.display = "", this.events.destroy());
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => void} handler
   */
  on(e, t) {
    return this.events.on(e, t);
  }
  /**
   * @param {string} name
   * @param {(editor: Editor) => { destroy?: () => void }} factory
   */
  static registerPlugin(e, t) {
    S.set(e, t);
  }
}
const c = (s) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">${s}</svg>`, h = {
  undo: c('<path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>'),
  redo: c('<path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.06-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>'),
  bold: c('<path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h6.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5S13.83 9.5 13 9.5h-3v-3zm3.5 8H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>'),
  italic: c('<path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>'),
  underline: c('<path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/>'),
  strikeThrough: c('<path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/>'),
  superscript: c('<path d="M20.34 4.63l-1.31 1.53-1.31-1.53-.72.61 1.52 1.76-1.52 1.76.72.61 1.31-1.53 1.31 1.53.72-.61-1.52-1.76 1.52-1.76zM5.88 18.94h2.66l3.16-4.98h.12l3.17 4.98h2.66l-4.32-6.6 4.03-6.15h-2.61l-2.9 4.65h-.12l-2.89-4.65H6.02l4.04 6.19z"/>'),
  subscript: c('<path d="M20.34 19.37l-1.31-1.53-1.31 1.53-.72-.61 1.52-1.76-1.52-1.76.72-.61 1.31 1.53 1.31-1.53.72.61-1.52 1.76 1.52 1.76zM5.88 18.94h2.66l3.16-4.98h.12l3.17 4.98h2.66l-4.32-6.6 4.03-6.15h-2.61l-2.9 4.65h-.12l-2.89-4.65H6.02l4.04 6.19z"/>'),
  formatColorText: c('<path d="M2 20h20v4H2zM5.49 17h1.9l1.13-3h4.96l1.13 3h1.9L11.44 3h-1.87L5.49 17zm3.66-4.66L11 6l1.85 6.34H9.15z"/>'),
  clearFormat: c('<path d="M6.4 4L4 6.4l5.6 5.6-1.6 3.7v.1c-.4.9.3 1.9 1.3 1.9h.1c.6 0 1.1-.4 1.3-.9l1.4-3.2 5.2 5.2 2.4-2.4L6.4 4zM7.6 5.4L12 9.8 13.6 6H8.4l-.8-.6zM17 4H9.4l2.6 2.6H17V4z"/>'),
  formatColorFill: c('<path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z"/>'),
  alignLeft: c('<path d="M3 21h12v-2H3v2zM3 17h18v-2H3v2zM3 13h12v-2H3v2zM3 9h18V7H3v2zM3 5h12V3H3v2z"/>'),
  alignCenter: c('<path d="M7 21h10v-2H7v2zM3 17h18v-2H3v2zM7 13h10v-2H7v2zM3 9h18V7H3v2zM7 5h10V3H7v2z"/>'),
  alignRight: c('<path d="M9 21h12v-2H9v2zM3 17h18v-2H3v2zM9 13h12v-2H9v2zM3 9h18V7H3v2zM9 5h12V3H9v2z"/>'),
  alignJustify: c('<path d="M3 21h18v-2H3v2zM3 17h18v-2H3v2zM3 13h18v-2H3v2zM3 9h18V7H3v2zM3 5h18V3H3v2z"/>'),
  listBulleted: c('<path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>'),
  listNumbered: c('<path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zM7 5v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>'),
  checklist: c('<path d="M3 5h6v6H3V5zm2 2v2h2V7H5zm6.5-1.5h9v2h-9v-2zm0 6.5h9v2h-9v-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm6.5.5h9v2h-9v-2z"/>'),
  link: c('<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>'),
  unlink: c('<path d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zM3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM2 2l20 20-1.4 1.4L.6 3.4z"/>'),
  image: c('<path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>'),
  videocam: c('<path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11z"/>'),
  audiotrack: c('<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>'),
  table: c('<path d="M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zm0 5h16V6H4v3zm0 2v3h5v-3H4zm7 0v3h9v-3h-9zm-7 5v3h5v-3H4zm7 0v3h9v-3h-9z"/>'),
  hr: c('<path d="M2 11h20v2H2z"/>'),
  blockquote: c('<path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>'),
  code: c('<path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6z"/>'),
  codeBlock: c('<path d="M3 3h18v18H3zm2 2v14h14V5H5zm3.4 7.6L4.8 9l3.6-3.6L9.8 6.8 7.4 9l2.4 2.2zm5.2 0l2.4-2.6-2.4-2.2 1.4-1.4L19 9l-3.6 3.6z"/>'),
  note: c('<path d="M20 2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM7 9h10v2H7V9zm6 6H7v-2h6v2zm4-8H7V5h10v2z"/>'),
  emoji: c('<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm7 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM12 17.5c-2.33 0-4.32-1.45-5.15-3.5h10.3c-.83 2.05-2.82 3.5-5.15 3.5z"/>'),
  specialChars: c('<path d="M5 4v3h5.5v12h3V7H19V4z"/>'),
  find: c('<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1114 9.5 4.5 4.5 0 019.5 14z"/>'),
  sourceCode: c('<path d="M14.6 16.6L19.2 12l-4.6-4.6L16 6l6 6-6 6zM9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6z"/>'),
  fullscreen: c('<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>'),
  indent: c('<path d="M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/>'),
  outdent: c('<path d="M3 21h18v-2H3v2zM7 8v8l-4-4 4-4zm4 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/>'),
  wordCount: c('<path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2zm13 0h3v2h-3v-2zm-3-5h6v2h-6v-2z"/>'),
  ltr: c('<path d="M6 4v16h2v-5h4v5h2V4h-2v5H8V4H6zm10 0v16h2V4h-2z"/>'),
  rtl: c('<path d="M8 4v16h2v-5h4v5h2V4h-2v5h-4V4H8zM18 4v16h2V4h-2z"/>'),
  markdown: c('<path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h2l2 3 2-3h2v8h-2v-5l-2 3-2-3v5H7V7zm10 0h2v8h-4v-2h2V7z"/>'),
  date: c('<path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V9h14v10z"/>'),
  time: c('<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm1-13h-2v6l5.25 3.15.75-1.23-4-2.37V7z"/>'),
  template: c('<path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zM13 3h8v8h-8V3zm0 10h8v8h-8v-8z"/>'),
  anchor: c('<path d="M18 10h-4V6a2 2 0 00-4 0v4H6a2 2 0 000 4h4v4a2 2 0 004 0v-4h4a2 2 0 000-4z"/>'),
  listProps: c('<path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>')
};
class O {
  /**
   * @param {HTMLElement} container element the dialog is appended to (editor wrapper)
   * @param {object} config
   * @param {string} config.title
   * @param {string} config.bodyHtml
   * @param {string} [config.confirmLabel]
   * @param {string} [config.cancelLabel]
   * @param {(form: HTMLFormElement) => void} config.onConfirm
   * @param {() => void} [config.onClose]
   */
  constructor(e, { title: t, bodyHtml: n, confirmLabel: o = "OK", cancelLabel: i = "Cancel", onConfirm: r, onClose: d }) {
    C(this, "handleEscape", (e) => {
      e.key === "Escape" && this.close();
    });
    this.container = e, this.onConfirm = r, this.onClose = d, this.overlay = document.createElement("div"), this.overlay.className = "ife-dialog-overlay", this.overlay.innerHTML = `
            <form class="ife-dialog" role="dialog" aria-modal="true" aria-label="${t}">
                <header class="ife-dialog__header">
                    <h2>${t}</h2>
                    <button type="button" class="ife-dialog__close" aria-label="Close">&times;</button>
                </header>
                <div class="ife-dialog__body">${n}</div>
                <footer class="ife-dialog__footer">
                    <button type="button" class="ife-btn ife-btn--ghost" data-action="cancel">${i}</button>
                    <button type="submit" class="ife-btn ife-btn--primary" data-action="confirm">${o}</button>
                </footer>
            </form>
        `, this.form = this.overlay.querySelector("form"), this.overlay.querySelectorAll("button, input, select, textarea").forEach((a) => {
      a.addEventListener("click", (l) => l.stopPropagation()), a.addEventListener("keydown", (l) => {
        l.key !== "Escape" && l.stopPropagation();
      });
    }), this.overlay.querySelectorAll("button").forEach((a) => {
      a.addEventListener("mousedown", (l) => l.preventDefault());
    }), this.overlay.querySelector(".ife-dialog__close").addEventListener("click", () => this.close()), this.overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => this.close()), this.overlay.addEventListener("click", (a) => {
      a.target === this.overlay && this.close();
    }), this.form.addEventListener("submit", (a) => {
      a.preventDefault(), a.stopPropagation(), this.onConfirm(this.form), this.close();
    }), document.addEventListener("keydown", this.handleEscape);
  }
  open() {
    this.scrollPos = { x: window.scrollX, y: window.scrollY }, this.containerScrollTop = this.container.scrollTop, document.body.style.overflow = "hidden", document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`, document.body.appendChild(this.overlay);
    const e = getComputedStyle(this.container);
    [
      "--ife-bg",
      "--ife-text",
      "--ife-border",
      "--ife-toolbar-bg",
      "--ife-btn-hover",
      "--ife-btn-active",
      "--ife-accent",
      "--ife-danger",
      "--ife-radius",
      "--ife-font"
    ].forEach((o) => {
      this.overlay.style.setProperty(o, e.getPropertyValue(o));
    });
    const n = this.form.querySelector("input, textarea, select");
    n == null || n.focus({ preventScroll: !0 });
  }
  close() {
    document.body.style.overflow = "", document.body.style.paddingRight = "", this.scrollPos && window.scrollTo(this.scrollPos.x, this.scrollPos.y), this.container.scrollTop = this.containerScrollTop ?? 0, document.removeEventListener("keydown", this.handleEscape), this.overlay.remove(), this.onClose && this.onClose();
  }
}
const _ = {
  undo: { icon: h.undo, label: "Undo", shortcut: "Ctrl+Z", type: "action", action: (s) => s.undo() },
  redo: { icon: h.redo, label: "Redo", shortcut: "Ctrl+Y", type: "action", action: (s) => s.redo() },
  bold: { icon: h.bold, label: "Bold", shortcut: "Ctrl+B", type: "command", command: "bold" },
  italic: { icon: h.italic, label: "Italic", shortcut: "Ctrl+I", type: "command", command: "italic" },
  underline: { icon: h.underline, label: "Underline", shortcut: "Ctrl+U", type: "command", command: "underline" },
  strike: { icon: h.strikeThrough, label: "Strikethrough", type: "command", command: "strikeThrough" },
  superscript: { icon: h.superscript, label: "Superscript", type: "command", command: "superscript" },
  subscript: { icon: h.subscript, label: "Subscript", type: "command", command: "subscript" },
  forecolor: { icon: h.formatColorText, label: "Text color", type: "color", command: "foreColor" },
  backcolor: { icon: h.formatColorFill, label: "Background color", type: "color", command: "backColor" },
  removeFormat: {
    icon: h.clearFormat,
    label: "Clear formatting",
    type: "command",
    command: "removeFormat"
  },
  alignLeft: { icon: h.alignLeft, label: "Align left", type: "command", command: "justifyLeft" },
  alignCenter: { icon: h.alignCenter, label: "Align center", type: "command", command: "justifyCenter" },
  alignRight: { icon: h.alignRight, label: "Align right", type: "command", command: "justifyRight" },
  alignJustify: { icon: h.alignJustify, label: "Justify", type: "command", command: "justifyFull" },
  bulletList: { icon: h.listBulleted, label: "Bulleted list", type: "command", command: "insertUnorderedList" },
  orderedList: { icon: h.listNumbered, label: "Numbered list", type: "command", command: "insertOrderedList" },
  checklist: {
    icon: h.checklist,
    label: "Checklist",
    type: "action",
    action: (s) => s.commands.insertHTML('<ul class="ife-checklist"><li><input type="checkbox"> Item</li></ul>')
  },
  indent: { icon: h.indent, label: "Increase indent", type: "command", command: "indent" },
  outdent: { icon: h.outdent, label: "Decrease indent", type: "command", command: "outdent" },
  link: { icon: h.link, label: "Insert/edit link", shortcut: "Ctrl+K", type: "action", action: (s) => s.module("link").open() },
  unlink: {
    icon: h.unlink,
    label: "Remove link",
    type: "action",
    action: (s) => {
      const e = s.selection.closest("a");
      e && s.module("link").remove(e);
    }
  },
  image: { icon: h.image, label: "Insert image", type: "action", action: (s) => s.module("image").open() },
  video: { icon: h.videocam, label: "Insert video", type: "action", action: (s) => s.module("media").openVideo() },
  audio: { icon: h.audiotrack, label: "Insert audio", type: "action", action: (s) => s.module("media").openAudio() },
  table: { icon: h.table, label: "Insert table", type: "action", action: (s) => s.module("table").openInsertDialog() },
  hr: { icon: h.hr, label: "Horizontal rule", type: "action", action: (s) => s.module("media").insertHorizontalRule() },
  blockquote: { icon: h.blockquote, label: "Blockquote", type: "action", action: (s) => {
    const e = s.selection.getBlockElement();
    if (!e || e === s.root) return;
    if (e.tagName === "BLOCKQUOTE" || e.closest("blockquote")) {
      const n = e.tagName === "BLOCKQUOTE" ? e : e.closest("blockquote");
      s.history.push();
      const o = document.createElement("p");
      o.innerHTML = n.innerHTML, n.replaceWith(o);
    } else {
      s.history.push();
      const n = document.createElement("blockquote");
      n.innerHTML = e.outerHTML, e.replaceWith(n);
    }
    s.emitChange();
  } },
  codeInline: {
    icon: h.code,
    label: "Inline code",
    type: "action",
    action: (s) => s.selection.wrap("code") && s.emitChange()
  },
  codeBlock: { icon: h.codeBlock, label: "Code block", type: "action", action: (s) => {
    const e = s.selection.getBlockElement();
    if (!e || e === s.root) return;
    const t = e.tagName === "PRE" || e.closest("pre");
    if (s.history.push(), t) {
      const n = e.tagName === "PRE" ? e : e.closest("pre"), o = document.createElement("p");
      o.innerHTML = n.innerHTML, n.replaceWith(o);
    } else {
      const n = document.createElement("pre");
      n.innerHTML = e.innerHTML, e.replaceWith(n);
    }
    s.emitChange();
  } },
  note: { icon: h.note, label: "Insert note", type: "action", action: (s) => s.module("note").open() },
  emoji: {
    icon: h.emoji,
    label: "Emoji",
    type: "action",
    action: (s, e) => s.module("emoji").open(e)
  },
  specialChars: {
    icon: h.specialChars,
    label: "Special characters",
    type: "action",
    action: (s) => s.commands.insertHTML("&amp;copy;")
  },
  find: { icon: h.find, label: "Find & Replace", shortcut: "Ctrl+F", type: "action", action: (s) => s.module("find").open() },
  sourceCode: {
    icon: h.sourceCode,
    label: "Source code",
    type: "action",
    toggle: !0,
    action: (s) => s.module("codeView").toggle()
  },
  fullscreen: {
    icon: h.fullscreen,
    label: "Fullscreen",
    type: "action",
    toggle: !0,
    action: (s) => s.module("fullscreen").toggle()
  },
  ltr: {
    icon: h.ltr,
    label: "Left-to-right",
    type: "action",
    toggle: !0,
    action: (s) => s.commands.exec("direction", "ltr")
  },
  rtl: {
    icon: h.rtl,
    label: "Right-to-left",
    type: "action",
    toggle: !0,
    action: (s) => s.commands.exec("direction", "rtl")
  },
  markdown: {
    icon: h.markdown,
    label: "Markdown",
    type: "action",
    toggle: !0,
    action: (s) => {
      const e = s.module("markdown");
      if (e)
        if (s.root.dataset.markdownMode === "true") {
          s.root.dataset.markdownMode = "false";
          const t = s.getHTML(), n = e.htmlToMarkdown(t);
          s.setHTML(e.markdownToHtml(n));
        } else
          s._mdSource = e.export(), e.import(s._mdSource), s.root.dataset.markdownMode = "true";
    }
  },
  date: {
    icon: h.date,
    label: "Insert date",
    type: "action",
    action: (s) => {
      const t = (/* @__PURE__ */ new Date()).toLocaleDateString(s.options.locale ?? "en", { year: "numeric", month: "long", day: "numeric" });
      s.commands.insertHTML(t);
    }
  },
  time: {
    icon: h.time,
    label: "Insert time",
    type: "action",
    action: (s) => {
      const t = (/* @__PURE__ */ new Date()).toLocaleTimeString(s.options.locale ?? "en", { hour: "2-digit", minute: "2-digit" });
      s.commands.insertHTML(t);
    }
  },
  anchor: {
    icon: h.anchor,
    label: "Insert anchor",
    type: "action",
    action: (s) => {
      const e = prompt("Anchor name:");
      if (!e) return;
      s.history.push();
      const t = document.createElement("a");
      t.name = e.trim();
      const n = s.selection.getRange();
      n && (n.deleteContents(), n.insertNode(t)), s.emitChange();
    }
  },
  templates: {
    icon: h.template,
    label: "Content templates",
    type: "action",
    action: (s) => {
      var e;
      return (e = s.module("templates")) == null ? void 0 : e.open();
    }
  },
  listProps: {
    icon: h.listProps,
    label: "List properties",
    type: "action",
    action: (s) => {
      const e = s.selection.closest("li"), t = e == null ? void 0 : e.closest("ol, ul");
      if (!t || t.tagName !== "OL") return;
      const n = t.getAttribute("start") || "", o = t.style.listStyleType || "", i = `
                <label class="ife-field">
                    <span>Start number</span>
                    <input type="number" name="start" min="1" value="${n || "1"}">
                </label>
                <label class="ife-field">
                    <span>List style type</span>
                    <select name="type">
                        <option value="" ${o ? "" : "selected"}>Default (decimal)</option>
                        <option value="decimal" ${o === "decimal" ? "selected" : ""}>Decimal</option>
                        <option value="lower-alpha" ${o === "lower-alpha" ? "selected" : ""}>Lower alpha</option>
                        <option value="upper-alpha" ${o === "upper-alpha" ? "selected" : ""}>Upper alpha</option>
                        <option value="lower-roman" ${o === "lower-roman" ? "selected" : ""}>Lower roman</option>
                        <option value="upper-roman" ${o === "upper-roman" ? "selected" : ""}>Upper roman</option>
                    </select>
                </label>
            `, r = new O(s.wrapper, {
        title: "List properties",
        bodyHtml: i,
        confirmLabel: "Apply",
        onConfirm: (d) => {
          const a = new FormData(d), l = a.get("start"), m = a.get("type");
          s.history.push(), l ? t.setAttribute("start", String(l)) : t.removeAttribute("start"), m ? t.style.listStyleType = m : t.style.listStyleType = "", s.emitChange();
        }
      });
      s.selection.save(), r.open();
    }
  }
}, P = {
  undo: "Undo",
  redo: "Redo",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  strike: "Strikethrough",
  superscript: "Superscript",
  subscript: "Subscript",
  forecolor: "Text color",
  backcolor: "Background color",
  linkEdit: "Insert/edit link",
  unlink: "Remove link",
  image: "Insert image",
  video: "Insert video",
  audio: "Insert audio",
  table: "Insert table",
  removeFormat: "Clear formatting",
  alignLeft: "Align left",
  alignCenter: "Align center",
  alignRight: "Align right",
  alignJustify: "Justify",
  checklist: "Checklist",
  indent: "Increase indent",
  outdent: "Decrease indent",
  hr: "Horizontal rule",
  codeInline: "Inline code",
  codeBlock: "Code block",
  note: "Insert note",
  emoji: "Emoji",
  specialChars: "Special characters",
  default: "Default",
  insert: "Insert",
  update: "Update",
  cancel: "Cancel",
  remove: "Remove",
  find: "Find & Replace",
  findReplace: "Find & Replace",
  sourceCode: "Source code",
  fullscreen: "Fullscreen",
  uploadFailed: "Failed to upload the file. Please try again.",
  paragraph: "Paragraph",
  heading1: "Heading 1",
  heading2: "Heading 2",
  heading3: "Heading 3",
  heading4: "Heading 4",
  heading5: "Heading 5",
  heading6: "Heading 6",
  blockquote: "Blockquote",
  preformatted: "Preformatted",
  listItem: "List item",
  orderedList: "Ordered list",
  bulletList: "Bullet list",
  linkLabel: "Link",
  code: "Code",
  ltr: "Left-to-right",
  rtl: "Right-to-left",
  markdown: "Markdown",
  date: "Insert date",
  time: "Insert time",
  anchor: "Insert anchor",
  templates: "Content templates",
  listProps: "List properties",
  madeBy: "Made by ITkha"
}, F = {
  undo: "Скасувати",
  redo: "Повторити",
  bold: "Жирний",
  italic: "Курсив",
  underline: "Підкреслений",
  strike: "Закреслений",
  superscript: "Надрядковий",
  subscript: "Підрядковий",
  forecolor: "Колір тексту",
  backcolor: "Колір фону",
  linkEdit: "Вставити/редагувати посилання",
  unlink: "Видалити посилання",
  image: "Вставити зображення",
  video: "Вставити відео",
  audio: "Вставити аудіо",
  table: "Вставити таблицю",
  removeFormat: "Очистити форматування",
  alignLeft: "По лівому краю",
  alignCenter: "По центру",
  alignRight: "По правому краю",
  alignJustify: "По ширині",
  checklist: "Чеклист",
  indent: "Збільшити відступ",
  outdent: "Зменшити відступ",
  hr: "Горизонтальна лінія",
  codeInline: "Інлайн-код",
  codeBlock: "Блок коду",
  note: "Вставити нотатку",
  emoji: "Емодзі",
  specialChars: "Спеціальні символи",
  default: "За замовчуванням",
  insert: "Вставити",
  update: "Оновити",
  cancel: "Скасувати",
  remove: "Видалити",
  find: "Знайти та замінити",
  findReplace: "Знайти та замінити",
  sourceCode: "Вихідний код",
  fullscreen: "Повноекранний режим",
  uploadFailed: "Не вдалося завантажити файл. Спробуйте ще раз.",
  paragraph: "Параграф",
  heading1: "Заголовок 1",
  heading2: "Заголовок 2",
  heading3: "Заголовок 3",
  heading4: "Заголовок 4",
  heading5: "Заголовок 5",
  heading6: "Заголовок 6",
  blockquote: "Цитата",
  preformatted: "Форматований",
  listItem: "Елемент списку",
  orderedList: "Нумерований список",
  bulletList: "Маркований список",
  linkLabel: "Посилання",
  code: "Код",
  ltr: "Зліва направо",
  rtl: "Справа наліво",
  markdown: "Markdown",
  date: "Вставити дату",
  time: "Вставити час",
  anchor: "Вставити якір",
  templates: "Шаблони",
  listProps: "Властивості списку",
  madeBy: "Зроблено в ITkha"
}, q = {
  undo: "Отменить",
  redo: "Повторить",
  bold: "Жирный",
  italic: "Курсив",
  underline: "Подчёркнутый",
  strike: "Зачёркнутый",
  superscript: "Надстрочный",
  subscript: "Подстрочный",
  forecolor: "Цвет текста",
  backcolor: "Цвет фона",
  linkEdit: "Вставить/редактировать ссылку",
  unlink: "Удалить ссылку",
  image: "Вставить изображение",
  video: "Вставить видео",
  audio: "Вставить аудио",
  table: "Вставить таблицу",
  removeFormat: "Очистить форматирование",
  alignLeft: "По левому краю",
  alignCenter: "По центру",
  alignRight: "По правому краю",
  alignJustify: "По ширине",
  checklist: "Чеклист",
  indent: "Увеличить отступ",
  outdent: "Уменьшить отступ",
  hr: "Горизонтальная линия",
  codeInline: "Инлайн-код",
  codeBlock: "Блок кода",
  note: "Вставить заметку",
  emoji: "Эмодзи",
  specialChars: "Специальные символы",
  default: "По умолчанию",
  insert: "Вставить",
  update: "Обновить",
  cancel: "Отмена",
  remove: "Удалить",
  find: "Найти и заменить",
  findReplace: "Найти и заменить",
  sourceCode: "Исходный код",
  fullscreen: "Полноэкранный режим",
  uploadFailed: "Не удалось загрузить файл. Попробуйте ещё раз.",
  paragraph: "Параграф",
  heading1: "Заголовок 1",
  heading2: "Заголовок 2",
  heading3: "Заголовок 3",
  heading4: "Заголовок 4",
  heading5: "Заголовок 5",
  heading6: "Заголовок 6",
  blockquote: "Цитата",
  preformatted: "Форматированный",
  listItem: "Элемент списка",
  orderedList: "Нумерованный список",
  bulletList: "Маркированный список",
  linkLabel: "Ссылка",
  code: "Код",
  ltr: "Слева направо",
  rtl: "Справа налево",
  markdown: "Markdown",
  date: "Вставить дату",
  time: "Вставить время",
  anchor: "Вставить якорь",
  templates: "Шаблоны",
  listProps: "Свойства списка",
  madeBy: "Сделано в ITkha"
}, k = /* @__PURE__ */ new Map([
  ["en", P],
  ["uk", F],
  ["ru", q]
]), y = {
  /**
   * @param {string} code
   * @param {Record<string, string>} strings
   */
  register(s, e) {
    k.set(s, e);
  },
  /**
   * @param {string} locale
   * @param {string} key
   * @returns {string}
   */
  t(s, e) {
    return (k.get(s) ?? k.get("en"))[e] ?? k.get("en")[e] ?? e;
  },
  available() {
    return [...k.keys()];
  }
}, U = [
  ["undo", "redo"],
  ["bold", "italic", "underline", "strike", "superscript", "subscript"],
  ["forecolor", "backcolor", "removeFormat"],
  ["alignLeft", "alignCenter", "alignRight", "alignJustify"],
  ["ltr", "rtl"],
  ["bulletList", "orderedList", "checklist", "indent", "outdent", "listProps"],
  ["link", "unlink", "image", "video", "audio", "table", "hr"],
  ["blockquote", "codeInline", "codeBlock", "note"],
  ["emoji", "specialChars"],
  ["date", "time", "anchor", "templates"],
  ["markdown"],
  ["find", "sourceCode", "fullscreen"]
];
class W {
  /**
   * @param {import('../core/Editor').default} editor
   * @param {Array<string[]>|null} [layout]
   */
  constructor(e, t = null) {
    this.editor = e, this.layout = t ?? U, this.buttons = /* @__PURE__ */ new Map(), this.el = document.createElement("div"), this.el.className = "ife-toolbar", this.el.setAttribute("role", "toolbar"), this.el.setAttribute("aria-label", "Text formatting"), this.render(), this.editor.wrapper.insertBefore(this.el, this.editor.root), this.editor.on("selectionchange", () => this.syncActiveStates()), this.editor.on("focus", () => this.syncActiveStates());
  }
  render() {
    this.layout.forEach((e) => {
      const t = document.createElement("div");
      t.className = "ife-toolbar__group", e.forEach((n) => {
        const o = _[n];
        if (!o) return;
        const i = this.buildControl(n, o);
        i && t.appendChild(i);
      }), t.children.length && this.el.appendChild(t);
    });
  }
  buildControl(e, t) {
    return t.type === "select" ? this.buildSelect(e, t) : t.type === "color" ? this.buildColorPicker(e, t) : this.buildButton(e, t);
  }
  buildButton(e, t) {
    const n = this.editor.options.locale ?? "en";
    let o = y.t(n, e) !== e ? y.t(n, e) : t.label;
    if (t.shortcut) {
      const r = t.shortcut.replace(/Ctrl/g, "⌘");
      o += ` (${t.shortcut} / ${r})`;
    }
    const i = document.createElement("button");
    return i.type = "button", i.className = "ife-toolbar__btn", i.dataset.command = e, i.title = o, i.setAttribute("aria-label", o), i.innerHTML = t.icon ?? "", i.addEventListener("mousedown", (r) => r.preventDefault()), i.addEventListener("click", () => {
      var r;
      this.editor.selection.restore(), t.type === "command" ? this.editor.commands.exec(t.command) : (r = t.action) == null || r.call(t, this.editor, i), t.toggle && i.classList.toggle("is-active"), this.syncActiveStates();
    }), this.buttons.set(e, i), i;
  }
  buildSelect(e, t) {
    const n = this.editor.options.locale ?? "en", o = document.createElement("select");
    return o.className = "ife-toolbar__select", o.setAttribute("aria-label", y.t(n, e) !== e ? y.t(n, e) : t.label), t.options.forEach(([i, r]) => {
      const d = document.createElement("option");
      d.value = i, d.textContent = r, o.appendChild(d);
    }), o.addEventListener("pointerdown", () => {
      this.editor.selection.save();
    }), o.addEventListener("mousedown", () => {
      this.editor.selection.save();
    }), o.addEventListener("change", () => {
      this.editor.selection.restore(), t.onChange(this.editor, o.value), this.syncActiveStates();
    }), this.buttons.set(e, o), o;
  }
  buildColorPicker(e, t) {
    const n = this.editor.options.locale ?? "en", o = y.t(n, e) !== e ? y.t(n, e) : t.label, i = document.createElement("label");
    i.className = "ife-toolbar__color", i.title = o, i.innerHTML = t.icon;
    const r = document.createElement("input");
    return r.type = "color", r.setAttribute("aria-label", o), r.addEventListener("input", () => {
      this.editor.selection.restore(), this.editor.commands.exec(t.command, r.value);
    }), i.appendChild(r), this.buttons.set(e, i), i;
  }
  /** Reflects current formatting state (bold/italic/... active) on toolbar buttons. */
  syncActiveStates() {
    Object.entries({
      bold: "bold",
      italic: "italic",
      underline: "underline",
      strike: "strikeThrough",
      superscript: "superscript",
      subscript: "subscript",
      bulletList: "insertUnorderedList",
      orderedList: "insertOrderedList"
    }).forEach(([a, l]) => {
      const m = this.buttons.get(a);
      m instanceof HTMLElement && m.classList.toggle("is-active", this.editor.commands.queryState(l));
    });
    const t = this.editor.selection.getBlockElement();
    let n = "";
    if (t) {
      let a = t;
      for (; a && a !== this.editor.root; ) {
        if (a.style.textAlign) {
          n = a.style.textAlign;
          break;
        }
        a = a.parentElement;
      }
    }
    ["alignLeft", "alignCenter", "alignRight", "alignJustify"].forEach((a) => {
      const l = this.buttons.get(a);
      l instanceof HTMLElement && l.classList.toggle("is-active", n === a.replace("align", "").toLowerCase());
    });
    const o = this.buttons.get("ltr"), i = this.buttons.get("rtl");
    if (o instanceof HTMLElement && i instanceof HTMLElement) {
      let a = "";
      if (t) {
        let l = t;
        for (; l && l !== this.editor.root; ) {
          if (l.dir) {
            a = l.dir;
            break;
          }
          l = l.parentElement;
        }
      }
      o.classList.toggle("is-active", a === "ltr"), i.classList.toggle("is-active", a === "rtl");
    }
    const r = this.buttons.get("markdown");
    r instanceof HTMLElement && r.classList.toggle("is-active", this.editor.root.dataset.markdownMode === "true");
    const d = this.buttons.get("blockquote");
    if (d instanceof HTMLElement) {
      let a = !1;
      if (t) {
        let l = t;
        for (; l && l !== this.editor.root; ) {
          if (l.tagName === "BLOCKQUOTE") {
            a = !0;
            break;
          }
          l = l.parentElement;
        }
      }
      d.classList.toggle("is-active", a);
    }
  }
  setEnabled(e, t) {
    const n = this.buttons.get(e);
    (n instanceof HTMLButtonElement || n instanceof HTMLSelectElement) && (n.disabled = !t);
  }
  destroy() {
    this.el.remove();
  }
}
const j = {
  link: () => import("./LinkModule-hoIaT9TY.js"),
  image: () => import("./ImageModule-CyqwPzR9.js"),
  table: () => import("./TableModule-CuCtn_m9.js"),
  codeView: () => import("./CodeViewModule-Wu0FnDsK.js"),
  fullscreen: () => import("./FullscreenModule-CNXzlUim.js"),
  find: () => import("./FindModule-DpOS3Nwc.js"),
  note: () => import("./NoteModule-X5gOnRY9.js"),
  media: () => import("./MediaModule-BSDfTA8g.js"),
  markdown: () => import("./MarkdownModule-DDfsA3Gh.js"),
  statusBar: () => import("./StatusBar-CpEBqxua.js"),
  emoji: () => import("./EmojiModule-BZoYsWjN.js"),
  contextMenu: () => import("./ContextMenu-BECN7uLZ.js"),
  templates: () => import("./TemplateModule-5EThXAhP.js")
};
Object.entries(j).forEach(([s, e]) => {
  E.registerPlugin(s, async (t) => {
    const { default: n } = await e();
    return new n(t);
  });
});
const w = /* @__PURE__ */ new WeakMap(), L = /* @__PURE__ */ new Set(), X = {
  /**
   * @param {string|HTMLTextAreaElement} target CSS selector or a textarea element
   * @param {import('./core/Editor.js').EditorOptions} [options]
   * @returns {EditorCore}
   */
  init(s, e = {}) {
    const t = typeof s == "string" ? document.querySelector(s) : s;
    if (!t)
      throw new Error(`InkForge Editor: target "${s}" not found`);
    if (t.tagName !== "TEXTAREA")
      throw new Error("InkForge Editor: init() target must be a <textarea> element");
    if (w.has(t))
      return w.get(t);
    const n = new E(t, e), o = new W(n, e.toolbar);
    return n.on("destroy", () => o.destroy()), w.set(t, n), L.add(n), n.on("destroy", () => {
      w.delete(t), L.delete(n);
    }), n;
  },
  /**
   * @param {string|HTMLTextAreaElement} target
   * @returns {EditorCore|undefined}
   */
  get(s) {
    const e = typeof s == "string" ? document.querySelector(s) : s;
    return e ? w.get(e) : void 0;
  },
  /** Destroys every editor instance currently mounted on the page. */
  destroyAll() {
    L.forEach((s) => s.destroy()), L.clear();
  },
  registerPlugin: E.registerPlugin
};
export {
  O as D,
  h as I,
  y as L,
  X as a
};
//# sourceMappingURL=index-B7xMO_r_.js.map
