var V = Object.defineProperty;
var q = (l, e, t) => e in l ? V(l, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : l[e] = t;
var R = (l, e, t) => q(l, typeof e != "symbol" ? e + "" : e, t);
class P {
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
    var i;
    (i = this.listeners.get(e)) == null || i.delete(t);
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => void} handler
   */
  once(e, t) {
    const i = (...o) => {
      this.off(e, i), t(...o);
    };
    this.on(e, i);
  }
  /**
   * @param {string} event
   * @param {...any} args
   */
  emit(e, ...t) {
    const i = this.listeners.get(e);
    i && [...i].forEach((o) => o(...t));
  }
  destroy() {
    this.listeners.clear();
  }
}
class j {
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
    this.savedRange && this.setRange(this.savedRange);
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
    let i = t.commonAncestorContainer;
    for (i.nodeType === Node.TEXT_NODE && (i = i.parentElement); i && i !== this.root.parentElement; ) {
      if (i instanceof HTMLElement && i.matches(e)) return i;
      i = i.parentElement;
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
    const i = /* @__PURE__ */ new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "LI", "DIV"]);
    for (; t && t !== this.root; ) {
      if (t instanceof HTMLElement && i.has(t.tagName)) return t;
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
    const i = document.createElement(e);
    try {
      t.surroundContents(i);
    } catch {
      const n = t.extractContents();
      i.appendChild(n), t.insertNode(i);
    }
    const o = document.createRange();
    return o.selectNodeContents(i), this.setRange(o), i;
  }
  focus() {
    this.root.focus(), this.restore();
  }
}
class U {
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
  constructor({ getContent: e, setContent: t, maxSteps: i = 1e3, debounceMs: o = 300, saveBookmark: n, restoreBookmark: s, onChange: r }) {
    this.getContent = e, this.setContent = t, this.maxSteps = i, this.debounceMs = o, this.saveBookmark = n ?? (() => null), this.restoreBookmark = s ?? (() => {
    }), this.onChange = r ?? (() => {
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
class W {
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
      case "blockFormat":
        this.setBlockFormat(t);
        break;
      case "fontName":
        this.setInlineStyle("fontFamily", t);
        break;
      case "fontSize":
        this.setInlineStyle("fontSize", t);
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
   * Replaces the current block element's tag (p, h1-h6, blockquote, pre).
   * If the block is already the target tag, toggles back to <p>.
   * @param {string} tagName
   */
  setBlockFormat(e) {
    const t = this.selection.getBlockElement();
    if (!t || t === this.root) {
      document.execCommand("formatBlock", !1, `<${e}>`);
      return;
    }
    if (t.tagName === e.toUpperCase()) {
      const n = document.createElement("p");
      n.innerHTML = t.innerHTML, t.replaceWith(n);
      const s = document.createRange();
      s.selectNodeContents(n), s.collapse(!1), this.selection.setRange(s);
      return;
    }
    const i = document.createElement(e);
    i.innerHTML = t.innerHTML, t.replaceWith(i);
    const o = document.createRange();
    o.selectNodeContents(i), o.collapse(!1), this.selection.setRange(o);
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
  setInlineStyle(e, t, i = !1) {
    if (i) {
      const s = this.selection.getBlockElement();
      if (s) {
        s.style[e] = t;
        return;
      }
    }
    const o = this.selection.closest("span");
    if (o) {
      o.style[e] = t;
      return;
    }
    const n = this.selection.wrap("span");
    n && (n.style[e] = t);
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
    const i = this.selection.closest("li");
    if (i) {
      const r = i.closest("ul, ol");
      r && r.tagName.toLowerCase() === e ? this.unwrapList(r) : r && this.convertList(r, e);
      return;
    }
    const o = this.getBlocksInRange(t);
    if (!o.length) return;
    const n = document.createElement(e);
    o.forEach((r) => {
      const a = document.createElement("li");
      a.innerHTML = r.innerHTML || "<br>", n.appendChild(a);
    }), o[0].replaceWith(n), o.slice(1).forEach((r) => r.remove());
    const s = document.createRange();
    s.selectNodeContents(n.lastElementChild), s.collapse(!1), this.selection.setRange(s);
  }
  /**
   * Finds the top-level block elements (paragraphs, headings, etc.)
   * touched by a range, so multi-line selections can become a single list.
   * @param {Range} range
   * @returns {HTMLElement[]}
   */
  getBlocksInRange(e) {
    const t = /* @__PURE__ */ new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "DIV"]), i = (a) => {
      let c = a.nodeType === Node.TEXT_NODE ? a.parentElement : a;
      for (; c && c !== this.root; ) {
        if (c instanceof HTMLElement && c.parentElement === this.root && t.has(c.tagName))
          return c;
        c = c.parentElement;
      }
      return null;
    }, o = i(e.startContainer);
    if (!o) return [];
    const n = i(e.endContainer) ?? o;
    if (o === n) return [o];
    const s = [];
    let r = o;
    for (; r && (s.push(r), r !== n); )
      r = r.nextElementSibling;
    return s.length ? s : [o];
  }
  /** @param {HTMLElement} list @param {'ul'|'ol'} listTag */
  convertList(e, t) {
    const i = document.createElement(t);
    i.className = e.className, i.innerHTML = e.innerHTML, e.replaceWith(i);
    const o = document.createRange();
    o.selectNodeContents(i), o.collapse(!1), this.selection.setRange(o);
  }
  /** Removes a list, turning each <li> back into a plain paragraph. @param {HTMLElement} list */
  unwrapList(e) {
    const t = document.createDocumentFragment();
    [...e.children].forEach((o) => {
      if (o.tagName !== "LI") return;
      const n = document.createElement("p");
      n.innerHTML = o.innerHTML || "<br>", t.appendChild(n);
    });
    const i = t.lastElementChild;
    if (e.replaceWith(t), i) {
      const o = document.createRange();
      o.selectNodeContents(i), o.collapse(!1), this.selection.setRange(o);
    }
  }
  /**
   * Removes a specific CSS property from every element touched by
   * the current selection. Used by the color button "clear" action.
   * @param {string} cssProp camelCase property name (e.g. 'color', 'backgroundColor')
   */
  clearColor(e) {
    var n;
    const t = this.selection.getRange();
    if (!t) return;
    let i = t.commonAncestorContainer;
    if (i.nodeType === Node.TEXT_NODE && (i = i.parentElement), !(i instanceof HTMLElement)) return;
    ((n = i.style) != null && n.length ? [i, ...i.querySelectorAll("*")] : [...i.querySelectorAll("*")]).forEach((s) => {
      var r;
      try {
        if (!t.intersectsNode(s)) return;
      } catch {
        return;
      }
      if ((r = s.style) != null && r[e] && (s.style[e] = "", s.style.length === 0 && s.removeAttribute("style")), ["SPAN", "FONT"].includes(s.tagName) && s.attributes.length === 0) {
        const a = s.parentNode;
        if (!a) return;
        for (; s.firstChild; ) a.insertBefore(s.firstChild, s);
        a.removeChild(s);
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
    ((o = t.style) != null && o.length ? [t, ...t.querySelectorAll("*")] : [...t.querySelectorAll("*")]).forEach((n) => {
      if (!(!this.root.contains(n) || !e.intersectsNode(n)) && (n.removeAttribute("style"), ["SPAN", "FONT"].includes(n.tagName) && n.attributes.length === 0)) {
        const s = n.parentNode;
        if (!s) return;
        for (; n.firstChild; ) s.insertBefore(n.firstChild, n);
        s.removeChild(n);
      }
    });
  }
  /**
   * Converts legacy <font> tags (generated by execCommand in browsers that
   * ignore styleWithCSS for fontName/fontSize) to styled <span> elements.
   * Without this, the Sanitizer would strip <font> tags on save.
   */
  cleanFontTags() {
    this.root.querySelectorAll("font").forEach((t) => {
      if (!t.parentNode) return;
      const i = document.createElement("span");
      if (t.face && (i.style.fontFamily = t.face), t.size) {
        const o = { 1: "12px", 2: "14px", 3: "16px", 4: "18px", 5: "24px", 6: "32px", 7: "48px" };
        i.style.fontSize = o[t.size] || "16px";
      }
      for (; t.firstChild; ) i.appendChild(t.firstChild);
      t.replaceWith(i);
    });
  }
  /**
   * Normalizes font-size on spans directly under root that have a
   * non-px inline font-size (e.g. 'large', 'medium') to the target px
   * value. Browsers that respect styleWithCSS for fontSize emit CSS
   * keywords instead of px; this ensures the inline style uses the
   * exact px chosen by the user.
   */
  normalizeFontSizeSpans(e) {
    this.root.querySelectorAll("span").forEach((i) => {
      const o = i.style.fontSize;
      o && !o.endsWith("px") && (i.style.fontSize = e);
    });
  }
  /** Inserts raw (already sanitized) HTML at the current caret position. */
  insertHTML(e) {
    this.prepare(), this.editor.history.push();
    const t = this.selection.getRange();
    if (!t) return;
    t.deleteContents();
    const i = t.createContextualFragment(e), o = i.lastChild;
    if (t.insertNode(i), o) {
      const n = document.createRange();
      n.setStartAfter(o), n.collapse(!0), this.selection.setRange(n);
    }
    this.editor.emitChange();
  }
}
const X = /* @__PURE__ */ new Set([
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
]), K = {
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
  ol: /* @__PURE__ */ new Set(["start", "type", "reversed", "class", "style"]),
  ul: /* @__PURE__ */ new Set(["class", "style"])
}, G = /* @__PURE__ */ new Set(["http:", "https:", "mailto:", "tel:", ""]);
class J {
  /**
   * @param {object} [options]
   * @param {string[]} [options.allowedTags]
   * @param {Record<string, string[]>} [options.allowedAttributes]
   * @param {string[]} [options.allowedUrlSchemes]
   */
  constructor(e = {}) {
    this.allowedTags = e.allowedTags ? new Set(e.allowedTags) : X, this.allowedAttrs = e.allowedAttributes ? Object.fromEntries(Object.entries(e.allowedAttributes).map(([t, i]) => [t, new Set(i)])) : K, this.allowedSchemes = e.allowedUrlSchemes ? new Set(e.allowedUrlSchemes.map((t) => `${t}:`)) : G;
  }
  /**
   * @param {string} dirtyHtml
   * @returns {string} sanitized HTML
   */
  sanitize(e) {
    const t = this.stripWordMso(e), i = document.createElement("template");
    return i.innerHTML = t, this.cleanNode(i.content), i.innerHTML;
  }
  /** Strips Microsoft Word/Copilot mso-* junk, XML wrappers, and empty elements. */
  stripWordMso(e) {
    return e.replace(/<!--\[if[^>]*>.*?<!\[endif\]-->/gs, "").replace(/<!--[^>]*-->/g, "").replace(/<(\w+)[^>]*\s(?:class|style)=["'][^"']*?mso-[^"']*["'][^>]*>/gi, (t) => t.replace(/\s(?:class|style)=["'][^"']*?mso-[^"']*["']/gi, "")).replace(/<o:p>[^<]*<\/o:p>/gi, "").replace(/<w:[^>]+>[^<]*<\/w:[^>]+>/gi, "").replace(/<\\?\?(xml|mso)[^>]*>/gi, "").replace(/style=["'][^"']*mso-[^"']*["']/gi, "").replace(/class=["'][^"']*Mso[^"']*["']/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<meta[^>]*>/gi, "").replace(/<link[^>]*>/gi, "").replace(/<span[^>]*>\s*<\/span>/gi, "").replace(/<p[^>]*>\s*<\/p>/gi, "").replace(/&nbsp;/gi, " ");
  }
  /** @param {Node} root */
  cleanNode(e) {
    const t = [...e.childNodes];
    for (let i = 0; i < t.length; i++) {
      const o = t[i];
      if (o.nodeType !== Node.ELEMENT_NODE) continue;
      const n = (
        /** @type {HTMLElement} */
        o
      ), s = n.tagName.toLowerCase();
      if (s === "script" || s === "style" || s === "noscript") {
        n.remove();
        continue;
      }
      if (this.cleanNode(n), !this.allowedTags.has(s)) {
        this.unwrap(n);
        continue;
      }
      this.cleanAttributes(n, s);
    }
  }
  /**
   * @param {HTMLElement} el
   * @param {string} tag
   */
  cleanAttributes(e, t) {
    const i = this.allowedAttrs["*"] ?? /* @__PURE__ */ new Set(), o = this.allowedAttrs[t] ?? /* @__PURE__ */ new Set();
    [...e.attributes].forEach((n) => {
      const s = n.name.toLowerCase();
      if (s.startsWith("on")) {
        e.removeAttribute(n.name);
        return;
      }
      if (!i.has(s) && !o.has(s)) {
        e.removeAttribute(n.name);
        return;
      }
      (s === "href" || s === "src") && !this.isSafeUrl(n.value) && e.removeAttribute(n.name), s === "style" && e.setAttribute("style", this.cleanStyle(n.value));
    });
  }
  /** @param {string} value */
  isSafeUrl(e) {
    const t = e.trim();
    if (t.startsWith("#") || t.startsWith("/")) return !0;
    try {
      const i = new URL(t, window.location.href);
      return this.allowedSchemes.has(i.protocol);
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
const Y = {
  theme: "auto",
  locale: "en",
  height: 420,
  history: { max_steps: 1e3, debounce_ms: 300 },
  autosave: { enabled: !1, interval_ms: 15e3, storage_key: "inkforge-editor-autosave" }
}, N = /* @__PURE__ */ new Map();
let L = class {
  /**
   * @param {HTMLTextAreaElement} textarea
   * @param {EditorOptions} options
   */
  constructor(e, t = {}) {
    var i, o;
    this.textarea = e, this.options = { ...Y, ...t }, this.events = new P(), this.sanitizer = new J(this.options.sanitizer), this.plugins = /* @__PURE__ */ new Map(), this.buildDom(), this.selection = new j(this.root), this.commands = new W(this), this.history = new U({
      getContent: () => this.root.innerHTML,
      setContent: (n) => {
        this.root.innerHTML = n;
      },
      saveBookmark: () => this.saveSelectionBookmark(),
      restoreBookmark: (n) => this.restoreSelectionBookmark(n),
      maxSteps: ((i = this.options.history) == null ? void 0 : i.max_steps) ?? 1e3,
      debounceMs: ((o = this.options.history) == null ? void 0 : o.debounce_ms) ?? 300,
      onChange: (n) => this.events.emit(n)
    }), this.handleShortcut = this.handleShortcut.bind(this), this.handleTableTab = this.handleTableTab.bind(this), this.handleDragOver = this.handleDragOver.bind(this), this.handleDragLeave = this.handleDragLeave.bind(this), this.bindEvents(), this.applyTheme(this.options.theme), this.loadPlugins(), this.setupAutosave(), this.events.emit("init", this);
  }
  /** Builds the contenteditable root and hides the original textarea. */
  buildDom() {
    this.textarea.style.display = "none", this.wrapper = document.createElement("div"), this.wrapper.className = "ife-wrapper", this.wrapper.dataset.theme = this.options.theme, this.root = document.createElement("div"), this.root.className = "ife-content", this.root.contentEditable = "true", this.root.spellcheck = !0, this.root.style.minHeight = `${this.options.height}px`, this.root.innerHTML = this.sanitizer.sanitize(this.textarea.value || ""), this.root.setAttribute("role", "textbox"), this.root.setAttribute("aria-multiline", "true"), this.wrapper.appendChild(this.root), this.textarea.insertAdjacentElement("afterend", this.wrapper);
  }
  bindEvents() {
    this.root.addEventListener("input", () => {
      this.history.record(), this.emitChange();
    }), this.root.addEventListener("keyup", () => this.syncSelectionState()), this.root.addEventListener("mouseup", () => this.syncSelectionState()), this.root.addEventListener("focus", () => this.events.emit("focus", this)), this.root.addEventListener("blur", () => {
      this.syncTextarea(), this.events.emit("blur", this);
    }), this.root.addEventListener("paste", (e) => this.handlePaste(e)), this.root.addEventListener("drop", (e) => this.events.emit("drop", e)), this.root.addEventListener("dragover", (e) => this.handleDragOver(e)), this.root.addEventListener("dragleave", (e) => this.handleDragLeave(e)), document.addEventListener("keydown", this.handleShortcut), document.addEventListener("keydown", this.handleTableTab), this.textarea.form && this.textarea.form.addEventListener("submit", () => this.syncTextarea());
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
    const i = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT, null);
    let o = 0, n;
    for (; n = i.nextNode(); ) {
      if (n === e) return o + t;
      o += (n.textContent || "").length;
    }
    return o;
  }
  /** Restore caret from a previously saved bookmark. */
  restoreSelectionBookmark(e) {
    if (!e) return;
    const { start: t, end: i } = e, o = this.nodeAtOffset(t), n = this.nodeAtOffset(i);
    if (!o || !n) return;
    const s = document.createRange();
    s.setStart(o.node, Math.min(o.offset, (o.node.textContent || "").length)), s.setEnd(n.node, Math.min(n.offset, (n.node.textContent || "").length));
    const r = window.getSelection();
    r && (r.removeAllRanges(), r.addRange(s));
  }
  /** Find text node and offset at a given character position from root start. */
  nodeAtOffset(e) {
    const t = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT, null);
    let i = 0, o;
    for (; o = t.nextNode(); ) {
      const n = (o.textContent || "").length;
      if (i + n >= e) return { node: o, offset: e - i };
      i += n;
    }
    return null;
  }
  emitChange() {
    this.syncTextarea(), this.events.emit("change", this.getHTML());
  }
  /** @param {ClipboardEvent} event */
  handlePaste(e) {
    var n, s;
    if (e.preventDefault(), this.destroyed) return;
    const t = (n = e.clipboardData) == null ? void 0 : n.getData("text/html"), i = ((s = e.clipboardData) == null ? void 0 : s.getData("text/plain")) ?? "";
    let o;
    t ? o = this.sanitizer.sanitize(t) : o = this.escapeHtml(this.autoLink(i)), this.commands.insertHTML(o), this.events.emit("paste", { html: t, text: i });
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
        var n;
        return (n = this.module("link")) == null ? void 0 : n.open();
      },
      f: () => {
        var n;
        return (n = this.module("find")) == null ? void 0 : n.open();
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
    const i = e.shiftKey;
    t.navigateToCell(i ? "prev" : "next");
  }
  /** @param {DragEvent} event */
  handleDragOver(e) {
    if (this.destroyed) return;
    if (!this.wrapper.querySelector(".ife-drop-cursor")) {
      const i = document.createElement("div");
      i.className = "ife-drop-cursor", this.wrapper.appendChild(i);
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
  loadPlugins() {
    const e = new Set(this.options.disabledPlugins ?? []);
    N.forEach((t, i) => {
      e.has(i) || this.plugins.set(i, t(this));
    });
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
      const i = (t = window.matchMedia) == null ? void 0 : t.call(window, "(prefers-color-scheme: dark)").matches;
      this.wrapper.dataset.resolvedTheme = i ? "dark" : "light";
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
    if (this.setHTML(""), this.history.clear(), (e = this.options.autosave) != null && e.enabled)
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
    }), this.events.emit("destroy", this), clearInterval(this.autosaveTimer), document.removeEventListener("keydown", this.handleShortcut), document.removeEventListener("keydown", this.handleTableTab), this.root.removeEventListener("dragover", this.handleDragOver), this.root.removeEventListener("dragleave", this.handleDragLeave), this.history.destroy(), this.wrapper.remove(), this.textarea.style.display = "", this.events.destroy());
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
    N.set(e, t);
  }
};
const u = (l) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">${l}</svg>`, d = {
  undo: u('<path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>'),
  redo: u('<path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.06-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>'),
  bold: u('<path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h6.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5S13.83 9.5 13 9.5h-3v-3zm3.5 8H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>'),
  italic: u('<path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>'),
  underline: u('<path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/>'),
  strikeThrough: u('<path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/>'),
  superscript: u('<path d="M20.34 4.63l-1.31 1.53-1.31-1.53-.72.61 1.52 1.76-1.52 1.76.72.61 1.31-1.53 1.31 1.53.72-.61-1.52-1.76 1.52-1.76zM5.88 18.94h2.66l3.16-4.98h.12l3.17 4.98h2.66l-4.32-6.6 4.03-6.15h-2.61l-2.9 4.65h-.12l-2.89-4.65H6.02l4.04 6.19z"/>'),
  subscript: u('<path d="M20.34 19.37l-1.31-1.53-1.31 1.53-.72-.61 1.52-1.76-1.52-1.76.72-.61 1.31 1.53 1.31-1.53.72.61-1.52 1.76 1.52 1.76zM5.88 18.94h2.66l3.16-4.98h.12l3.17 4.98h2.66l-4.32-6.6 4.03-6.15h-2.61l-2.9 4.65h-.12l-2.89-4.65H6.02l4.04 6.19z"/>'),
  formatColorText: u('<path d="M2 20h20v4H2zM5.49 17h1.9l1.13-3h4.96l1.13 3h1.9L11.44 3h-1.87L5.49 17zm3.66-4.66L11 6l1.85 6.34H9.15z"/>'),
  clearFormat: u('<path d="M6.4 4L4 6.4l5.6 5.6-1.6 3.7v.1c-.4.9.3 1.9 1.3 1.9h.1c.6 0 1.1-.4 1.3-.9l1.4-3.2 5.2 5.2 2.4-2.4L6.4 4zM7.6 5.4L12 9.8 13.6 6H8.4l-.8-.6zM17 4H9.4l2.6 2.6H17V4z"/>'),
  formatColorFill: u('<path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z"/>'),
  alignLeft: u('<path d="M3 21h12v-2H3v2zM3 17h18v-2H3v2zM3 13h12v-2H3v2zM3 9h18V7H3v2zM3 5h12V3H3v2z"/>'),
  alignCenter: u('<path d="M7 21h10v-2H7v2zM3 17h18v-2H3v2zM7 13h10v-2H7v2zM3 9h18V7H3v2zM7 5h10V3H7v2z"/>'),
  alignRight: u('<path d="M9 21h12v-2H9v2zM3 17h18v-2H3v2zM9 13h12v-2H9v2zM3 9h18V7H3v2zM9 5h12V3H9v2z"/>'),
  alignJustify: u('<path d="M3 21h18v-2H3v2zM3 17h18v-2H3v2zM3 13h18v-2H3v2zM3 9h18V7H3v2zM3 5h18V3H3v2z"/>'),
  listBulleted: u('<path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>'),
  listNumbered: u('<path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zM7 5v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>'),
  checklist: u('<path d="M3 5h6v6H3V5zm2 2v2h2V7H5zm6.5-1.5h9v2h-9v-2zm0 6.5h9v2h-9v-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm6.5.5h9v2h-9v-2z"/>'),
  link: u('<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>'),
  unlink: u('<path d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zM3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM2 2l20 20-1.4 1.4L.6 3.4z"/>'),
  image: u('<path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>'),
  videocam: u('<path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11z"/>'),
  audiotrack: u('<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>'),
  table: u('<path d="M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zm0 5h16V6H4v3zm0 2v3h5v-3H4zm7 0v3h9v-3h-9zm-7 5v3h5v-3H4zm7 0v3h9v-3h-9z"/>'),
  hr: u('<path d="M2 11h20v2H2z"/>'),
  blockquote: u('<path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>'),
  code: u('<path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6z"/>'),
  codeBlock: u('<path d="M3 3h18v18H3zm2 2v14h14V5H5zm3.4 7.6L4.8 9l3.6-3.6L9.8 6.8 7.4 9l2.4 2.2zm5.2 0l2.4-2.6-2.4-2.2 1.4-1.4L19 9l-3.6 3.6z"/>'),
  note: u('<path d="M20 2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM7 9h10v2H7V9zm6 6H7v-2h6v2zm4-8H7V5h10v2z"/>'),
  emoji: u('<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm7 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM12 17.5c-2.33 0-4.32-1.45-5.15-3.5h10.3c-.83 2.05-2.82 3.5-5.15 3.5z"/>'),
  specialChars: u('<path d="M5 4v3h5.5v12h3V7H19V4z"/>'),
  find: u('<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1114 9.5 4.5 4.5 0 019.5 14z"/>'),
  sourceCode: u('<path d="M14.6 16.6L19.2 12l-4.6-4.6L16 6l6 6-6 6zM9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6z"/>'),
  fullscreen: u('<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>'),
  indent: u('<path d="M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/>'),
  outdent: u('<path d="M3 21h18v-2H3v2zM7 8v8l-4-4 4-4zm4 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/>'),
  wordCount: u('<path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2zm13 0h3v2h-3v-2zm-3-5h6v2h-6v-2z"/>'),
  ltr: u('<path d="M6 4v16h2v-5h4v5h2V4h-2v5H8V4H6zm10 0v16h2V4h-2z"/>'),
  rtl: u('<path d="M8 4v16h2v-5h4v5h2V4h-2v5h-4V4H8zM18 4v16h2V4h-2z"/>'),
  markdown: u('<path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h2l2 3 2-3h2v8h-2v-5l-2 3-2-3v5H7V7zm10 0h2v8h-4v-2h2V7z"/>'),
  date: u('<path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V9h14v10z"/>'),
  time: u('<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm1-13h-2v6l5.25 3.15.75-1.23-4-2.37V7z"/>'),
  template: u('<path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zM13 3h8v8h-8V3zm0 10h8v8h-8v-8z"/>'),
  anchor: u('<path d="M18 10h-4V6a2 2 0 00-4 0v4H6a2 2 0 000 4h4v4a2 2 0 004 0v-4h4a2 2 0 000-4z"/>'),
  listProps: u('<path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>')
};
class b {
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
  constructor(e, { title: t, bodyHtml: i, confirmLabel: o = "OK", cancelLabel: n = "Cancel", onConfirm: s, onClose: r }) {
    R(this, "handleEscape", (e) => {
      e.key === "Escape" && this.close();
    });
    this.container = e, this.onConfirm = s, this.onClose = r, this.overlay = document.createElement("div"), this.overlay.className = "ife-dialog-overlay", this.overlay.innerHTML = `
            <form class="ife-dialog" role="dialog" aria-modal="true" aria-label="${t}">
                <header class="ife-dialog__header">
                    <h2>${t}</h2>
                    <button type="button" class="ife-dialog__close" aria-label="Close">&times;</button>
                </header>
                <div class="ife-dialog__body">${i}</div>
                <footer class="ife-dialog__footer">
                    <button type="button" class="ife-btn ife-btn--ghost" data-action="cancel">${n}</button>
                    <button type="submit" class="ife-btn ife-btn--primary" data-action="confirm">${o}</button>
                </footer>
            </form>
        `, this.form = this.overlay.querySelector("form"), this.overlay.querySelectorAll("button, input, select, textarea").forEach((a) => {
      a.addEventListener("click", (c) => c.stopPropagation()), a.addEventListener("keydown", (c) => {
        c.key !== "Escape" && c.stopPropagation();
      });
    }), this.overlay.querySelectorAll("button").forEach((a) => {
      a.addEventListener("mousedown", (c) => c.preventDefault());
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
    const i = this.form.querySelector("input, textarea, select");
    i == null || i.focus({ preventScroll: !0 });
  }
  close() {
    document.body.style.overflow = "", document.body.style.paddingRight = "", this.scrollPos && window.scrollTo(this.scrollPos.x, this.scrollPos.y), this.container.scrollTop = this.containerScrollTop ?? 0, document.removeEventListener("keydown", this.handleEscape), this.overlay.remove(), this.onClose && this.onClose();
  }
}
const E = {
  undo: { icon: d.undo, label: "Undo", shortcut: "Ctrl+Z", type: "action", action: (l) => l.undo() },
  redo: { icon: d.redo, label: "Redo", shortcut: "Ctrl+Y", type: "action", action: (l) => l.redo() },
  blockFormat: {
    label: "Paragraph style",
    type: "select",
    options: [
      ["p", "Paragraph"],
      ["h1", "Heading 1"],
      ["h2", "Heading 2"],
      ["h3", "Heading 3"],
      ["h4", "Heading 4"],
      ["h5", "Heading 5"],
      ["h6", "Heading 6"],
      ["blockquote", "Blockquote"],
      ["pre", "Preformatted"]
    ],
    onChange: (l, e) => l.commands.exec("blockFormat", e)
  },
  fontFamily: {
    label: "Font family",
    type: "select",
    options: [
      ["", "Default"],
      ["Arial, sans-serif", "Arial"],
      ["Georgia, serif", "Georgia"],
      ['"Courier New", monospace', "Courier New"],
      ['"Times New Roman", serif', "Times New Roman"],
      ["Verdana, sans-serif", "Verdana"]
    ],
    onChange: (l, e) => l.commands.exec("fontName", e)
  },
  fontSize: {
    label: "Font size",
    type: "select",
    options: [
      ["12px", "12"],
      ["14px", "14"],
      ["16px", "16"],
      ["18px", "18"],
      ["24px", "24"],
      ["32px", "32"],
      ["48px", "48"]
    ],
    onChange: (l, e) => l.commands.exec("fontSize", e)
  },
  bold: { icon: d.bold, label: "Bold", shortcut: "Ctrl+B", type: "command", command: "bold" },
  italic: { icon: d.italic, label: "Italic", shortcut: "Ctrl+I", type: "command", command: "italic" },
  underline: { icon: d.underline, label: "Underline", shortcut: "Ctrl+U", type: "command", command: "underline" },
  strike: { icon: d.strikeThrough, label: "Strikethrough", type: "command", command: "strikeThrough" },
  superscript: { icon: d.superscript, label: "Superscript", type: "command", command: "superscript" },
  subscript: { icon: d.subscript, label: "Subscript", type: "command", command: "subscript" },
  forecolor: { icon: d.formatColorText, label: "Text color", type: "color", command: "foreColor" },
  backcolor: { icon: d.formatColorFill, label: "Background color", type: "color", command: "backColor" },
  removeFormat: {
    icon: d.clearFormat,
    label: "Clear formatting",
    type: "command",
    command: "removeFormat"
  },
  alignLeft: { icon: d.alignLeft, label: "Align left", type: "command", command: "justifyLeft" },
  alignCenter: { icon: d.alignCenter, label: "Align center", type: "command", command: "justifyCenter" },
  alignRight: { icon: d.alignRight, label: "Align right", type: "command", command: "justifyRight" },
  alignJustify: { icon: d.alignJustify, label: "Justify", type: "command", command: "justifyFull" },
  bulletList: { icon: d.listBulleted, label: "Bulleted list", type: "command", command: "insertUnorderedList" },
  orderedList: { icon: d.listNumbered, label: "Numbered list", type: "command", command: "insertOrderedList" },
  checklist: {
    icon: d.checklist,
    label: "Checklist",
    type: "action",
    action: (l) => l.commands.insertHTML('<ul class="ife-checklist"><li><input type="checkbox"> Item</li></ul>')
  },
  indent: { icon: d.indent, label: "Increase indent", type: "command", command: "indent" },
  outdent: { icon: d.outdent, label: "Decrease indent", type: "command", command: "outdent" },
  link: { icon: d.link, label: "Insert/edit link", shortcut: "Ctrl+K", type: "action", action: (l) => l.module("link").open() },
  unlink: {
    icon: d.unlink,
    label: "Remove link",
    type: "action",
    action: (l) => {
      const e = l.selection.closest("a");
      e && l.module("link").remove(e);
    }
  },
  image: { icon: d.image, label: "Insert image", type: "action", action: (l) => l.module("image").open() },
  video: { icon: d.videocam, label: "Insert video", type: "action", action: (l) => l.module("media").openVideo() },
  audio: { icon: d.audiotrack, label: "Insert audio", type: "action", action: (l) => l.module("media").openAudio() },
  table: { icon: d.table, label: "Insert table", type: "action", action: (l) => l.module("table").openInsertDialog() },
  hr: { icon: d.hr, label: "Horizontal rule", type: "action", action: (l) => l.module("media").insertHorizontalRule() },
  blockquote: { icon: d.blockquote, label: "Blockquote", type: "action", action: (l) => l.commands.exec("blockFormat", "blockquote") },
  codeInline: {
    icon: d.code,
    label: "Inline code",
    type: "action",
    action: (l) => l.selection.wrap("code") && l.emitChange()
  },
  codeBlock: { icon: d.codeBlock, label: "Code block", type: "action", action: (l) => l.commands.exec("blockFormat", "pre") },
  note: { icon: d.note, label: "Insert note", type: "action", action: (l) => l.module("note").open() },
  emoji: {
    icon: d.emoji,
    label: "Emoji",
    type: "action",
    action: (l, e) => l.module("emoji").open(e)
  },
  specialChars: {
    icon: d.specialChars,
    label: "Special characters",
    type: "action",
    action: (l) => l.commands.insertHTML("&amp;copy;")
  },
  find: { icon: d.find, label: "Find & Replace", shortcut: "Ctrl+F", type: "action", action: (l) => l.module("find").open() },
  sourceCode: {
    icon: d.sourceCode,
    label: "Source code",
    type: "action",
    toggle: !0,
    action: (l) => l.module("codeView").toggle()
  },
  fullscreen: {
    icon: d.fullscreen,
    label: "Fullscreen",
    type: "action",
    toggle: !0,
    action: (l) => l.module("fullscreen").toggle()
  },
  ltr: {
    icon: d.ltr,
    label: "Left-to-right",
    type: "action",
    toggle: !0,
    action: (l) => l.commands.exec("direction", "ltr")
  },
  rtl: {
    icon: d.rtl,
    label: "Right-to-left",
    type: "action",
    toggle: !0,
    action: (l) => l.commands.exec("direction", "rtl")
  },
  markdown: {
    icon: d.markdown,
    label: "Markdown",
    type: "action",
    toggle: !0,
    action: (l) => {
      const e = l.module("markdown");
      e && (l.root.dataset.markdownMode === "true" ? (l.root.dataset.markdownMode = "false", l.setHTML(e.markdownToHtml(l._mdSource || ""))) : (l._mdSource = e.export(), e.import(l._mdSource), l.root.dataset.markdownMode = "true"));
    }
  },
  date: {
    icon: d.date,
    label: "Insert date",
    type: "action",
    action: (l) => {
      const t = (/* @__PURE__ */ new Date()).toLocaleDateString(l.options.locale ?? "en", { year: "numeric", month: "long", day: "numeric" });
      l.commands.insertHTML(t);
    }
  },
  time: {
    icon: d.time,
    label: "Insert time",
    type: "action",
    action: (l) => {
      const t = (/* @__PURE__ */ new Date()).toLocaleTimeString(l.options.locale ?? "en", { hour: "2-digit", minute: "2-digit" });
      l.commands.insertHTML(t);
    }
  },
  anchor: {
    icon: d.anchor,
    label: "Insert anchor",
    type: "action",
    action: (l) => {
      const e = prompt("Anchor name:");
      if (!e) return;
      l.history.push();
      const t = document.createElement("a");
      t.name = e.trim();
      const i = l.selection.getRange();
      i && (i.deleteContents(), i.insertNode(t)), l.emitChange();
    }
  },
  templates: {
    icon: d.template,
    label: "Content templates",
    type: "action",
    action: (l) => {
      var e;
      return (e = l.module("templates")) == null ? void 0 : e.open();
    }
  },
  listProps: {
    icon: d.listProps,
    label: "List properties",
    type: "action",
    action: (l) => {
      const e = l.selection.closest("li"), t = e == null ? void 0 : e.closest("ol, ul");
      if (!t || t.tagName !== "OL") return;
      const i = t.getAttribute("start") || "", o = t.style.listStyleType || "", n = `
                <label class="ife-field">
                    <span>Start number</span>
                    <input type="number" name="start" min="1" value="${i || "1"}">
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
            `, s = new b(l.wrapper, {
        title: "List properties",
        bodyHtml: n,
        confirmLabel: "Apply",
        onConfirm: (r) => {
          const a = new FormData(r), c = a.get("start"), h = a.get("type");
          l.history.push(), c ? t.setAttribute("start", String(c)) : t.removeAttribute("start"), h ? t.style.listStyleType = h : t.style.listStyleType = "", l.emitChange();
        }
      });
      l.selection.save(), s.open();
    }
  }
}, Q = {
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
  blockFormat: "Paragraph style",
  fontFamily: "Font family",
  fontSize: "Font size",
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
}, Z = {
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
  blockFormat: "Стиль абзацу",
  fontFamily: "Шрифт",
  fontSize: "Розмір шрифту",
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
}, ee = {
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
  blockFormat: "Стиль абзаца",
  fontFamily: "Шрифт",
  fontSize: "Размер шрифта",
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
}, w = /* @__PURE__ */ new Map([
  ["en", Q],
  ["uk", Z],
  ["ru", ee]
]), f = {
  /**
   * @param {string} code
   * @param {Record<string, string>} strings
   */
  register(l, e) {
    w.set(l, e);
  },
  /**
   * @param {string} locale
   * @param {string} key
   * @returns {string}
   */
  t(l, e) {
    return (w.get(l) ?? w.get("en"))[e] ?? w.get("en")[e] ?? e;
  },
  available() {
    return [...w.keys()];
  }
}, te = [
  ["undo", "redo"],
  ["blockFormat", "fontFamily", "fontSize"],
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
class ie {
  /**
   * @param {import('../core/Editor').default} editor
   * @param {Array<string[]>|null} [layout]
   */
  constructor(e, t = null) {
    this.editor = e, this.layout = t ?? te, this.buttons = /* @__PURE__ */ new Map(), this.el = document.createElement("div"), this.el.className = "ife-toolbar", this.el.setAttribute("role", "toolbar"), this.el.setAttribute("aria-label", "Text formatting"), this.render(), this.editor.wrapper.insertBefore(this.el, this.editor.root), this.editor.on("selectionchange", () => this.syncActiveStates()), this.editor.on("focus", () => this.syncActiveStates());
  }
  render() {
    this.layout.forEach((e) => {
      const t = document.createElement("div");
      t.className = "ife-toolbar__group", e.forEach((i) => {
        const o = E[i];
        if (!o) return;
        const n = this.buildControl(i, o);
        n && t.appendChild(n);
      }), t.children.length && this.el.appendChild(t);
    });
  }
  buildControl(e, t) {
    return t.type === "select" ? this.buildSelect(e, t) : t.type === "color" ? this.buildColorPicker(e, t) : this.buildButton(e, t);
  }
  buildButton(e, t) {
    const i = this.editor.options.locale ?? "en";
    let o = f.t(i, e) !== e ? f.t(i, e) : t.label;
    if (t.shortcut) {
      const s = t.shortcut.replace(/Ctrl/g, "⌘");
      o += ` (${t.shortcut} / ${s})`;
    }
    const n = document.createElement("button");
    return n.type = "button", n.className = "ife-toolbar__btn", n.dataset.command = e, n.title = o, n.setAttribute("aria-label", o), n.innerHTML = t.icon ?? "", n.addEventListener("mousedown", (s) => s.preventDefault()), n.addEventListener("click", () => {
      var s;
      this.editor.selection.restore(), t.type === "command" ? this.editor.commands.exec(t.command) : (s = t.action) == null || s.call(t, this.editor, n), t.toggle && n.classList.toggle("is-active"), this.syncActiveStates();
    }), this.buttons.set(e, n), n;
  }
  buildSelect(e, t) {
    const i = this.editor.options.locale ?? "en", o = document.createElement("select");
    return o.className = "ife-toolbar__select", o.setAttribute("aria-label", f.t(i, e) !== e ? f.t(i, e) : t.label), t.options.forEach(([n, s]) => {
      const r = document.createElement("option");
      r.value = n, r.textContent = this._translateOption(i, e, n, s), o.appendChild(r);
    }), o.addEventListener("mousedown", (n) => {
      n.stopPropagation(), this.editor.selection.save();
    }), o.addEventListener("change", () => {
      this.editor.selection.restore(), t.onChange(this.editor, o.value), this.syncActiveStates();
    }), this.buttons.set(e, o), o;
  }
  buildColorPicker(e, t) {
    const i = this.editor.options.locale ?? "en", o = f.t(i, e) !== e ? f.t(i, e) : t.label, n = document.createElement("label");
    n.className = "ife-toolbar__color", n.title = o, n.innerHTML = t.icon;
    const s = document.createElement("input");
    return s.type = "color", s.setAttribute("aria-label", o), s.addEventListener("input", () => {
      this.editor.selection.restore(), this.editor.commands.exec(t.command, s.value);
    }), n.appendChild(s), this.buttons.set(e, n), n;
  }
  _translateOption(e, t, i, o) {
    if (t === "blockFormat") {
      const s = {
        p: "paragraph",
        h1: "heading1",
        h2: "heading2",
        h3: "heading3",
        h4: "heading4",
        h5: "heading5",
        h6: "heading6",
        blockquote: "blockquote",
        pre: "preformatted"
      }[i];
      if (s) {
        const r = f.t(e, s);
        if (r !== s) return r;
      }
    } else if (t === "fontFamily" && i === "") {
      const n = f.t(e, "default");
      if (n !== "default") return n;
    }
    return o;
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
    }).forEach(([a, c]) => {
      const h = this.buttons.get(a);
      h instanceof HTMLElement && h.classList.toggle("is-active", this.editor.commands.queryState(c));
    });
    const t = this.editor.selection.getBlockElement();
    let i = "";
    if (t) {
      let a = t;
      for (; a && a !== this.editor.root; ) {
        if (a.style.textAlign) {
          i = a.style.textAlign;
          break;
        }
        a = a.parentElement;
      }
    }
    ["alignLeft", "alignCenter", "alignRight", "alignJustify"].forEach((a) => {
      const c = this.buttons.get(a);
      c instanceof HTMLElement && c.classList.toggle("is-active", i === a.replace("align", "").toLowerCase());
    });
    const o = this.buttons.get("ltr"), n = this.buttons.get("rtl");
    if (o instanceof HTMLElement && n instanceof HTMLElement) {
      let a = "";
      if (t) {
        let c = t;
        for (; c && c !== this.editor.root; ) {
          if (c.dir) {
            a = c.dir;
            break;
          }
          c = c.parentElement;
        }
      }
      o.classList.toggle("is-active", a === "ltr"), n.classList.toggle("is-active", a === "rtl");
    }
    const s = this.buttons.get("markdown");
    s instanceof HTMLElement && s.classList.toggle("is-active", this.editor.root.dataset.markdownMode === "true");
    const r = this.buttons.get("blockquote");
    if (r instanceof HTMLElement) {
      let a = !1;
      if (t) {
        let c = t;
        for (; c && c !== this.editor.root; ) {
          if (c.tagName === "BLOCKQUOTE") {
            a = !0;
            break;
          }
          c = c.parentElement;
        }
      }
      r.classList.toggle("is-active", a);
    }
    this._syncSelectValue("fontFamily", this._getComputedFontFamily()), this._syncSelectValue("fontSize", this._getComputedFontSize()), this._syncBlockFormat(t);
  }
  _syncBlockFormat(e) {
    const t = this.buttons.get("blockFormat");
    if (!(t instanceof HTMLSelectElement)) return;
    const i = e ? e.tagName.toLowerCase() : "p";
    for (const [o] of E.blockFormat.options)
      if (o === i) {
        t.value = o;
        return;
      }
    t.value = "p";
  }
  _getStyleNode() {
    const e = this.editor.selection.getNativeSelection();
    if (!e || !e.rangeCount) return null;
    const t = e.getRangeAt(0);
    if (!this.editor.root.contains(t.commonAncestorContainer)) return null;
    let i = t.commonAncestorContainer;
    return i.nodeType === Node.TEXT_NODE && (i = i.parentElement), i;
  }
  _getComputedFontFamily() {
    const e = this._getStyleNode();
    if (!e) return "";
    const t = getComputedStyle(e).fontFamily;
    return t ? t.replace(/["']/g, "").split(",")[0].trim() : "";
  }
  _getComputedFontSize() {
    const e = this._getStyleNode();
    return e ? getComputedStyle(e).fontSize : "";
  }
  _syncSelectValue(e, t) {
    const i = this.buttons.get(e);
    if (!(i instanceof HTMLSelectElement)) return;
    const o = E[e];
    if (!(!o || !o.options)) {
      for (const [n] of o.options)
        if (n) {
          if (e === "fontFamily") {
            const s = n.replace(/["']/g, "").split(",")[0].trim();
            if (t.toLowerCase() === s.toLowerCase()) {
              i.value = n;
              return;
            }
          } else if (e === "fontSize") {
            const s = parseFloat(t), r = parseFloat(n);
            if (!isNaN(s) && !isNaN(r) && Math.abs(s - r) < 0.5) {
              i.value = n;
              return;
            }
          } else if (t === n) {
            i.value = n;
            return;
          }
        }
      i.value !== "" && (i.value = "");
    }
  }
  setEnabled(e, t) {
    const i = this.buttons.get(e);
    (i instanceof HTMLButtonElement || i instanceof HTMLSelectElement) && (i.disabled = !t);
  }
  destroy() {
    this.el.remove();
  }
}
class oe {
  constructor(e) {
    this.editor = e, this.handleDblClick = this.handleDblClick.bind(this), e.root.addEventListener("dblclick", this.handleDblClick);
  }
  /** @param {MouseEvent} event */
  handleDblClick(e) {
    var o, n;
    const t = (n = (o = e.target).closest) == null ? void 0 : n.call(o, "a");
    if (!t || !this.editor.root.contains(t)) return;
    e.preventDefault();
    const i = document.createRange();
    i.selectNodeContents(t), this.editor.selection.setRange(i), this.editor.selection.save(), this.open();
  }
  open() {
    const e = this.editor.selection.closest("a"), t = this.editor.selection.getText(), i = `
            <label class="ife-field">
                <span>Text</span>
                <input type="text" name="text" value="${this.escape((e == null ? void 0 : e.textContent) ?? t)}" required>
            </label>
            <label class="ife-field">
                <span>URL</span>
                <input type="url" name="href" value="${this.escape((e == null ? void 0 : e.getAttribute("href")) ?? "https://")}" required>
            </label>
            <label class="ife-field">
                <span>Title</span>
                <input type="text" name="title" value="${this.escape((e == null ? void 0 : e.getAttribute("title")) ?? "")}">
            </label>
            <label class="ife-field ife-field--inline">
                <input type="checkbox" name="newTab" ${(e == null ? void 0 : e.target) === "_blank" ? "checked" : ""}>
                <span>Open in new tab</span>
            </label>
            <fieldset class="ife-field-group">
                <legend>rel</legend>
                <label class="ife-field--inline"><input type="checkbox" name="nofollow" ${e != null && e.rel.includes("nofollow") ? "checked" : ""}> nofollow</label>
                <label class="ife-field--inline"><input type="checkbox" name="noopener" ${e != null && e.rel.includes("noopener") ? "checked" : ""}> noopener</label>
                <label class="ife-field--inline"><input type="checkbox" name="noreferrer" ${e != null && e.rel.includes("noreferrer") ? "checked" : ""}> noreferrer</label>
            </fieldset>
        `;
    if (this.dialog = new b(this.editor.wrapper, {
      title: e ? "Edit link" : "Insert link",
      bodyHtml: i,
      confirmLabel: e ? "Update" : "Insert",
      onConfirm: (o) => this.apply(o, e)
    }), this.editor.selection.save(), this.dialog.open(), e) {
      const o = document.createElement("button");
      o.type = "button", o.className = "ife-btn ife-btn--danger", o.textContent = "Remove link", o.addEventListener("mousedown", (n) => n.preventDefault()), o.addEventListener("click", (n) => {
        n.stopPropagation(), this.remove(e), this.dialog.close();
      }), this.dialog.form.querySelector(".ife-dialog__footer").prepend(o);
    }
  }
  apply(e, t) {
    const i = new FormData(e), o = ["nofollow", "noopener", "noreferrer"].filter((r) => i.get(r)).join(" "), n = t ?? document.createElement("a");
    n.textContent = String(i.get("text"));
    const s = String(i.get("href"));
    if (n.setAttribute("href", this.editor.sanitizer.isSafeUrl(s) ? s : "#"), n.setAttribute("title", String(i.get("title") ?? "")), n.setAttribute("target", i.get("newTab") ? "_blank" : "_self"), o ? n.setAttribute("rel", o) : n.removeAttribute("rel"), this.editor.history.push(), !t) {
      this.editor.selection.restore();
      const r = this.editor.selection.getRange();
      r == null || r.deleteContents(), r == null || r.insertNode(n);
    }
    this.editor.emitChange();
  }
  remove(e) {
    this.editor.history.push();
    const t = e.parentNode;
    for (; e.firstChild; ) t.insertBefore(e.firstChild, e);
    t.removeChild(e), this.editor.emitChange();
  }
  escape(e) {
    return String(e ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  destroy() {
    var e;
    (e = this.dialog) == null || e.close(), this.editor.root.removeEventListener("dblclick", this.handleDblClick);
  }
}
class ne {
  constructor(e) {
    this.editor = e, this.uploadUrl = e.options.uploadUrl, this.handleDrop = this.handleDrop.bind(this), this.handleClick = this.handleClick.bind(this), this.handleDblClick = this.handleDblClick.bind(this), this.handleMouseDown = this.handleMouseDown.bind(this), this.handleResizeStart = this.handleResizeStart.bind(this), e.root.addEventListener("dragover", (t) => t.preventDefault()), e.root.addEventListener("drop", this.handleDrop), e.root.addEventListener("click", this.handleClick), e.root.addEventListener("dblclick", this.handleDblClick), e.root.addEventListener("mousedown", this.handleMouseDown);
  }
  open() {
    const e = this.getSelectedFigure(), t = e == null ? void 0 : e.querySelector("img"), i = e == null ? void 0 : e.querySelector("figcaption"), o = ["left", "center", "right"].find((s) => e == null ? void 0 : e.classList.contains(`ife-image--${s}`)) ?? "center", n = `
            <div class="ife-tabs">
                <label class="ife-field">
                    <span>Image URL</span>
                    <input type="url" name="src" placeholder="https://example.com/image.jpg" value="${this.escape((t == null ? void 0 : t.getAttribute("src")) ?? "")}">
                </label>
                <label class="ife-field">
                    <span>Or upload a file</span>
                    <input type="file" name="file" accept="image/*">
                </label>
                <label class="ife-field">
                    <span>Alt text</span>
                    <input type="text" name="alt" value="${this.escape((t == null ? void 0 : t.getAttribute("alt")) ?? "")}">
                </label>
                <label class="ife-field">
                    <span>Caption</span>
                    <input type="text" name="caption" value="${this.escape((i == null ? void 0 : i.textContent) ?? "")}">
                </label>
                <label class="ife-field">
                    <span>Alignment</span>
                    <select name="align">
                        <option value="none" ${o === "none" ? "selected" : ""}>None</option>
                        <option value="left" ${o === "left" ? "selected" : ""}>Left</option>
                        <option value="center" ${o === "center" ? "selected" : ""}>Center</option>
                        <option value="right" ${o === "right" ? "selected" : ""}>Right</option>
                    </select>
                </label>
                <label class="ife-field--inline">
                    <input type="checkbox" name="lazy" ${!e || (t == null ? void 0 : t.loading) === "lazy" ? "checked" : ""}>
                    <span>Lazy loading</span>
                </label>
            </div>
        `;
    if (this.dialog = new b(this.editor.wrapper, {
      title: e ? "Edit image" : "Insert image",
      bodyHtml: n,
      confirmLabel: e ? "Update" : "Insert",
      onConfirm: (s) => this.handleSubmit(s, e)
    }), this.editor.selection.save(), this.dialog.open(), e) {
      const s = document.createElement("button");
      s.type = "button", s.className = "ife-btn ife-btn--danger", s.textContent = "Remove image", s.addEventListener("mousedown", (r) => r.preventDefault()), s.addEventListener("click", (r) => {
        r.stopPropagation(), this.editor.history.push(), e.remove(), this.editor.emitChange(), this.dialog.close();
      }), this.dialog.form.querySelector(".ife-dialog__footer").prepend(s);
    }
  }
  /** Returns the currently selected/edited image's <figure>, if any. */
  getSelectedFigure() {
    return this.editor.root.querySelector("figure.ife-image--selected") ?? this.editor.selection.closest("figure.ife-image");
  }
  async handleSubmit(e, t) {
    const i = new FormData(e), o = i.get("file");
    let n = String(i.get("src") ?? "");
    if (o instanceof File && o.size > 0 && (n = await this.upload(o), !n) || !n) return;
    const s = {
      src: n,
      alt: String(i.get("alt") ?? ""),
      caption: String(i.get("caption") ?? ""),
      align: String(i.get("align") ?? "center"),
      lazy: !!i.get("lazy")
    };
    t ? this.update(t, s) : this.insert(s);
  }
  /** @param {File} file */
  async upload(e) {
    var o;
    if (!this.uploadUrl)
      return console.warn("InkForge Editor: no uploadUrl configured, falling back to a local object URL."), URL.createObjectURL(e);
    const t = new FormData();
    t.append("file", e);
    const i = (o = document.querySelector('meta[name="csrf-token"]')) == null ? void 0 : o.content;
    try {
      const n = await fetch(this.uploadUrl, {
        method: "POST",
        headers: i ? { "X-CSRF-TOKEN": i } : {},
        body: t,
        credentials: "same-origin"
      }), s = await n.json();
      if (!n.ok || !s.success)
        throw new Error(s.message ?? "Upload failed");
      return s.url;
    } catch (n) {
      return this.editor.events.emit("error", n), null;
    }
  }
  /**
   * @param {{src:string, alt:string, caption:string, align:string, lazy:boolean}} options
   */
  insert({ src: e, alt: t, caption: i, align: o, lazy: n }) {
    this.editor.history.push(), this.editor.selection.restore();
    const s = document.createElement("figure");
    s.className = `ife-image ife-image--${o}`;
    const r = document.createElement("img");
    if (this.editor.sanitizer.isSafeUrl(e) && (r.src = e), r.alt = t, n && (r.loading = "lazy"), s.appendChild(r), i) {
      const c = document.createElement("figcaption");
      c.textContent = i, s.appendChild(c);
    }
    const a = this.editor.selection.getRange();
    a == null || a.deleteContents(), a == null || a.insertNode(s), this.editor.emitChange();
  }
  /**
   * Updates an already-inserted <figure class="ife-image"> in place instead
   * of creating a new one, so the "edit image" flow doesn't duplicate it.
   * @param {HTMLElement} figure
   * @param {{src:string, alt:string, caption:string, align:string, lazy:boolean}} options
   */
  update(e, { src: t, alt: i, caption: o, align: n, lazy: s }) {
    this.editor.history.push(), e.className = `ife-image ife-image--${n}`;
    const r = e.querySelector("img");
    r && (this.editor.sanitizer.isSafeUrl(t) && (r.src = t), r.alt = i, s ? r.setAttribute("loading", "lazy") : r.removeAttribute("loading"));
    let a = e.querySelector("figcaption");
    o ? (a || (a = document.createElement("figcaption"), e.appendChild(a)), a.textContent = o) : a && a.remove(), e.classList.remove("ife-image--selected"), this.editor.emitChange();
  }
  /** Marks the clicked image's <figure> as selected (for edit/resize), or clears selection. */
  handleClick(e) {
    var i;
    const t = e.target.closest("figure.ife-image img");
    this.editor.root.querySelectorAll(".ife-image--selected").forEach((o) => o.classList.remove("ife-image--selected")), t ? ((i = t.closest("figure")) == null || i.classList.add("ife-image--selected"), this.showResizeHandles(t)) : this.hideResizeHandles();
  }
  /** Adds visible resize handles around a selected image. */
  showResizeHandles(e) {
    this.hideResizeHandles();
    const t = document.createElement("div");
    t.className = "ife-image-resize-handles", ["nw", "ne", "sw", "se"].forEach((o) => {
      const n = document.createElement("div");
      n.className = `ife-image-resize-handle ife-image-resize-handle--${o}`, n.addEventListener("mousedown", (s) => this.handleResizeStart(s, e)), t.appendChild(n);
    }), e.parentElement && e.parentElement.appendChild(t);
  }
  /** Removes visible resize handles. */
  hideResizeHandles() {
    this.editor.root.querySelectorAll(".ife-image-resize-handles").forEach((e) => e.remove());
  }
  /** Drag-start for visible resize handles. */
  handleResizeStart(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = e.clientX, o = e.clientY, n = t.getBoundingClientRect().width, s = t.getBoundingClientRect().height, r = (c) => {
      const h = c.clientX - i, m = c.clientY - o, g = n / s;
      let p = Math.max(40, n + h), v = Math.max(40, s + m);
      Math.abs(h) > Math.abs(m) ? v = p / g : p = v * g, t.style.width = `${Math.round(p)}px`, t.style.height = `${Math.round(v)}px`;
    }, a = () => {
      document.removeEventListener("mousemove", r), document.removeEventListener("mouseup", a), this.editor.emitChange();
    };
    document.addEventListener("mousemove", r), document.addEventListener("mouseup", a);
  }
  /** Double-clicking an image opens the edit dialog directly. */
  handleDblClick(e) {
    var i;
    const t = e.target.closest("figure.ife-image img");
    t && (e.preventDefault(), this.editor.root.querySelectorAll(".ife-image--selected").forEach((o) => o.classList.remove("ife-image--selected")), (i = t.closest("figure")) == null || i.classList.add("ife-image--selected"), this.open());
  }
  /** Alt+drag on an image resizes it (avoids clashing with normal caret placement). */
  handleMouseDown(e) {
    const t = e.target.closest("figure.ife-image img");
    if (!t || !e.altKey) return;
    e.preventDefault();
    const i = e.clientX, o = t.getBoundingClientRect().width, n = (r) => {
      const a = r.clientX - i;
      t.style.width = `${Math.max(40, o + a)}px`;
    }, s = () => {
      document.removeEventListener("mousemove", n), document.removeEventListener("mouseup", s), this.editor.emitChange();
    };
    document.addEventListener("mousemove", n), document.addEventListener("mouseup", s);
  }
  /** @param {DragEvent} event */
  async handleDrop(e) {
    var o, n;
    const t = (n = (o = e.dataTransfer) == null ? void 0 : o.files) == null ? void 0 : n[0];
    if (!t || !t.type.startsWith("image/")) return;
    e.preventDefault();
    const i = await this.upload(t);
    i && (this.editor.selection.save(), this.insert({ src: i, alt: "", caption: "", align: "center", lazy: !0 }));
  }
  escape(e) {
    return String(e ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  destroy() {
    var e;
    (e = this.dialog) == null || e.close(), this.editor.root.removeEventListener("drop", this.handleDrop), this.editor.root.removeEventListener("click", this.handleClick), this.editor.root.removeEventListener("dblclick", this.handleDblClick), this.editor.root.removeEventListener("mousedown", this.handleMouseDown), this.hideResizeHandles();
  }
}
class se {
  constructor(e) {
    this.editor = e, this.buildContextToolbar(), this.editor.root.addEventListener("click", () => this.syncContextToolbar()), this.editor.root.addEventListener("keyup", () => this.syncContextToolbar()), this.editor.on("selectionchange", () => this.syncContextToolbar()), this.adjustTableHeight = this.adjustTableHeight.bind(this), this.handleColumnResizeStart = this.handleColumnResizeStart.bind(this), window.addEventListener("resize", this.adjustTableHeight), this.editor.on("init", () => setTimeout(this.adjustTableHeight, 0)), this.editor.on("change", this.adjustTableHeight), this.editor.root.addEventListener("mousedown", (t) => this.handleColumnResizeStart(t)), this.editor.on("paste", () => this.addColumnResizeHandles());
  }
  /**
   * Builds the floating mini-toolbar that appears whenever the caret is
   * inside a table, exposing the row/column/cell operations below through
   * the UI (previously these existed as methods with no way to trigger
   * them from the editor itself).
   */
  buildContextToolbar() {
    this.contextToolbar = document.createElement("div"), this.contextToolbar.className = "ife-table-toolbar", this.contextToolbar.style.display = "none", this.contextToolbar.setAttribute("role", "toolbar"), this.contextToolbar.setAttribute("aria-label", "Table editing"), [
      ["Row above", () => this.addRow(!0)],
      ["Row below", () => this.addRow(!1)],
      ["Delete row", () => this.deleteRow(), !0],
      ["Col left", () => this.addColumn(!0)],
      ["Col right", () => this.addColumn(!1)],
      ["Delete col", () => this.deleteColumn(), !0],
      ["Merge right", () => this.mergeRight()],
      ["Split cell", () => this.splitCell()],
      ["Delete table", () => this.deleteTable(), !0]
    ].forEach(([a, c, h]) => {
      const m = document.createElement("button");
      m.type = "button", m.className = `ife-btn ife-btn--ghost ife-table-toolbar__btn${h ? " ife-table-toolbar__btn--danger" : ""}`, m.textContent = a, m.title = a, m.addEventListener("mousedown", (g) => g.preventDefault()), m.addEventListener("click", () => {
        this.editor.selection.restore(), c(), this.syncContextToolbar();
      }), this.contextToolbar.appendChild(m);
    });
    const t = document.createElement("label");
    t.className = "ife-table-toolbar__color", t.title = "Cell background color", t.textContent = "Bg";
    const i = document.createElement("input");
    i.type = "color", i.setAttribute("aria-label", "Cell background color"), i.addEventListener("mousedown", (a) => a.stopPropagation()), i.addEventListener("input", () => {
      this.editor.selection.restore(), this.setCellBackground(i.value);
    }), t.appendChild(i), this.contextToolbar.appendChild(t);
    const o = document.createElement("label");
    o.className = "ife-table-toolbar__color", o.title = "Cell border color", o.textContent = "Bd";
    const n = document.createElement("input");
    n.type = "color", n.setAttribute("aria-label", "Cell border color"), n.addEventListener("mousedown", (a) => a.stopPropagation()), n.addEventListener("input", () => {
      this.editor.selection.restore(), this.setCellBorderColor(n.value);
    }), o.appendChild(n), this.contextToolbar.appendChild(o);
    const s = document.createElement("select");
    s.className = "ife-toolbar__select", s.setAttribute("aria-label", "Cell border width"), [["", "Bd W"], ["1px", "1px"], ["2px", "2px"], ["3px", "3px"], ["4px", "4px"]].forEach(([a, c]) => {
      const h = document.createElement("option");
      h.value = a, h.textContent = c, s.appendChild(h);
    }), s.addEventListener("mousedown", (a) => a.stopPropagation()), s.addEventListener("change", () => {
      this.editor.selection.restore(), this.setCellBorderWidth(s.value);
    }), this.contextToolbar.appendChild(s);
    const r = document.createElement("select");
    r.className = "ife-toolbar__select", r.setAttribute("aria-label", "Table alignment"), [["left", "Align left"], ["center", "Align center"], ["right", "Align right"]].forEach(([a, c]) => {
      const h = document.createElement("option");
      h.value = a, h.textContent = c, r.appendChild(h);
    }), r.addEventListener("mousedown", (a) => a.stopPropagation()), r.addEventListener("change", () => {
      this.editor.selection.restore(), this.setTableAlignment(r.value);
    }), this.contextToolbar.appendChild(r);
  }
  openInsertDialog() {
    const e = `
            <label class="ife-field">
                <span>Rows</span>
                <input type="number" name="rows" min="1" max="50" value="3" required>
            </label>
            <label class="ife-field">
                <span>Columns</span>
                <input type="number" name="cols" min="1" max="20" value="3" required>
            </label>
            <label class="ife-field--inline">
                <input type="checkbox" name="header" checked>
                <span>Include header row</span>
            </label>
        `;
    this.editor.selection.save(), new b(this.editor.wrapper, {
      title: "Insert table",
      bodyHtml: e,
      confirmLabel: "Insert",
      onConfirm: (i) => {
        const o = new FormData(i);
        this.insertTable(Number(o.get("rows")), Number(o.get("cols")), !!o.get("header"));
      }
    }).open();
  }
  insertTable(e, t, i) {
    this.editor.history.push(), this.editor.selection.restore();
    const o = document.createElement("table");
    if (o.className = "ife-table", i) {
      const c = o.createTHead().insertRow();
      for (let h = 0; h < t; h += 1) {
        const m = document.createElement("th");
        m.contentEditable = "true", m.innerHTML = "<br>", c.appendChild(m);
      }
    }
    const n = o.createTBody(), s = i ? e - 1 : e;
    for (let a = 0; a < Math.max(s, 1); a += 1) {
      const c = n.insertRow();
      for (let h = 0; h < t; h += 1) {
        const m = c.insertCell();
        m.innerHTML = "<br>";
      }
    }
    const r = this.editor.selection.getRange();
    r == null || r.deleteContents(), r == null || r.insertNode(o), this.editor.emitChange(), this.adjustTableHeight();
  }
  getCurrentCell() {
    return this.editor.selection.closest("td, th");
  }
  getCurrentTable() {
    return this.editor.selection.closest("table");
  }
  addRow(e = !1) {
    const t = this.getCurrentCell(), i = t == null ? void 0 : t.closest("tr");
    if (!i) return;
    this.editor.selection.save(), this.editor.history.push();
    const o = i.cloneNode(!0);
    [...o.children].forEach((n) => {
      n.innerHTML = "<br>";
    }), i.parentNode.insertBefore(o, e ? i : i.nextSibling), this.editor.selection.restore(), this.editor.selection.focus(), this.editor.emitChange();
  }
  deleteRow() {
    var n;
    const e = (n = this.getCurrentCell()) == null ? void 0 : n.closest("tr");
    if (!e) return;
    const t = e.closest("table"), i = e.nextElementSibling, o = e.previousElementSibling;
    if (this.editor.history.push(), e.remove(), t && t.isConnected) {
      const s = i || o;
      if (s) {
        const r = s.querySelector("td, th");
        if (r) {
          const a = document.createRange();
          a.setStart(r, 0), a.collapse(!0), this.editor.selection.setRange(a);
        }
      }
    }
    this.editor.selection.focus(), this.editor.emitChange();
  }
  addColumn(e = !1) {
    const t = this.getCurrentTable(), i = this.getCurrentCell();
    if (!t || !i) return;
    const o = i.parentNode;
    if (!o) return;
    let n = [...o.children].indexOf(i);
    n < 0 || (this.editor.selection.save(), this.editor.history.push(), t.querySelectorAll("tr").forEach((s) => {
      const r = s.children[n];
      if (!r) return;
      const a = document.createElement(r.tagName.toLowerCase() === "th" ? "th" : "td");
      a.innerHTML = "<br>", s.insertBefore(a, e ? r : r.nextSibling);
    }), this.editor.selection.restore(), this.editor.selection.focus(), this.editor.emitChange());
  }
  deleteColumn() {
    const e = this.getCurrentTable(), t = this.getCurrentCell();
    if (!e || !t) return;
    const i = t.parentNode;
    if (!i) return;
    const o = [...i.children].indexOf(t);
    if (!(o < 0)) {
      if (this.editor.history.push(), e.querySelectorAll("tr").forEach((n) => {
        var s;
        return (s = n.children[o]) == null ? void 0 : s.remove();
      }), e.isConnected) {
        const n = e.querySelector("tr");
        if (n) {
          const s = n.querySelector("td, th");
          if (s) {
            const r = document.createRange();
            r.setStart(s, 0), r.collapse(!0), this.editor.selection.setRange(r);
          }
        }
      }
      this.editor.selection.focus(), this.editor.emitChange();
    }
  }
  deleteTable() {
    const e = this.getCurrentTable();
    e && (this.editor.history.push(), e.remove(), this.editor.emitChange());
  }
  /** Merges the current cell with its right-hand neighbor. */
  mergeRight() {
    const e = this.getCurrentCell(), t = e == null ? void 0 : e.nextElementSibling;
    if (!e || !t) return;
    this.editor.history.push();
    const i = Number(e.getAttribute("colspan") ?? 1) + Number(t.getAttribute("colspan") ?? 1);
    e.setAttribute("colspan", String(i)), e.innerHTML += ` ${t.innerHTML}`, t.remove(), this.editor.emitChange();
  }
  /** Splits a previously merged cell back into two cells. */
  splitCell() {
    const e = this.getCurrentCell(), t = Number((e == null ? void 0 : e.getAttribute("colspan")) ?? 1);
    if (!e || t <= 1) return;
    this.editor.history.push(), e.setAttribute("colspan", String(t - 1));
    const i = document.createElement(e.tagName.toLowerCase());
    i.innerHTML = "<br>", e.after(i), this.editor.emitChange();
  }
  setCellBackground(e) {
    const t = this.getCurrentCell();
    t && (this.editor.history.push(), t.style.backgroundColor = e, this.editor.emitChange());
  }
  setCellBorderColor(e) {
    const t = this.getCurrentCell();
    t && (this.editor.history.push(), t.style.borderColor = e, this.editor.emitChange());
  }
  setCellBorderWidth(e) {
    if (!e) return;
    const t = this.getCurrentCell();
    t && (this.editor.history.push(), t.style.borderWidth = e, this.editor.emitChange());
  }
  /** @param {'next'|'prev'} direction */
  navigateToCell(e) {
    const t = this.getCurrentCell();
    if (!t) return;
    const i = t.closest("tr");
    if (!i) return;
    const o = i.closest("table");
    if (!o) return;
    const n = [...o.querySelectorAll("tr")], s = n.indexOf(i), r = [...i.children], a = r.indexOf(t);
    let c, h, m;
    if (e === "next")
      if (a < r.length - 1)
        m = a + 1, h = r, c = i;
      else if (s < n.length - 1)
        c = n[s + 1], h = [...c.children], m = Math.min(a, h.length - 1);
      else if (this.addRow(!1), c = i.nextElementSibling, c)
        h = [...c.children], m = 0;
      else return;
    else if (a > 0)
      m = a - 1, h = r, c = i;
    else if (s > 0)
      c = n[s - 1], h = [...c.children], m = h.length - 1;
    else return;
    if (!c || !h) return;
    const g = h[m];
    if (!g) return;
    const p = document.createRange();
    p.setStart(g, 0), p.collapse(!0), this.editor.selection.setRange(p), this.editor.selection.focus();
  }
  handleColumnResizeStart(e) {
    const t = e.target;
    if (!t.classList.contains("ife-col-resize-handle")) return;
    e.preventDefault(), e.stopPropagation();
    const i = t.closest("table");
    if (!i) return;
    i.getBoundingClientRect();
    const o = e.clientX, n = parseInt(t.dataset.col, 10), s = t.dataset.startWidth ? parseFloat(t.dataset.startWidth) : 0, r = (c) => {
      const h = c.clientX - o, m = Math.max(20, s + h);
      i.querySelectorAll("tr").forEach((g) => {
        const p = g.children[n];
        p && (p.style.width = `${m}px`);
      });
    }, a = () => {
      document.removeEventListener("mousemove", r), document.removeEventListener("mouseup", a), this.addColumnResizeHandles(), this.editor.emitChange();
    };
    document.addEventListener("mousemove", r), document.addEventListener("mouseup", a);
  }
  addColumnResizeHandles() {
    this.editor.root.querySelectorAll(".ife-col-resize-handle").forEach((t) => t.remove()), this.editor.root.querySelectorAll("table.ife-table").forEach((t) => {
      const i = t.querySelector("tr");
      i && [...i.children].forEach((o, n) => {
        const s = document.createElement("div");
        s.className = "ife-col-resize-handle", s.dataset.col = n, s.dataset.startWidth = o.getBoundingClientRect().width, s.style.left = `${o.offsetLeft + o.offsetWidth - 3}px`;
        const r = i;
        r.style.position = "relative", s.style.top = "0", t.appendChild(s);
      });
    });
  }
  setTableAlignment(e) {
    const t = this.getCurrentTable();
    t && (this.editor.history.push(), t.style.marginLeft = e === "left" || e === "center" ? e === "center" ? "auto" : "0" : "auto", t.style.marginRight = e === "right" || e === "center" ? e === "center" ? "auto" : "0" : "auto", this.editor.emitChange());
  }
  /** Shows/hides the contextual table toolbar based on caret position. */
  syncContextToolbar() {
    const e = !!this.getCurrentTable();
    e && !this.contextToolbar.isConnected && this.editor.wrapper.insertBefore(this.contextToolbar, this.editor.root);
    const t = this.contextToolbar.style.display === "none";
    this.contextToolbar.style.display = e ? "flex" : "none", (e || !t) && this.adjustTableHeight(), this.editor.events.emit("table:context", e);
  }
  /** Constrains content area and table height to fit within the viewport. */
  adjustTableHeight() {
    var S, x, T;
    if (!((S = this.editor.root) != null && S.isConnected)) return;
    const e = this.editor.wrapper, t = window.innerHeight, i = e.getBoundingClientRect(), o = e.querySelector(".ife-toolbar"), n = o ? o.offsetHeight : 0, r = ((x = this.contextToolbar) == null ? void 0 : x.style.display) !== "none" && ((T = this.contextToolbar) == null ? void 0 : T.offsetHeight) || 0, a = e.querySelector(".ife-statusbar"), c = a ? a.offsetHeight : 0, h = getComputedStyle(e), m = parseFloat(h.borderTopWidth) || 0, g = parseFloat(h.borderBottomWidth) || 0, p = t - i.top - m - n - r - c - g;
    this.editor.root.style.maxHeight = `${Math.max(200, Math.floor(p))}px`;
    const v = this.editor.root.querySelectorAll("table.ife-table");
    if (!v.length) return;
    const $ = parseFloat(getComputedStyle(this.editor.root).paddingTop) || 16, D = parseFloat(getComputedStyle(this.editor.root).paddingBottom) || 16;
    v.forEach((k) => {
      let H = 0, C = k.previousElementSibling;
      for (; C; ) {
        const z = getComputedStyle(C);
        H += C.offsetHeight + (parseFloat(z.marginTop) || 0) + (parseFloat(z.marginBottom) || 0), C = C.previousElementSibling;
      }
      const M = getComputedStyle(k), F = parseFloat(M.marginTop) || 0, I = parseFloat(M.marginBottom) || 0, O = p - $ - H - F - I - D;
      k.style.maxHeight = `${Math.max(200, Math.floor(O))}px`;
    });
  }
  destroy() {
    var e;
    window.removeEventListener("resize", this.adjustTableHeight), this.editor.root.style.maxHeight = "", (e = this.contextToolbar) == null || e.remove();
  }
}
class re {
  constructor(e) {
    this.editor = e, this.active = !1;
  }
  toggle() {
    return this.active ? this.exitCodeView() : this.enterCodeView(), this.active;
  }
  enterCodeView() {
    this.editor.history.push(), this.source = document.createElement("textarea"), this.source.className = "ife-source-view", this.source.value = this.formatHtml(this.editor.getHTML()), this.source.spellcheck = !1, this.editor.root.insertAdjacentElement("afterend", this.source), this.editor.root.style.display = "none", this.active = !0;
  }
  exitCodeView() {
    if (!this.source) return;
    const e = this.editor.sanitizer.sanitize(this.source.value);
    this.editor.setHTML(e), this.source.remove(), this.editor.root.style.display = "", this.active = !1;
  }
  /** Simple, dependency-free HTML pretty-printer for readability in source view. */
  formatHtml(e) {
    const i = e.replace(/></g, `>
<`).split(`
`);
    let o = 0;
    return i.map((n) => {
      const s = /^<\//.test(n);
      s && (o = Math.max(o - 1, 0));
      const r = `${"  ".repeat(o)}${n}`, a = /\/>$/.test(n) || /<(br|hr|img|input|source)[ >]/i.test(n);
      return /^<[a-z]/i.test(n) && !s && !a && (o += 1), r;
    }).join(`
`);
  }
  destroy() {
    var e;
    (e = this.source) == null || e.remove();
  }
}
class ae {
  constructor(e) {
    this.editor = e, this.active = !1, this.handleChange = this.handleChange.bind(this), document.addEventListener("fullscreenchange", this.handleChange);
  }
  async toggle() {
    return this.active ? await this.exit() : await this.enter(), this.active;
  }
  async enter() {
    try {
      this.editor.wrapper.requestFullscreen && await this.editor.wrapper.requestFullscreen(), this.editor.wrapper.classList.add("ife-fullscreen"), this.active = !0;
    } catch {
      return;
    }
  }
  async exit() {
    try {
      document.fullscreenElement && await document.exitFullscreen();
    } catch {
    }
    this.editor.wrapper.classList.remove("ife-fullscreen"), this.active = !1;
  }
  handleChange() {
    document.fullscreenElement || (this.editor.wrapper.classList.remove("ife-fullscreen"), this.active = !1);
  }
  destroy() {
    document.removeEventListener("fullscreenchange", this.handleChange);
  }
}
class le {
  constructor(e) {
    this.editor = e, this.matches = [], this.currentIndex = -1;
  }
  open() {
    this.clearHighlights();
    const e = `
            <label class="ife-field">
                <span>Find</span>
                <input type="text" name="query" required autofocus>
            </label>
            <label class="ife-field">
                <span>Replace with</span>
                <input type="text" name="replacement">
            </label>
            <label class="ife-field--inline"><input type="checkbox" name="caseSensitive"> Case sensitive</label>
            <label class="ife-field--inline"><input type="checkbox" name="useRegex"> Regular expression</label>
        `;
    this.dialog = new b(this.editor.wrapper, {
      title: "Find & Replace",
      bodyHtml: e,
      confirmLabel: "Replace all",
      onConfirm: (i) => this.replaceAll(i),
      onClose: () => this.clearHighlights()
    });
    const t = document.createElement("button");
    t.type = "button", t.className = "ife-btn ife-btn--ghost", t.textContent = "Highlight all", t.addEventListener("mousedown", (i) => i.preventDefault()), t.addEventListener("click", (i) => {
      i.stopPropagation(), this.highlightAll(new FormData(this.dialog.form));
    }), this.dialog.open(), this.dialog.form.querySelector(".ife-dialog__footer").prepend(t);
  }
  buildRegex(e) {
    const t = String(e.get("query") ?? "").trim();
    if (!t) return null;
    const i = !!e.get("caseSensitive"), o = !!e.get("useRegex"), n = `g${i ? "" : "i"}`, s = o ? t : t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(s, n);
  }
  highlightAll(e) {
    if (this.clearHighlights(), !String(e.get("query") ?? "")) return;
    const i = this.buildRegex(e);
    if (!i) return;
    const o = document.createTreeWalker(this.editor.root, NodeFilter.SHOW_TEXT, null), n = [];
    let s = o.nextNode();
    for (; s; )
      n.push(s), s = o.nextNode();
    n.forEach((r) => {
      const a = r.textContent ?? "";
      if (!i.test(a)) return;
      i.lastIndex = 0;
      const c = document.createDocumentFragment();
      let h = 0, m = i.exec(a);
      for (; m; ) {
        c.appendChild(document.createTextNode(a.slice(h, m.index)));
        const g = document.createElement("mark");
        g.className = "ife-search-highlight", g.textContent = m[0], c.appendChild(g), h = m.index + m[0].length, m = i.exec(a);
      }
      c.appendChild(document.createTextNode(a.slice(h))), r.replaceWith(c);
    });
  }
  clearHighlights() {
    this.editor.root.querySelectorAll("mark.ife-search-highlight").forEach((e) => {
      e.replaceWith(document.createTextNode(e.textContent ?? ""));
    }), this.editor.root.normalize();
  }
  replaceAll(e) {
    const t = new FormData(e), i = this.buildRegex(t);
    if (!i) return;
    const o = String(t.get("replacement") ?? "");
    this.editor.history.push(), this.clearHighlights();
    const n = document.createTreeWalker(this.editor.root, NodeFilter.SHOW_TEXT, null), s = [];
    let r = n.nextNode();
    for (; r; )
      s.push(r), r = n.nextNode();
    s.forEach((a) => {
      a.textContent = (a.textContent ?? "").replace(i, o);
    }), this.editor.emitChange();
  }
  destroy() {
    var e;
    this.clearHighlights(), (e = this.dialog) == null || e.close();
  }
}
const ce = ["info", "warning", "danger", "success", "quote", "tip"];
class he {
  constructor(e) {
    this.editor = e;
  }
  open() {
    const t = `
            <label class="ife-field">
                <span>Type</span>
                <select name="type">${ce.map((i) => `<option value="${i}">${i[0].toUpperCase()}${i.slice(1)}</option>`).join("")}</select>
            </label>
            <label class="ife-field">
                <span>Text</span>
                <textarea name="text" rows="3">${this.editor.selection.getText()}</textarea>
            </label>
        `;
    this.dialog = new b(this.editor.wrapper, {
      title: "Insert note",
      bodyHtml: t,
      confirmLabel: "Insert",
      onConfirm: (i) => {
        const o = new FormData(i);
        this.insert(String(o.get("type")), String(o.get("text")));
      }
    }), this.editor.selection.save(), this.dialog.open();
  }
  insert(e, t) {
    this.editor.history.push(), this.editor.selection.restore();
    const i = document.createElement("div");
    i.className = `note note-${e}`, i.textContent = t;
    const o = this.editor.selection.getRange();
    o == null || o.deleteContents(), o == null || o.insertNode(i), this.editor.emitChange();
  }
  destroy() {
    var e;
    (e = this.dialog) == null || e.close();
  }
}
const _ = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/, A = /vimeo\.com\/(\d+)/;
class de {
  constructor(e) {
    this.editor = e;
  }
  openVideo() {
    const e = `
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
    this.editor.selection.save(), new b(this.editor.wrapper, {
      title: "Insert video",
      bodyHtml: e,
      confirmLabel: "Insert",
      onConfirm: (t) => {
        const i = new FormData(t);
        this.insertVideo(String(i.get("source")), Number(i.get("width")), Number(i.get("height")));
      }
    }).open();
  }
  insertVideo(e, t, i) {
    const o = e.trim();
    let n;
    if (o.startsWith("<iframe"))
      n = o;
    else if (_.test(o)) {
      const s = o.match(_)[1];
      n = `<iframe width="${t}" height="${i}" src="https://www.youtube.com/embed/${s}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else if (A.test(o)) {
      const s = o.match(A)[1];
      n = `<iframe width="${t}" height="${i}" src="https://player.vimeo.com/video/${s}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    } else
      n = `<video controls width="${t}" height="${i}"><source src="${o}"></video>`;
    this.editor.commands.insertHTML(this.editor.sanitizer.sanitize(n));
  }
  openAudio() {
    const e = `
            <label class="ife-field">
                <span>Audio file URL</span>
                <input type="url" name="source" required>
            </label>
        `;
    this.editor.selection.save(), new b(this.editor.wrapper, {
      title: "Insert audio",
      bodyHtml: e,
      confirmLabel: "Insert",
      onConfirm: (t) => {
        const o = `<audio controls><source src="${String(new FormData(t).get("source"))}"></audio>`;
        this.editor.commands.insertHTML(this.editor.sanitizer.sanitize(o));
      }
    }).open();
  }
  insertHorizontalRule() {
    this.editor.commands.insertHTML("<hr>");
  }
  destroy() {
  }
}
class ue {
  constructor(e) {
    this.editor = e;
  }
  /** @returns {string} */
  export() {
    return this.htmlToMarkdown(this.editor.getHTML()).trim();
  }
  /** @param {string} markdown */
  import(e) {
    const t = this.markdownToHtml(e);
    this.editor.setHTML(t);
  }
  /** @param {string} html */
  htmlToMarkdown(e) {
    const t = document.createElement("div");
    return t.innerHTML = e, this.nodeToMarkdown(t).replace(/\n{3,}/g, `

`);
  }
  /** @param {Node} node */
  nodeToMarkdown(e) {
    let t = "";
    return e.childNodes.forEach((i) => {
      t += this.convertNode(i);
    }), t;
  }
  /** @param {Node} node */
  convertNode(e) {
    var i;
    if (e.nodeType === Node.TEXT_NODE) return e.textContent ?? "";
    if (!(e instanceof HTMLElement)) return "";
    const t = () => this.nodeToMarkdown(e);
    switch (e.tagName) {
      case "H1":
        return `# ${t()}

`;
      case "H2":
        return `## ${t()}

`;
      case "H3":
        return `### ${t()}

`;
      case "H4":
        return `#### ${t()}

`;
      case "H5":
        return `##### ${t()}

`;
      case "H6":
        return `###### ${t()}

`;
      case "P":
        return `${t()}

`;
      case "STRONG":
      case "B":
        return `**${t()}**`;
      case "EM":
      case "I":
        return `*${t()}*`;
      case "S":
      case "STRIKE":
        return `~~${t()}~~`;
      case "A":
        return `[${t()}](${e.getAttribute("href") ?? ""})`;
      case "IMG":
        return `![${e.getAttribute("alt") ?? ""}](${e.getAttribute("src") ?? ""})`;
      case "BLOCKQUOTE":
        return `> ${t().trim().replace(/\n/g, `
> `)}

`;
      case "CODE":
        return ((i = e.parentElement) == null ? void 0 : i.tagName) === "PRE" ? t() : `\`${t()}\``;
      case "PRE":
        return `\`\`\`
${t()}
\`\`\`

`;
      case "HR":
        return `---

`;
      case "BR":
        return `
`;
      case "UL":
        return `${[...e.children].map((o) => `- ${this.nodeToMarkdown(o).trim()}`).join(`
`)}

`;
      case "OL":
        return `${[...e.children].map((o, n) => `${n + 1}. ${this.nodeToMarkdown(o).trim()}`).join(`
`)}

`;
      default:
        return t();
    }
  }
  /** @param {string} markdown */
  markdownToHtml(e) {
    const t = e.split(`
`), i = [];
    let o = null;
    return t.forEach((n) => {
      const s = n, r = s.match(/^(#{1,6})\s+(.*)$/), a = s.match(/^[-*]\s+(.*)$/), c = s.match(/^\d+\.\s+(.*)$/), h = s.match(/^>\s?(.*)$/);
      if (r) {
        this.closeList(i, o), o = null;
        const m = r[1].length;
        i.push(`<h${m}>${this.inlineMarkdown(r[2])}</h${m}>`);
        return;
      }
      if (a) {
        o !== "ul" && (this.closeList(i, o), i.push("<ul>"), o = "ul"), i.push(`<li>${this.inlineMarkdown(a[1])}</li>`);
        return;
      }
      if (c) {
        o !== "ol" && (this.closeList(i, o), i.push("<ol>"), o = "ol"), i.push(`<li>${this.inlineMarkdown(c[1])}</li>`);
        return;
      }
      if (h) {
        this.closeList(i, o), o = null, i.push(`<blockquote>${this.inlineMarkdown(h[1])}</blockquote>`);
        return;
      }
      if (s.trim() === "---") {
        this.closeList(i, o), o = null, i.push("<hr>");
        return;
      }
      this.closeList(i, o), o = null, s.trim() !== "" && i.push(`<p>${this.inlineMarkdown(s)}</p>`);
    }), this.closeList(i, o), i.join(`
`);
  }
  closeList(e, t) {
    t && e.push(`</${t}>`);
  }
  /** @param {string} text */
  inlineMarkdown(e) {
    return e.replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2">').replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>').replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/~~(.+?)~~/g, "<s>$1</s>").replace(/`(.+?)`/g, "<code>$1</code>");
  }
  destroy() {
  }
}
const me = {
  p: "paragraph",
  h1: "heading1",
  h2: "heading2",
  h3: "heading3",
  h4: "heading4",
  h5: "heading5",
  h6: "heading6",
  blockquote: "blockquote",
  pre: "preformatted",
  li: "listItem",
  div: "paragraph"
};
class pe {
  constructor(e) {
    this.editor = e, this.update = this.update.bind(this), this._onDestroy = () => this.destroy(), this.buildDom(), this.bindEvents(), this.update();
  }
  buildDom() {
    this.el = document.createElement("div"), this.el.className = "ife-statusbar", this.left = document.createElement("span"), this.left.className = "ife-statusbar__left", this.typeEl = document.createElement("span"), this.typeEl.className = "ife-statusbar__item", this.typeEl.innerHTML = '<span class="ife-statusbar__value">Paragraph</span>', this.wordsEl = document.createElement("span"), this.wordsEl.className = "ife-statusbar__item", this.wordsEl.innerHTML = `${d.wordCount} <span class="ife-statusbar__value">0</span>`, this.charsEl = document.createElement("span"), this.charsEl.className = "ife-statusbar__item", this.charsEl.innerHTML = `${d.specialChars} <span class="ife-statusbar__value">0</span>`, this.left.appendChild(this.typeEl), this.left.appendChild(this.wordsEl), this.left.appendChild(this.charsEl);
    const e = this.editor.options.locale ?? "en";
    this.right = document.createElement("span"), this.right.className = "ife-statusbar__right", this.right.textContent = f.t(e, "madeBy"), this.el.appendChild(this.left), this.el.appendChild(this.right), this.editor.wrapper.appendChild(this.el);
  }
  bindEvents() {
    this.editor.root.addEventListener("input", this.update), this._unsubChange = this.editor.on("change", this.update), this._unsubSelectionChange = this.editor.on("selectionchange", this.update), this._unsubDestroy = this.editor.on("destroy", this._onDestroy);
  }
  update() {
    const e = this.editor.getText(), t = e.length, i = e.trim() ? e.trim().split(/\s+/).length : 0;
    this.wordsEl.querySelector(".ife-statusbar__value").textContent = i, this.charsEl.querySelector(".ife-statusbar__value").textContent = t;
    const o = this._getElementType(), n = this.editor.options.locale ?? "en";
    this.typeEl.querySelector(".ife-statusbar__value").textContent = f.t(n, o);
  }
  _getElementType() {
    var i, o, n;
    const e = this.editor.selection;
    if (!e) return "paragraph";
    if ((i = e.closest) != null && i.call(e, "a")) return "linkLabel";
    if ((o = e.closest) != null && o.call(e, "code")) return "code";
    const t = (n = e.getBlockElement) == null ? void 0 : n.call(e);
    if (!t) return "paragraph";
    if (t.tagName === "LI") {
      let s = t.parentElement;
      for (; s && s !== this.editor.root; ) {
        if (s.tagName === "OL") return "orderedList";
        if (s.tagName === "UL") return "bulletList";
        s = s.parentElement;
      }
    }
    return me[t.tagName.toLowerCase()] || "paragraph";
  }
  destroy() {
    var e, t, i;
    this.destroyed || (this.destroyed = !0, this.editor.root.removeEventListener("input", this.update), (e = this._unsubChange) == null || e.call(this), (t = this._unsubSelectionChange) == null || t.call(this), (i = this._unsubDestroy) == null || i.call(this), this.el.remove());
  }
}
class ge {
  constructor(e) {
    this.editor = e, this.picker = null, this._triggerEl = null, this._boundOnResize = null, this._boundOnScroll = null, this._boundOnClickOutside = null;
  }
  open(e) {
    if (this.picker) {
      this.close();
      return;
    }
    this._triggerEl = e || this.editor.wrapper.querySelector('[data-command="emoji"]'), this.editor.selection.save(), this.picker = document.createElement("div"), this.picker.className = "ife-emoji-picker", this.picker.setAttribute("role", "dialog"), this.picker.setAttribute("aria-label", "Emoji picker");
    const t = document.createElement("div");
    t.className = "ife-emoji-picker__header";
    const i = document.createElement("span");
    i.className = "ife-emoji-picker__title", i.textContent = "Emoji", t.appendChild(i);
    const o = document.createElement("button");
    o.type = "button", o.className = "ife-emoji-picker__close", o.innerHTML = "&times;", o.setAttribute("aria-label", "Close"), o.addEventListener("click", () => this.close()), t.appendChild(o), this.picker.appendChild(t);
    const n = [
      { name: "Smileys", emojis: [
        "😀",
        "😃",
        "😄",
        "😁",
        "😆",
        "😅",
        "🤣",
        "😂",
        "🙂",
        "😊",
        "😇",
        "🥰",
        "😍",
        "🤩",
        "😘",
        "😗",
        "😚",
        "😙",
        "🥲",
        "😋",
        "😛",
        "😜",
        "🤪",
        "😝",
        "🤑",
        "🤗",
        "🤭",
        "🫢",
        "🫣",
        "🤫",
        "🤔",
        "🫡",
        "🤐",
        "🤨",
        "😐",
        "😑",
        "😶",
        "🫥",
        "😏",
        "😒",
        "🙄",
        "😬",
        "🤥",
        "😌",
        "😔",
        "😪",
        "🤤",
        "😴",
        "😷",
        "🤒",
        "🤕",
        "🤢",
        "🤮",
        "🥴",
        "😵",
        "🤯",
        "🥳",
        "🥺",
        "😢",
        "😭",
        "😤",
        "😠",
        "😡",
        "🤬",
        "💀",
        "☠️",
        "💩",
        "🤡",
        "👹",
        "👺"
      ] },
      { name: "Gestures", emojis: [
        "👋",
        "🤚",
        "🖐️",
        "✋",
        "🖖",
        "🫱",
        "🫲",
        "🫳",
        "🫴",
        "👌",
        "🤌",
        "🤏",
        "✌️",
        "🤞",
        "🫰",
        "🤟",
        "🤘",
        "🤙",
        "👈",
        "👉",
        "👆",
        "🖕",
        "👇",
        "🫵",
        "👍",
        "👎",
        "✊",
        "👊",
        "🤛",
        "🤜",
        "👏",
        "🙌",
        "🫶",
        "👐",
        "🤲",
        "🤝",
        "🙏",
        "✍️",
        "💅",
        "🤳"
      ] },
      { name: "Nature", emojis: [
        "🐶",
        "🐱",
        "🐭",
        "🐹",
        "🐰",
        "🦊",
        "🐻",
        "🐼",
        "🐨",
        "🐯",
        "🦁",
        "🐮",
        "🐷",
        "🐸",
        "🐵",
        "🐔",
        "🐧",
        "🐦",
        "🐤",
        "🦆",
        "🦅",
        "🦉",
        "🦇",
        "🐺",
        "🐗",
        "🐴",
        "🦄",
        "🐝",
        "🐛",
        "🦋",
        "🐌",
        "🐞",
        "🐜",
        "🦟",
        "🦗",
        "🪳",
        "🪰",
        "🪱",
        "🐢",
        "🐍",
        "🦎",
        "🦖",
        "🦕",
        "🐙",
        "🦑",
        "🦐",
        "🦞",
        "🦀",
        "🐡",
        "🐠"
      ] },
      { name: "Food", emojis: [
        "🍏",
        "🍎",
        "🍐",
        "🍊",
        "🍋",
        "🍌",
        "🍉",
        "🍇",
        "🍓",
        "🫐",
        "🍈",
        "🍒",
        "🍑",
        "🥭",
        "🍍",
        "🥥",
        "🥝",
        "🍅",
        "🍆",
        "🥑",
        "🥦",
        "🥬",
        "🥒",
        "🌶️",
        "🫑",
        "🌽",
        "🥕",
        "🫒",
        "🧄",
        "🧅",
        "🥔",
        "🍠",
        "🫓",
        "🥐",
        "🥖",
        "🥨",
        "🧀",
        "🥚",
        "🍳",
        "🥞",
        "🧇",
        "🥓",
        "🥩",
        "🍗",
        "🍖",
        "🦴",
        "🌭",
        "🍔",
        "🍟",
        "🍕"
      ] },
      { name: "Symbols", emojis: [
        "❤️",
        "🧡",
        "💛",
        "💚",
        "💙",
        "💜",
        "🖤",
        "🤍",
        "🤎",
        "💔",
        "❣️",
        "💕",
        "💞",
        "💓",
        "💗",
        "💖",
        "💘",
        "💝",
        "💟",
        "☮️",
        "✝️",
        "☪️",
        "🕉️",
        "☸️",
        "✡️",
        "🔯",
        "🕎",
        "☯️",
        "🪯",
        "♈",
        "♉",
        "♊",
        "♋",
        "♌",
        "♍",
        "♎",
        "♏",
        "♐",
        "♑",
        "♒",
        "♓",
        "⛎",
        "🔀",
        "🔁",
        "🔂",
        "▶️",
        "⏩",
        "⏭️",
        "⏯️",
        "◀️"
      ] }
    ], s = document.createElement("div");
    s.className = "ife-emoji-picker__body", n.forEach((a) => {
      const c = document.createElement("div");
      c.className = "ife-emoji-picker__group";
      const h = document.createElement("div");
      h.className = "ife-emoji-picker__group-label", h.textContent = a.name, c.appendChild(h);
      const m = document.createElement("div");
      m.className = "ife-emoji-picker__grid", a.emojis.forEach((g) => {
        const p = document.createElement("button");
        p.type = "button", p.className = "ife-emoji-picker__btn", p.textContent = g, p.setAttribute("aria-label", g), p.addEventListener("mousedown", (v) => v.preventDefault()), p.addEventListener("click", () => {
          this.editor.selection.restore(), this.editor.commands.insertHTML(g), this.close();
        }), m.appendChild(p);
      }), c.appendChild(m), s.appendChild(c);
    }), this.picker.appendChild(s), document.body.appendChild(this.picker);
    const r = this.editor.wrapper;
    this.picker.style.setProperty("--ife-bg", getComputedStyle(r).getPropertyValue("--ife-bg")), this.picker.style.setProperty("--ife-text", getComputedStyle(r).getPropertyValue("--ife-text")), this.picker.style.setProperty("--ife-border", getComputedStyle(r).getPropertyValue("--ife-border")), this.picker.style.setProperty("--ife-btn-hover", getComputedStyle(r).getPropertyValue("--ife-btn-hover")), this.picker.style.setProperty("--ife-btn-active", getComputedStyle(r).getPropertyValue("--ife-btn-active")), this.positionPicker(), this._boundOnResize = () => this.positionPicker(), this._boundOnScroll = () => {
      this.picker && this.close();
    }, this._boundOnClickOutside = (a) => {
      this.picker && (this.picker.contains(a.target) || this._triggerEl && this._triggerEl.contains(a.target) || this.close());
    }, window.addEventListener("resize", this._boundOnResize), window.addEventListener("scroll", this._boundOnScroll), document.addEventListener("click", this._boundOnClickOutside), setTimeout(() => {
      if (!this.picker) return;
      const a = this.picker.querySelector(".ife-emoji-picker__btn");
      a && a.focus();
    }, 50);
  }
  positionPicker() {
    if (!this._triggerEl || !this.picker) return;
    const e = this._triggerEl.getBoundingClientRect(), t = this.picker.offsetWidth || 352, i = this.picker.offsetHeight;
    let o = e.bottom + 4, n = e.left;
    o + i > window.innerHeight && e.top - i - 4 > 0 && (o = e.top - i - 4), n + t > window.innerWidth && (n = Math.max(8, window.innerWidth - t - 8)), n < 0 && (n = 8);
    const s = parseFloat(getComputedStyle(this.editor.wrapper).zIndex);
    isNaN(s) || (this.picker.style.zIndex = s + 1), this.picker.style.top = `${o}px`, this.picker.style.left = `${n}px`;
  }
  close() {
    this.picker && (this.picker.remove(), this.picker = null), this._triggerEl = null, this._removeListeners();
  }
  _removeListeners() {
    this._boundOnResize && (window.removeEventListener("resize", this._boundOnResize), this._boundOnResize = null), this._boundOnScroll && (window.removeEventListener("scroll", this._boundOnScroll), this._boundOnScroll = null), this._boundOnClickOutside && (document.removeEventListener("click", this._boundOnClickOutside), this._boundOnClickOutside = null);
  }
  destroy() {
    this.close();
  }
}
class fe {
  constructor(e) {
    this.editor = e, this.menu = null, this.handleContextMenu = this.handleContextMenu.bind(this), this.close = this.close.bind(this), e.root.addEventListener("contextmenu", this.handleContextMenu), document.addEventListener("click", this.close), document.addEventListener("keydown", (t) => {
      t.key === "Escape" && this.close();
    });
  }
  handleContextMenu(e) {
    e.preventDefault(), this.close();
    const t = e.target;
    this.menu = document.createElement("div"), this.menu.className = "ife-context-menu", this.menu.style.left = `${e.clientX}px`, this.menu.style.top = `${e.clientY}px`;
    const i = [], o = t.closest("figure.ife-image img");
    o && (i.push({ label: "Edit image", action: () => {
      var r;
      return (r = this.editor.module("image")) == null ? void 0 : r.open();
    } }), i.push({ label: "Remove image", action: () => {
      const r = o.closest("figure.ife-image");
      r && (this.editor.history.push(), r.remove(), this.editor.emitChange());
    } }));
    const n = t.closest("a");
    n && (i.push({ label: "Edit link", action: () => {
      var r;
      return (r = this.editor.module("link")) == null ? void 0 : r.open();
    } }), i.push({ label: "Remove link", action: () => {
      var r;
      return (r = this.editor.module("link")) == null ? void 0 : r.remove(n);
    } })), t.closest("td, th") && (i.push({ label: "Row above", action: () => {
      var r;
      return (r = this.editor.module("table")) == null ? void 0 : r.addRow(!0);
    } }), i.push({ label: "Row below", action: () => {
      var r;
      return (r = this.editor.module("table")) == null ? void 0 : r.addRow(!1);
    } }), i.push({ label: "Delete row", action: () => {
      var r;
      return (r = this.editor.module("table")) == null ? void 0 : r.deleteRow();
    } }), i.push({ label: "Column left", action: () => {
      var r;
      return (r = this.editor.module("table")) == null ? void 0 : r.addColumn(!0);
    } }), i.push({ label: "Column right", action: () => {
      var r;
      return (r = this.editor.module("table")) == null ? void 0 : r.addColumn(!1);
    } }), i.push({ label: "Delete column", action: () => {
      var r;
      return (r = this.editor.module("table")) == null ? void 0 : r.deleteColumn();
    } })), i.push({ type: "separator" }), i.push({ label: "Cut", action: () => document.execCommand("cut") }), i.push({ label: "Copy", action: () => document.execCommand("copy") }), i.push({ label: "Paste", action: () => {
      var r;
      return (r = navigator.clipboard) == null ? void 0 : r.readText().then((a) => {
        this.editor.commands.insertHTML(this.editor.escapeHtml(a));
      });
    } }), i.push({ type: "separator" }), i.push({ label: "Select all", action: () => {
      const r = document.createRange();
      r.selectNodeContents(this.editor.root), this.editor.selection.setRange(r);
    } }), i.forEach((r) => {
      if (r.type === "separator") {
        const c = document.createElement("div");
        c.className = "ife-context-menu__separator", this.menu.appendChild(c);
        return;
      }
      const a = document.createElement("button");
      a.type = "button", a.className = "ife-context-menu__item", a.textContent = r.label, a.addEventListener("mousedown", (c) => c.preventDefault()), a.addEventListener("click", () => {
        this.close(), this.editor.selection.restore(), r.action();
      }), this.menu.appendChild(a);
    }), document.body.appendChild(this.menu), this.editor.selection.save();
  }
  close() {
    this.menu && (this.menu.remove(), this.menu = null);
  }
  destroy() {
    this.close(), this.editor.root.removeEventListener("contextmenu", this.handleContextMenu), document.removeEventListener("click", this.close);
  }
}
const B = {
  blank: {
    label: "Blank page",
    html: "<p></p>"
  },
  article: {
    label: "Article",
    html: "<h1>Title</h1><p>Start writing your article here. This is a great place to introduce your topic and grab the reader's attention.</p><h2>Section heading</h2><p>Add your content here. Use headings to organize your thoughts and make your writing more scannable.</p>"
  },
  twoColumns: {
    label: "Two columns",
    html: '<table class="ife-table" style="width:100%"><tr><td style="width:50%"><h3>Column 1</h3><p>Content for the left column.</p></td><td style="width:50%"><h3>Column 2</h3><p>Content for the right column.</p></td></tr></table>'
  },
  checklist: {
    label: "Checklist",
    html: '<h3>Checklist</h3><ul class="ife-checklist"><li><input type="checkbox"> Task 1</li><li><input type="checkbox"> Task 2</li><li><input type="checkbox"> Task 3</li></ul>'
  },
  contactForm: {
    label: "Contact info",
    html: "<h3>Contact</h3><p><strong>Email:</strong> email@example.com</p><p><strong>Phone:</strong> +1 (555) 123-4567</p><p><strong>Address:</strong> 123 Main Street, City</p>"
  }
};
class be {
  constructor(e) {
    this.editor = e;
  }
  open() {
    const t = `
            <label class="ife-field">
                <span>Template</span>
                <select name="template">${Object.entries(B).map(
      ([i, o]) => `<option value="${i}">${o.label}</option>`
    ).join("")}</select>
            </label>
        `;
    this.dialog = new b(this.editor.wrapper, {
      title: "Insert template",
      bodyHtml: t,
      confirmLabel: "Insert",
      onConfirm: (i) => {
        const o = new FormData(i), n = String(o.get("template"));
        this.insert(n);
      }
    }), this.editor.selection.save(), this.dialog.open();
  }
  insert(e) {
    const t = B[e];
    t && (this.editor.history.push(), this.editor.selection.restore(), this.editor.commands.insertHTML(t.html));
  }
  destroy() {
    var e;
    (e = this.dialog) == null || e.close();
  }
}
const ve = {
  link: oe,
  image: ne,
  table: se,
  codeView: re,
  fullscreen: ae,
  find: le,
  note: he,
  media: de,
  markdown: ue,
  statusBar: pe,
  emoji: ge,
  contextMenu: fe,
  templates: be
};
Object.entries(ve).forEach(([l, e]) => {
  L.registerPlugin(l, (t) => new e(t));
});
const y = /* @__PURE__ */ new Map(), we = {
  /**
   * @param {string|HTMLTextAreaElement} target CSS selector or a textarea element
   * @param {import('./core/Editor.js').EditorOptions} [options]
   * @returns {EditorCore}
   */
  init(l, e = {}) {
    const t = typeof l == "string" ? document.querySelector(l) : l;
    if (!t)
      throw new Error(`InkForge Editor: target "${l}" not found`);
    if (t.tagName !== "TEXTAREA")
      throw new Error("InkForge Editor: init() target must be a <textarea> element");
    if (y.has(t))
      return y.get(t);
    const i = new L(t, e), o = new ie(i, e.toolbar);
    return i.on("destroy", () => o.destroy()), y.set(t, i), i.on("destroy", () => y.delete(t)), i;
  },
  /**
   * @param {string|HTMLTextAreaElement} target
   * @returns {EditorCore|undefined}
   */
  get(l) {
    const e = typeof l == "string" ? document.querySelector(l) : l;
    return e ? y.get(e) : void 0;
  },
  /** Destroys every editor instance currently mounted on the page. */
  destroyAll() {
    y.forEach((l) => l.destroy()), y.clear();
  },
  registerPlugin: L.registerPlugin
};
export {
  we as default
};
//# sourceMappingURL=inkforge-editor.esm.js.map
