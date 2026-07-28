var L = Object.defineProperty;
var H = (s, e, t) => e in s ? L(s, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : s[e] = t;
var v = (s, e, t) => H(s, typeof e != "symbol" ? e + "" : e, t);
class E {
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
    const i = (...n) => {
      this.off(e, i), t(...n);
    };
    this.on(e, i);
  }
  /**
   * @param {string} event
   * @param {...any} args
   */
  emit(e, ...t) {
    const i = this.listeners.get(e);
    i && [...i].forEach((n) => n(...t));
  }
  destroy() {
    this.listeners.clear();
  }
}
class M {
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
      const o = t.extractContents();
      i.appendChild(o), t.insertNode(i);
    }
    const n = document.createRange();
    return n.selectNodeContents(i), this.setRange(n), i;
  }
  focus() {
    this.root.focus(), this.restore();
  }
}
class T {
  /**
   * @param {object} options
   * @param {() => string} options.getContent
   * @param {(html: string) => void} options.setContent
   * @param {number} [options.maxSteps]
   * @param {number} [options.debounceMs]
   * @param {(event: string) => void} [options.onChange]
   */
  constructor({ getContent: e, setContent: t, maxSteps: i = 1e3, debounceMs: n = 300, onChange: o }) {
    this.getContent = e, this.setContent = t, this.maxSteps = i, this.debounceMs = n, this.onChange = o ?? (() => {
    }), this.undoStack = [], this.redoStack = [], this.timer = null, this.isRestoring = !1, this.undoStack.push(this.getContent());
  }
  /** Called on every input event; batches rapid keystrokes into one snapshot. */
  record() {
    this.isRestoring || (clearTimeout(this.timer), this.timer = setTimeout(() => this.push(), this.debounceMs));
  }
  /** Force-record immediately (e.g. before a toolbar command mutates content). */
  push() {
    if (this.isRestoring) return;
    const e = this.getContent(), t = this.undoStack[this.undoStack.length - 1];
    e !== t && (this.undoStack.push(e), this.undoStack.length > this.maxSteps && this.undoStack.shift(), this.redoStack = []);
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
    this.isRestoring = !0, this.setContent(t), this.isRestoring = !1, this.onChange("undo");
  }
  redo() {
    if (!this.canRedo()) return;
    const e = this.redoStack.pop();
    this.undoStack.push(e), this.isRestoring = !0, this.setContent(e), this.isRestoring = !1, this.onChange("redo");
  }
  clear() {
    clearTimeout(this.timer), this.undoStack = [this.getContent()], this.redoStack = [];
  }
  destroy() {
    clearTimeout(this.timer), this.undoStack = [], this.redoStack = [];
  }
}
class z {
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
  }
  exec(e, t = null) {
    switch (this.prepare(), this.editor.history.push(), e) {
      case "bold":
      case "italic":
      case "underline":
      case "strikeThrough":
      case "superscript":
      case "subscript":
      case "insertUnorderedList":
      case "insertOrderedList":
      case "indent":
      case "outdent":
      case "justifyLeft":
      case "justifyCenter":
      case "justifyRight":
      case "justifyFull":
        document.execCommand(e, !1, t ?? void 0);
        break;
      case "foreColor":
        document.execCommand("foreColor", !1, t);
        break;
      case "backColor":
        document.execCommand("hiliteColor", !1, t);
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
      case "removeFormat":
        document.execCommand("removeFormat", !1);
        break;
      default:
        throw new Error(`Unknown command: ${e}`);
    }
    this.editor.emitChange();
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
   * @param {string} tagName
   */
  setBlockFormat(e) {
    const t = this.selection.getBlockElement();
    if (!t || t === this.root) {
      document.execCommand("formatBlock", !1, `<${e}>`);
      return;
    }
    const i = document.createElement(e);
    i.innerHTML = t.innerHTML, t.replaceWith(i);
    const n = document.createRange();
    n.selectNodeContents(i), n.collapse(!1), this.selection.setRange(n);
  }
  /**
   * Applies an inline CSS property to the current selection by wrapping it in a <span>.
   * @param {string} cssProperty camelCase property name
   * @param {string} value
   * @param {boolean} [onBlock] apply to the enclosing block instead of wrapping inline
   */
  setInlineStyle(e, t, i = !1) {
    if (i) {
      const o = this.selection.getBlockElement();
      if (o) {
        o.style[e] = t;
        return;
      }
    }
    const n = this.selection.wrap("span");
    n && (n.style[e] = t);
  }
  /** Inserts raw (already sanitized) HTML at the current caret position. */
  insertHTML(e) {
    this.prepare(), this.editor.history.push();
    const t = this.selection.getRange();
    if (!t) return;
    t.deleteContents();
    const i = t.createContextualFragment(e), n = i.lastChild;
    if (t.insertNode(i), n) {
      const o = document.createRange();
      o.setStartAfter(n), o.collapse(!0), this.selection.setRange(o);
    }
    this.editor.emitChange();
  }
}
const S = /* @__PURE__ */ new Set([
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
  "hr"
]), x = {
  "*": /* @__PURE__ */ new Set(["class", "style", "id"]),
  a: /* @__PURE__ */ new Set(["href", "target", "rel", "title"]),
  img: /* @__PURE__ */ new Set(["src", "alt", "title", "width", "height", "loading"]),
  iframe: /* @__PURE__ */ new Set(["src", "width", "height", "allow", "allowfullscreen", "frameborder"]),
  video: /* @__PURE__ */ new Set(["src", "controls", "width", "height", "poster"]),
  audio: /* @__PURE__ */ new Set(["src", "controls"]),
  source: /* @__PURE__ */ new Set(["src", "type"])
}, R = /* @__PURE__ */ new Set(["http:", "https:", "mailto:", "tel:", ""]);
class N {
  /**
   * @param {object} [options]
   * @param {string[]} [options.allowedTags]
   * @param {Record<string, string[]>} [options.allowedAttributes]
   * @param {string[]} [options.allowedUrlSchemes]
   */
  constructor(e = {}) {
    this.allowedTags = e.allowedTags ? new Set(e.allowedTags) : S, this.allowedAttrs = e.allowedAttributes ? Object.fromEntries(Object.entries(e.allowedAttributes).map(([t, i]) => [t, new Set(i)])) : x, this.allowedSchemes = e.allowedUrlSchemes ? new Set(e.allowedUrlSchemes.map((t) => `${t}:`)) : R;
  }
  /**
   * @param {string} dirtyHtml
   * @returns {string} sanitized HTML
   */
  sanitize(e) {
    const t = document.createElement("template");
    return t.innerHTML = e, this.cleanNode(t.content), t.innerHTML;
  }
  /** @param {Node} root */
  cleanNode(e) {
    const t = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, null), i = [];
    let n = t.nextNode();
    for (; n; ) {
      const o = (
        /** @type {HTMLElement} */
        n
      ), r = o.tagName.toLowerCase();
      if (r === "script" || r === "style" || r === "noscript") {
        i.push(o), n = t.nextNode();
        continue;
      }
      if (!this.allowedTags.has(r)) {
        this.unwrap(o), n = t.nextNode();
        continue;
      }
      this.cleanAttributes(o, r), n = t.nextNode();
    }
    i.forEach((o) => o.remove());
  }
  /**
   * @param {HTMLElement} el
   * @param {string} tag
   */
  cleanAttributes(e, t) {
    const i = this.allowedAttrs["*"] ?? /* @__PURE__ */ new Set(), n = this.allowedAttrs[t] ?? /* @__PURE__ */ new Set();
    [...e.attributes].forEach((o) => {
      const r = o.name.toLowerCase();
      if (r.startsWith("on")) {
        e.removeAttribute(o.name);
        return;
      }
      if (!i.has(r) && !n.has(r)) {
        e.removeAttribute(o.name);
        return;
      }
      (r === "href" || r === "src") && !this.isSafeUrl(o.value) && e.removeAttribute(o.name), r === "style" && e.setAttribute("style", this.cleanStyle(o.value));
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
  /** Strips dangerous CSS such as expression()/url(javascript:). */
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
const $ = {
  theme: "auto",
  locale: "en",
  height: 420,
  history: { max_steps: 1e3, debounce_ms: 300 },
  autosave: { enabled: !1, interval_ms: 15e3, storage_key: "inkforge-editor-autosave" }
}, y = /* @__PURE__ */ new Map();
let b = class {
  /**
   * @param {HTMLTextAreaElement} textarea
   * @param {EditorOptions} options
   */
  constructor(e, t = {}) {
    var i, n;
    this.textarea = e, this.options = { ...$, ...t }, this.events = new E(), this.sanitizer = new N(this.options.sanitizer), this.plugins = /* @__PURE__ */ new Map(), this.buildDom(), this.selection = new M(this.root), this.commands = new z(this), this.history = new T({
      getContent: () => this.root.innerHTML,
      setContent: (o) => {
        this.root.innerHTML = o;
      },
      maxSteps: ((i = this.options.history) == null ? void 0 : i.max_steps) ?? 1e3,
      debounceMs: ((n = this.options.history) == null ? void 0 : n.debounce_ms) ?? 300,
      onChange: (o) => this.events.emit(o)
    }), this.bindEvents(), this.applyTheme(this.options.theme), this.loadPlugins(), this.setupAutosave(), this.events.emit("init", this);
  }
  /** Builds the contenteditable root and hides the original textarea. */
  buildDom() {
    this.textarea.style.display = "none", this.wrapper = document.createElement("div"), this.wrapper.className = "ife-wrapper", this.wrapper.dataset.theme = this.options.theme, this.root = document.createElement("div"), this.root.className = "ife-content", this.root.contentEditable = "true", this.root.spellcheck = !0, this.root.style.minHeight = `${this.options.height}px`, this.root.innerHTML = this.sanitizer.sanitize(this.textarea.value || ""), this.root.setAttribute("role", "textbox"), this.root.setAttribute("aria-multiline", "true"), this.wrapper.appendChild(this.root), this.textarea.insertAdjacentElement("afterend", this.wrapper);
  }
  bindEvents() {
    this.root.addEventListener("input", () => {
      this.history.record(), this.emitChange();
    }), this.root.addEventListener("keyup", () => this.syncSelectionState()), this.root.addEventListener("mouseup", () => this.syncSelectionState()), this.root.addEventListener("focus", () => this.events.emit("focus", this)), this.root.addEventListener("blur", () => {
      this.selection.save(), this.syncTextarea(), this.events.emit("blur", this);
    }), this.root.addEventListener("paste", (e) => this.handlePaste(e)), this.root.addEventListener("drop", (e) => this.events.emit("drop", e)), document.addEventListener("keydown", this.handleShortcut.bind(this)), this.textarea.form && this.textarea.form.addEventListener("submit", () => this.syncTextarea());
  }
  syncSelectionState() {
    this.selection.save(), this.events.emit("selectionchange", this);
  }
  syncTextarea() {
    this.textarea.value = this.getHTML();
  }
  emitChange() {
    this.syncTextarea(), this.events.emit("change", this.getHTML());
  }
  /** @param {ClipboardEvent} event */
  handlePaste(e) {
    var o, r;
    e.preventDefault();
    const t = (o = e.clipboardData) == null ? void 0 : o.getData("text/html"), i = ((r = e.clipboardData) == null ? void 0 : r.getData("text/plain")) ?? "", n = t ? this.sanitizer.sanitize(t) : this.escapeHtml(i);
    this.commands.insertHTML(n), this.events.emit("paste", { html: t, text: i });
  }
  /** @param {string} text */
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML.replace(/\n/g, "<br>");
  }
  /** @param {KeyboardEvent} event */
  handleShortcut(e) {
    if (!this.root.contains(document.activeElement) || !(e.ctrlKey || e.metaKey)) return;
    const n = {
      b: () => this.commands.exec("bold"),
      i: () => this.commands.exec("italic"),
      u: () => this.commands.exec("underline"),
      z: () => e.shiftKey ? this.history.redo() : this.history.undo(),
      y: () => this.history.redo(),
      s: () => this.events.emit("save", this.getHTML())
    }[e.key.toLowerCase()];
    n && (e.preventDefault(), n());
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
    y.forEach((t, i) => {
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
    this.setHTML(""), this.history.clear();
  }
  focus() {
    this.selection.focus();
  }
  getText() {
    return this.root.textContent ?? "";
  }
  destroy() {
    this.plugins.forEach((e) => {
      var t;
      return (t = e == null ? void 0 : e.destroy) == null ? void 0 : t.call(e);
    }), this.events.emit("destroy", this), clearInterval(this.autosaveTimer), document.removeEventListener("keydown", this.handleShortcut), this.wrapper.remove(), this.textarea.style.display = "", this.events.destroy();
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
    y.set(e, t);
  }
};
const l = (s) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">${s}</svg>`, c = {
  undo: l('<path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>'),
  redo: l('<path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.06-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>'),
  bold: l('<path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h6.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5S13.83 9.5 13 9.5h-3v-3zm3.5 8H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>'),
  italic: l('<path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>'),
  underline: l('<path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/>'),
  strikeThrough: l('<path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/>'),
  superscript: l('<path d="M20.34 4.63l-1.31 1.53-1.31-1.53-.72.61 1.52 1.76-1.52 1.76.72.61 1.31-1.53 1.31 1.53.72-.61-1.52-1.76 1.52-1.76zM5.88 18.94h2.66l3.16-4.98h.12l3.17 4.98h2.66l-4.32-6.6 4.03-6.15h-2.61l-2.9 4.65h-.12l-2.89-4.65H6.02l4.04 6.19z"/>'),
  subscript: l('<path d="M20.34 19.37l-1.31-1.53-1.31 1.53-.72-.61 1.52-1.76-1.52-1.76.72-.61 1.31 1.53 1.31-1.53.72.61-1.52 1.76 1.52 1.76zM5.88 18.94h2.66l3.16-4.98h.12l3.17 4.98h2.66l-4.32-6.6 4.03-6.15h-2.61l-2.9 4.65h-.12l-2.89-4.65H6.02l4.04 6.19z"/>'),
  formatColorText: l('<path d="M2 20h20v4H2zM5.49 17h1.9l1.13-3h4.96l1.13 3h1.9L11.44 3h-1.87L5.49 17zm3.66-4.66L11 6l1.85 6.34H9.15z"/>'),
  formatColorFill: l('<path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z"/>'),
  alignLeft: l('<path d="M3 21h12v-2H3v2zM3 17h18v-2H3v2zM3 13h12v-2H3v2zM3 9h18V7H3v2zM3 5h12V3H3v2z"/>'),
  alignCenter: l('<path d="M7 21h10v-2H7v2zM3 17h18v-2H3v2zM7 13h10v-2H7v2zM3 9h18V7H3v2zM7 5h10V3H7v2z"/>'),
  alignRight: l('<path d="M9 21h12v-2H9v2zM3 17h18v-2H3v2zM9 13h12v-2H9v2zM3 9h18V7H3v2zM9 5h12V3H9v2z"/>'),
  alignJustify: l('<path d="M3 21h18v-2H3v2zM3 17h18v-2H3v2zM3 13h18v-2H3v2zM3 9h18V7H3v2zM3 5h18V3H3v2z"/>'),
  listBulleted: l('<path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>'),
  listNumbered: l('<path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zM7 5v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>'),
  checklist: l('<path d="M3 5h6v6H3V5zm2 2v2h2V7H5zm6.5-1.5h9v2h-9v-2zm0 6.5h9v2h-9v-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm6.5.5h9v2h-9v-2z"/>'),
  link: l('<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>'),
  unlink: l('<path d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zM3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM2 2l20 20-1.4 1.4L.6 3.4z"/>'),
  image: l('<path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>'),
  videocam: l('<path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11z"/>'),
  audiotrack: l('<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>'),
  table: l('<path d="M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zm0 5h16V6H4v3zm0 2v3h5v-3H4zm7 0v3h9v-3h-9zm-7 5v3h5v-3H4zm7 0v3h9v-3h-9z"/>'),
  hr: l('<path d="M2 11h20v2H2z"/>'),
  blockquote: l('<path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>'),
  code: l('<path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6z"/>'),
  codeBlock: l('<path d="M3 3h18v18H3zm2 2v14h14V5H5zm3.4 7.6L4.8 9l3.6-3.6L9.8 6.8 7.4 9l2.4 2.2zm5.2 0l2.4-2.6-2.4-2.2 1.4-1.4L19 9l-3.6 3.6z"/>'),
  note: l('<path d="M20 2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM7 9h10v2H7V9zm6 6H7v-2h6v2zm4-8H7V5h10v2z"/>'),
  emoji: l('<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm7 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM12 17.5c-2.33 0-4.32-1.45-5.15-3.5h10.3c-.83 2.05-2.82 3.5-5.15 3.5z"/>'),
  specialChars: l('<path d="M5 4v3h5.5v12h3V7H19V4z"/>'),
  find: l('<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1114 9.5 4.5 4.5 0 019.5 14z"/>'),
  sourceCode: l('<path d="M14.6 16.6L19.2 12l-4.6-4.6L16 6l6 6-6 6zM9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6z"/>'),
  fullscreen: l('<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>'),
  indent: l('<path d="M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/>'),
  outdent: l('<path d="M3 21h18v-2H3v2zM7 8v8l-4-4 4-4zm4 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/>')
}, A = {
  undo: { icon: c.undo, label: "Undo (Ctrl+Z)", type: "action", action: (s) => s.undo() },
  redo: { icon: c.redo, label: "Redo (Ctrl+Y)", type: "action", action: (s) => s.redo() },
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
    onChange: (s, e) => s.commands.exec("blockFormat", e)
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
    onChange: (s, e) => s.commands.exec("fontName", e)
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
    onChange: (s, e) => s.commands.exec("fontSize", e)
  },
  bold: { icon: c.bold, label: "Bold (Ctrl+B)", type: "command", command: "bold" },
  italic: { icon: c.italic, label: "Italic (Ctrl+I)", type: "command", command: "italic" },
  underline: { icon: c.underline, label: "Underline (Ctrl+U)", type: "command", command: "underline" },
  strike: { icon: c.strikeThrough, label: "Strikethrough", type: "command", command: "strikeThrough" },
  superscript: { icon: c.superscript, label: "Superscript", type: "command", command: "superscript" },
  subscript: { icon: c.subscript, label: "Subscript", type: "command", command: "subscript" },
  forecolor: { icon: c.formatColorText, label: "Text color", type: "color", command: "foreColor" },
  backcolor: { icon: c.formatColorFill, label: "Background color", type: "color", command: "backColor" },
  alignLeft: { icon: c.alignLeft, label: "Align left", type: "command", command: "justifyLeft" },
  alignCenter: { icon: c.alignCenter, label: "Align center", type: "command", command: "justifyCenter" },
  alignRight: { icon: c.alignRight, label: "Align right", type: "command", command: "justifyRight" },
  alignJustify: { icon: c.alignJustify, label: "Justify", type: "command", command: "justifyFull" },
  bulletList: { icon: c.listBulleted, label: "Bulleted list", type: "command", command: "insertUnorderedList" },
  orderedList: { icon: c.listNumbered, label: "Numbered list", type: "command", command: "insertOrderedList" },
  checklist: {
    icon: c.checklist,
    label: "Checklist",
    type: "action",
    action: (s) => s.commands.insertHTML('<ul class="ife-checklist"><li><input type="checkbox"> Item</li></ul>')
  },
  indent: { icon: c.indent, label: "Increase indent", type: "command", command: "indent" },
  outdent: { icon: c.outdent, label: "Decrease indent", type: "command", command: "outdent" },
  link: { icon: c.link, label: "Insert/edit link", type: "action", action: (s) => s.module("link").open() },
  unlink: {
    icon: c.unlink,
    label: "Remove link",
    type: "action",
    action: (s) => {
      const e = s.selection.closest("a");
      e && s.module("link").remove(e);
    }
  },
  image: { icon: c.image, label: "Insert image", type: "action", action: (s) => s.module("image").open() },
  video: { icon: c.videocam, label: "Insert video", type: "action", action: (s) => s.module("media").openVideo() },
  audio: { icon: c.audiotrack, label: "Insert audio", type: "action", action: (s) => s.module("media").openAudio() },
  table: { icon: c.table, label: "Insert table", type: "action", action: (s) => s.module("table").openInsertDialog() },
  hr: { icon: c.hr, label: "Horizontal rule", type: "action", action: (s) => s.module("media").insertHorizontalRule() },
  blockquote: { icon: c.blockquote, label: "Blockquote", type: "action", action: (s) => s.commands.exec("blockFormat", "blockquote") },
  codeInline: {
    icon: c.code,
    label: "Inline code",
    type: "action",
    action: (s) => s.selection.wrap("code") && s.emitChange()
  },
  codeBlock: { icon: c.codeBlock, label: "Code block", type: "action", action: (s) => s.commands.exec("blockFormat", "pre") },
  note: { icon: c.note, label: "Insert note", type: "action", action: (s) => s.module("note").open() },
  emoji: {
    icon: c.emoji,
    label: "Emoji",
    type: "action",
    action: (s) => s.commands.insertHTML("😀")
  },
  specialChars: {
    icon: c.specialChars,
    label: "Special characters",
    type: "action",
    action: (s) => s.commands.insertHTML("&amp;copy;")
  },
  find: { icon: c.find, label: "Find & Replace", type: "action", action: (s) => s.module("find").open() },
  sourceCode: {
    icon: c.sourceCode,
    label: "Source code",
    type: "action",
    toggle: !0,
    action: (s) => s.module("codeView").toggle()
  },
  fullscreen: {
    icon: c.fullscreen,
    label: "Fullscreen",
    type: "action",
    toggle: !0,
    action: (s) => s.module("fullscreen").toggle()
  }
}, V = {
  undo: "Undo",
  redo: "Redo",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  strike: "Strikethrough",
  link: "Insert/edit link",
  unlink: "Remove link",
  image: "Insert image",
  video: "Insert video",
  audio: "Insert audio",
  table: "Insert table",
  insert: "Insert",
  update: "Update",
  cancel: "Cancel",
  remove: "Remove",
  findReplace: "Find & Replace",
  sourceCode: "Source code",
  fullscreen: "Fullscreen",
  uploadFailed: "Failed to upload the file. Please try again."
}, I = {
  undo: "Скасувати",
  redo: "Повторити",
  bold: "Жирний",
  italic: "Курсив",
  underline: "Підкреслений",
  strike: "Закреслений",
  link: "Вставити/редагувати посилання",
  unlink: "Видалити посилання",
  image: "Вставити зображення",
  video: "Вставити відео",
  audio: "Вставити аудіо",
  table: "Вставити таблицю",
  insert: "Вставити",
  update: "Оновити",
  cancel: "Скасувати",
  remove: "Видалити",
  findReplace: "Знайти та замінити",
  sourceCode: "Вихідний код",
  fullscreen: "Повноекранний режим",
  uploadFailed: "Не вдалося завантажити файл. Спробуйте ще раз."
}, F = {
  undo: "Отменить",
  redo: "Повторить",
  bold: "Жирный",
  italic: "Курсив",
  underline: "Подчёркнутый",
  strike: "Зачёркнутый",
  link: "Вставить/редактировать ссылку",
  unlink: "Удалить ссылку",
  image: "Вставить изображение",
  video: "Вставить видео",
  audio: "Вставить аудио",
  table: "Вставить таблицу",
  insert: "Вставить",
  update: "Обновить",
  cancel: "Отмена",
  remove: "Удалить",
  findReplace: "Найти и заменить",
  sourceCode: "Исходный код",
  fullscreen: "Полноэкранный режим",
  uploadFailed: "Не удалось загрузить файл. Попробуйте ещё раз."
}, f = /* @__PURE__ */ new Map([
  ["en", V],
  ["uk", I],
  ["ru", F]
]), w = {
  /**
   * @param {string} code
   * @param {Record<string, string>} strings
   */
  register(s, e) {
    f.set(s, e);
  },
  /**
   * @param {string} locale
   * @param {string} key
   * @returns {string}
   */
  t(s, e) {
    return (f.get(s) ?? f.get("en"))[e] ?? f.get("en")[e] ?? e;
  },
  available() {
    return [...f.keys()];
  }
}, _ = [
  ["undo", "redo"],
  ["blockFormat", "fontFamily", "fontSize"],
  ["bold", "italic", "underline", "strike", "superscript", "subscript"],
  ["forecolor", "backcolor"],
  ["alignLeft", "alignCenter", "alignRight", "alignJustify"],
  ["bulletList", "orderedList", "checklist", "indent", "outdent"],
  ["link", "unlink", "image", "video", "audio", "table", "hr"],
  ["blockquote", "codeInline", "codeBlock", "note"],
  ["emoji", "specialChars"],
  ["find", "sourceCode", "fullscreen"]
];
class D {
  /**
   * @param {import('../core/Editor').default} editor
   * @param {Array<string[]>|null} [layout]
   */
  constructor(e, t = null) {
    this.editor = e, this.layout = t ?? _, this.buttons = /* @__PURE__ */ new Map(), this.el = document.createElement("div"), this.el.className = "ife-toolbar", this.el.setAttribute("role", "toolbar"), this.el.setAttribute("aria-label", "Text formatting"), this.render(), this.editor.wrapper.insertBefore(this.el, this.editor.root), this.editor.on("selectionchange", () => this.syncActiveStates()), this.editor.on("focus", () => this.syncActiveStates());
  }
  render() {
    this.layout.forEach((e) => {
      const t = document.createElement("div");
      t.className = "ife-toolbar__group", e.forEach((i) => {
        const n = A[i];
        if (!n) return;
        const o = this.buildControl(i, n);
        o && t.appendChild(o);
      }), t.children.length && this.el.appendChild(t);
    });
  }
  buildControl(e, t) {
    return t.type === "select" ? this.buildSelect(e, t) : t.type === "color" ? this.buildColorPicker(e, t) : this.buildButton(e, t);
  }
  buildButton(e, t) {
    const i = this.editor.options.locale ?? "en", n = w.t(i, e) !== e ? w.t(i, e) : t.label, o = document.createElement("button");
    return o.type = "button", o.className = "ife-toolbar__btn", o.dataset.command = e, o.title = n, o.setAttribute("aria-label", n), o.innerHTML = t.icon ?? "", o.addEventListener("mousedown", (r) => r.preventDefault()), o.addEventListener("click", () => {
      var r;
      this.editor.selection.restore(), t.type === "command" ? this.editor.commands.exec(t.command) : (r = t.action) == null || r.call(t, this.editor), t.toggle && o.classList.toggle("is-active"), this.syncActiveStates();
    }), this.buttons.set(e, o), o;
  }
  buildSelect(e, t) {
    const i = document.createElement("select");
    return i.className = "ife-toolbar__select", i.setAttribute("aria-label", t.label), t.options.forEach(([n, o]) => {
      const r = document.createElement("option");
      r.value = n, r.textContent = o, i.appendChild(r);
    }), i.addEventListener("mousedown", (n) => n.stopPropagation()), i.addEventListener("change", () => {
      this.editor.selection.restore(), t.onChange(this.editor, i.value);
    }), this.buttons.set(e, i), i;
  }
  buildColorPicker(e, t) {
    const i = document.createElement("label");
    i.className = "ife-toolbar__color", i.title = t.label, i.innerHTML = t.icon;
    const n = document.createElement("input");
    return n.type = "color", n.setAttribute("aria-label", t.label), n.addEventListener("input", () => {
      this.editor.selection.restore(), this.editor.commands.exec(t.command, n.value);
    }), i.appendChild(n), this.buttons.set(e, i), i;
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
    }).forEach(([t, i]) => {
      const n = this.buttons.get(t);
      n instanceof HTMLElement && n.classList.toggle("is-active", this.editor.commands.queryState(i));
    });
  }
  setEnabled(e, t) {
    const i = this.buttons.get(e);
    (i instanceof HTMLButtonElement || i instanceof HTMLSelectElement) && (i.disabled = !t);
  }
  destroy() {
    this.el.remove();
  }
}
class g {
  /**
   * @param {HTMLElement} container element the dialog is appended to (editor wrapper)
   * @param {object} config
   * @param {string} config.title
   * @param {string} config.bodyHtml
   * @param {string} [config.confirmLabel]
   * @param {string} [config.cancelLabel]
   * @param {(form: HTMLFormElement) => void} config.onConfirm
   */
  constructor(e, { title: t, bodyHtml: i, confirmLabel: n = "OK", cancelLabel: o = "Cancel", onConfirm: r }) {
    v(this, "handleEscape", (e) => {
      e.key === "Escape" && this.close();
    });
    this.container = e, this.onConfirm = r, this.overlay = document.createElement("div"), this.overlay.className = "ife-dialog-overlay", this.overlay.innerHTML = `
            <form class="ife-dialog" role="dialog" aria-modal="true" aria-label="${t}">
                <header class="ife-dialog__header">
                    <h2>${t}</h2>
                    <button type="button" class="ife-dialog__close" aria-label="Close">&times;</button>
                </header>
                <div class="ife-dialog__body">${i}</div>
                <footer class="ife-dialog__footer">
                    <button type="button" class="ife-btn ife-btn--ghost" data-action="cancel">${o}</button>
                    <button type="submit" class="ife-btn ife-btn--primary" data-action="confirm">${n}</button>
                </footer>
            </form>
        `, this.form = this.overlay.querySelector("form"), this.overlay.querySelector(".ife-dialog__close").addEventListener("click", () => this.close()), this.overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => this.close()), this.overlay.addEventListener("click", (a) => {
      a.target === this.overlay && this.close();
    }), this.form.addEventListener("submit", (a) => {
      a.preventDefault(), this.onConfirm(this.form), this.close();
    }), document.addEventListener("keydown", this.handleEscape);
  }
  open() {
    this.container.appendChild(this.overlay);
    const e = this.form.querySelector("input, textarea, select");
    e == null || e.focus();
  }
  close() {
    document.removeEventListener("keydown", this.handleEscape), this.overlay.remove();
  }
}
class B {
  constructor(e) {
    this.editor = e;
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
    if (this.dialog = new g(this.editor.wrapper, {
      title: e ? "Edit link" : "Insert link",
      bodyHtml: i,
      confirmLabel: e ? "Update" : "Insert",
      onConfirm: (n) => this.apply(n, e)
    }), this.editor.selection.save(), this.dialog.open(), e) {
      const n = document.createElement("button");
      n.type = "button", n.className = "ife-btn ife-btn--danger", n.textContent = "Remove link", n.addEventListener("click", () => {
        this.remove(e), this.dialog.close();
      }), this.dialog.form.querySelector(".ife-dialog__footer").prepend(n);
    }
  }
  apply(e, t) {
    const i = new FormData(e), n = ["nofollow", "noopener", "noreferrer"].filter((r) => i.get(r)).join(" "), o = t ?? document.createElement("a");
    if (o.textContent = String(i.get("text")), o.setAttribute("href", String(i.get("href"))), o.setAttribute("title", String(i.get("title") ?? "")), o.setAttribute("target", i.get("newTab") ? "_blank" : "_self"), n ? o.setAttribute("rel", n) : o.removeAttribute("rel"), this.editor.history.push(), !t) {
      this.editor.selection.restore();
      const r = this.editor.selection.getRange();
      r == null || r.deleteContents(), r == null || r.insertNode(o);
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
    return String(e ?? "").replace(/"/g, "&quot;");
  }
  destroy() {
    var e;
    (e = this.dialog) == null || e.close();
  }
}
class U {
  constructor(e) {
    this.editor = e, this.uploadUrl = e.options.uploadUrl, this.handleDrop = this.handleDrop.bind(this), e.root.addEventListener("dragover", (t) => t.preventDefault()), e.root.addEventListener("drop", this.handleDrop);
  }
  open() {
    const e = `
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
    this.dialog = new g(this.editor.wrapper, {
      title: "Insert image",
      bodyHtml: e,
      confirmLabel: "Insert",
      onConfirm: (t) => this.handleSubmit(t)
    }), this.editor.selection.save(), this.dialog.open();
  }
  async handleSubmit(e) {
    const t = new FormData(e), i = t.get("file");
    let n = String(t.get("src") ?? "");
    i instanceof File && i.size > 0 && (n = await this.upload(i), !n) || n && this.insert({
      src: n,
      alt: String(t.get("alt") ?? ""),
      caption: String(t.get("caption") ?? ""),
      align: String(t.get("align") ?? "center"),
      lazy: !!t.get("lazy")
    });
  }
  /** @param {File} file */
  async upload(e) {
    var n;
    if (!this.uploadUrl)
      return console.warn("InkForge Editor: no uploadUrl configured, falling back to a local object URL."), URL.createObjectURL(e);
    const t = new FormData();
    t.append("file", e);
    const i = (n = document.querySelector('meta[name="csrf-token"]')) == null ? void 0 : n.content;
    try {
      const o = await fetch(this.uploadUrl, {
        method: "POST",
        headers: i ? { "X-CSRF-TOKEN": i } : {},
        body: t,
        credentials: "same-origin"
      }), r = await o.json();
      if (!o.ok || !r.success)
        throw new Error(r.message ?? "Upload failed");
      return r.url;
    } catch (o) {
      return this.editor.events.emit("error", o), null;
    }
  }
  /**
   * @param {{src:string, alt:string, caption:string, align:string, lazy:boolean}} options
   */
  insert({ src: e, alt: t, caption: i, align: n, lazy: o }) {
    this.editor.history.push(), this.editor.selection.restore();
    const r = document.createElement("figure");
    r.className = `ife-image ife-image--${n}`;
    const a = document.createElement("img");
    if (a.src = e, a.alt = t, o && (a.loading = "lazy"), r.appendChild(a), i) {
      const u = document.createElement("figcaption");
      u.textContent = i, r.appendChild(u);
    }
    this.makeResizable(a);
    const h = this.editor.selection.getRange();
    h == null || h.deleteContents(), h == null || h.insertNode(r), this.editor.emitChange();
  }
  /** Adds a simple drag-corner resize handle to an inserted image. */
  makeResizable(e) {
    e.addEventListener("click", () => {
      var t;
      this.editor.root.querySelectorAll(".ife-image--selected").forEach((i) => i.classList.remove("ife-image--selected")), (t = e.closest("figure")) == null || t.classList.add("ife-image--selected");
    }), e.addEventListener("mousedown", (t) => {
      if (!t.altKey) return;
      t.preventDefault();
      const i = t.clientX, n = e.getBoundingClientRect().width, o = (a) => {
        const h = a.clientX - i;
        e.style.width = `${Math.max(40, n + h)}px`;
      }, r = () => {
        document.removeEventListener("mousemove", o), document.removeEventListener("mouseup", r), this.editor.emitChange();
      };
      document.addEventListener("mousemove", o), document.addEventListener("mouseup", r);
    });
  }
  /** @param {DragEvent} event */
  async handleDrop(e) {
    var n, o;
    const t = (o = (n = e.dataTransfer) == null ? void 0 : n.files) == null ? void 0 : o[0];
    if (!t || !t.type.startsWith("image/")) return;
    e.preventDefault();
    const i = await this.upload(t);
    i && (this.editor.selection.save(), this.insert({ src: i, alt: "", caption: "", align: "center", lazy: !0 }));
  }
  destroy() {
    var e;
    (e = this.dialog) == null || e.close(), this.editor.root.removeEventListener("drop", this.handleDrop);
  }
}
class q {
  constructor(e) {
    this.editor = e, this.editor.root.addEventListener("click", () => this.syncContextToolbar()), this.editor.root.addEventListener("keyup", () => this.syncContextToolbar());
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
    this.editor.selection.save(), new g(this.editor.wrapper, {
      title: "Insert table",
      bodyHtml: e,
      confirmLabel: "Insert",
      onConfirm: (i) => {
        const n = new FormData(i);
        this.insertTable(Number(n.get("rows")), Number(n.get("cols")), !!n.get("header"));
      }
    }).open();
  }
  insertTable(e, t, i) {
    this.editor.history.push(), this.editor.selection.restore();
    const n = document.createElement("table");
    if (n.className = "ife-table", i) {
      const u = n.createTHead().insertRow();
      for (let d = 0; d < t; d += 1) {
        const m = document.createElement("th");
        m.contentEditable = "true", m.innerHTML = "<br>", u.appendChild(m);
      }
    }
    const o = n.createTBody(), r = i ? e - 1 : e;
    for (let h = 0; h < Math.max(r, 1); h += 1) {
      const u = o.insertRow();
      for (let d = 0; d < t; d += 1) {
        const m = u.insertCell();
        m.innerHTML = "<br>";
      }
    }
    const a = this.editor.selection.getRange();
    a == null || a.deleteContents(), a == null || a.insertNode(n), this.editor.emitChange();
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
    this.editor.history.push();
    const n = i.cloneNode(!0);
    [...n.children].forEach((o) => {
      o.innerHTML = "<br>";
    }), i.parentNode.insertBefore(n, e ? i : i.nextSibling), this.editor.emitChange();
  }
  deleteRow() {
    var t;
    const e = (t = this.getCurrentCell()) == null ? void 0 : t.closest("tr");
    e && (this.editor.history.push(), e.remove(), this.editor.emitChange());
  }
  addColumn(e = !1) {
    const t = this.getCurrentTable(), i = this.getCurrentCell();
    if (!t || !i) return;
    const n = [...i.parentNode.children].indexOf(i);
    this.editor.history.push(), t.querySelectorAll("tr").forEach((o) => {
      const r = o.children[n], a = document.createElement((r == null ? void 0 : r.tagName.toLowerCase()) === "th" ? "th" : "td");
      a.innerHTML = "<br>", o.insertBefore(a, e ? r : (r == null ? void 0 : r.nextSibling) ?? null);
    }), this.editor.emitChange();
  }
  deleteColumn() {
    const e = this.getCurrentTable(), t = this.getCurrentCell();
    if (!e || !t) return;
    const i = [...t.parentNode.children].indexOf(t);
    this.editor.history.push(), e.querySelectorAll("tr").forEach((n) => {
      var o;
      return (o = n.children[i]) == null ? void 0 : o.remove();
    }), this.editor.emitChange();
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
  setTableAlignment(e) {
    const t = this.getCurrentTable();
    t && (this.editor.history.push(), t.style.marginLeft = e === "left" || e === "center" ? e === "center" ? "auto" : "0" : "auto", t.style.marginRight = e === "right" || e === "center" ? e === "center" ? "auto" : "0" : "auto", this.editor.emitChange());
  }
  /** Shows/hides the contextual table toolbar based on caret position. */
  syncContextToolbar() {
    const e = !!this.getCurrentTable();
    this.editor.events.emit("table:context", e);
  }
  destroy() {
  }
}
class O {
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
    let n = 0;
    return i.map((o) => {
      const r = /^<\//.test(o);
      r && (n = Math.max(n - 1, 0));
      const a = `${"  ".repeat(n)}${o}`, h = /\/>$/.test(o) || /<(br|hr|img|input|source)[ >]/i.test(o);
      return /^<[a-z]/i.test(o) && !r && !h && (n += 1), a;
    }).join(`
`);
  }
  destroy() {
    var e;
    (e = this.source) == null || e.remove();
  }
}
class j {
  constructor(e) {
    this.editor = e, this.active = !1, this.handleChange = this.handleChange.bind(this), document.addEventListener("fullscreenchange", this.handleChange);
  }
  async toggle() {
    return this.active ? await this.exit() : await this.enter(), this.active;
  }
  async enter() {
    this.editor.wrapper.classList.add("ife-fullscreen");
    try {
      this.editor.wrapper.requestFullscreen && await this.editor.wrapper.requestFullscreen();
    } catch {
    }
    this.active = !0;
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
class P {
  constructor(e) {
    this.editor = e, this.matches = [], this.currentIndex = -1;
  }
  open() {
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
    this.dialog = new g(this.editor.wrapper, {
      title: "Find & Replace",
      bodyHtml: e,
      confirmLabel: "Replace all",
      onConfirm: (i) => this.replaceAll(i)
    });
    const t = document.createElement("button");
    t.type = "button", t.className = "ife-btn ife-btn--ghost", t.textContent = "Highlight all", t.addEventListener("click", () => {
      this.highlightAll(new FormData(this.dialog.form));
    }), this.dialog.open(), this.dialog.form.querySelector(".ife-dialog__footer").prepend(t);
  }
  buildRegex(e) {
    const t = String(e.get("query") ?? ""), i = !!e.get("caseSensitive"), n = !!e.get("useRegex"), o = `g${i ? "" : "i"}`, r = n ? t : t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(r, o);
  }
  highlightAll(e) {
    this.clearHighlights();
    const t = this.buildRegex(e), i = document.createTreeWalker(this.editor.root, NodeFilter.SHOW_TEXT, null), n = [];
    let o = i.nextNode();
    for (; o; )
      n.push(o), o = i.nextNode();
    n.forEach((r) => {
      const a = r.textContent ?? "";
      if (!t.test(a)) return;
      t.lastIndex = 0;
      const h = document.createDocumentFragment();
      let u = 0, d = t.exec(a);
      for (; d; ) {
        h.appendChild(document.createTextNode(a.slice(u, d.index)));
        const m = document.createElement("mark");
        m.className = "ife-search-highlight", m.textContent = d[0], h.appendChild(m), u = d.index + d[0].length, d = t.exec(a);
      }
      h.appendChild(document.createTextNode(a.slice(u))), r.replaceWith(h);
    });
  }
  clearHighlights() {
    this.editor.root.querySelectorAll("mark.ife-search-highlight").forEach((e) => {
      e.replaceWith(document.createTextNode(e.textContent ?? ""));
    }), this.editor.root.normalize();
  }
  replaceAll(e) {
    const t = new FormData(e), i = this.buildRegex(t), n = String(t.get("replacement") ?? "");
    this.editor.history.push(), this.clearHighlights();
    const o = document.createTreeWalker(this.editor.root, NodeFilter.SHOW_TEXT, null), r = [];
    let a = o.nextNode();
    for (; a; )
      r.push(a), a = o.nextNode();
    r.forEach((h) => {
      h.textContent = (h.textContent ?? "").replace(i, n);
    }), this.editor.emitChange();
  }
  destroy() {
    var e;
    this.clearHighlights(), (e = this.dialog) == null || e.close();
  }
}
const W = ["info", "warning", "danger", "success", "quote", "tip"];
class X {
  constructor(e) {
    this.editor = e;
  }
  open() {
    const t = `
            <label class="ife-field">
                <span>Type</span>
                <select name="type">${W.map((i) => `<option value="${i}">${i[0].toUpperCase()}${i.slice(1)}</option>`).join("")}</select>
            </label>
            <label class="ife-field">
                <span>Text</span>
                <textarea name="text" rows="3">${this.editor.selection.getText()}</textarea>
            </label>
        `;
    this.dialog = new g(this.editor.wrapper, {
      title: "Insert note",
      bodyHtml: t,
      confirmLabel: "Insert",
      onConfirm: (i) => {
        const n = new FormData(i);
        this.insert(String(n.get("type")), String(n.get("text")));
      }
    }), this.editor.selection.save(), this.dialog.open();
  }
  insert(e, t) {
    this.editor.history.push(), this.editor.selection.restore();
    const i = document.createElement("div");
    i.className = `note note-${e}`, i.textContent = t;
    const n = this.editor.selection.getRange();
    n == null || n.deleteContents(), n == null || n.insertNode(i), this.editor.emitChange();
  }
  destroy() {
    var e;
    (e = this.dialog) == null || e.close();
  }
}
const C = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/, k = /vimeo\.com\/(\d+)/;
class K {
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
    this.editor.selection.save(), new g(this.editor.wrapper, {
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
    const n = e.trim();
    let o;
    if (n.startsWith("<iframe"))
      o = n;
    else if (C.test(n)) {
      const r = n.match(C)[1];
      o = `<iframe width="${t}" height="${i}" src="https://www.youtube.com/embed/${r}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else if (k.test(n)) {
      const r = n.match(k)[1];
      o = `<iframe width="${t}" height="${i}" src="https://player.vimeo.com/video/${r}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    } else
      o = `<video controls width="${t}" height="${i}"><source src="${n}"></video>`;
    this.editor.commands.insertHTML(this.editor.sanitizer.sanitize(o));
  }
  openAudio() {
    const e = `
            <label class="ife-field">
                <span>Audio file URL</span>
                <input type="url" name="source" required>
            </label>
        `;
    this.editor.selection.save(), new g(this.editor.wrapper, {
      title: "Insert audio",
      bodyHtml: e,
      confirmLabel: "Insert",
      onConfirm: (t) => {
        const n = `<audio controls><source src="${String(new FormData(t).get("source"))}"></audio>`;
        this.editor.commands.insertHTML(this.editor.sanitizer.sanitize(n));
      }
    }).open();
  }
  insertHorizontalRule() {
    this.editor.commands.insertHTML("<hr>");
  }
  destroy() {
  }
}
class G {
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
        return `${[...e.children].map((n) => `- ${this.nodeToMarkdown(n).trim()}`).join(`
`)}

`;
      case "OL":
        return `${[...e.children].map((n, o) => `${o + 1}. ${this.nodeToMarkdown(n).trim()}`).join(`
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
    let n = null;
    return t.forEach((o) => {
      const r = o, a = r.match(/^(#{1,6})\s+(.*)$/), h = r.match(/^[-*]\s+(.*)$/), u = r.match(/^\d+\.\s+(.*)$/), d = r.match(/^>\s?(.*)$/);
      if (a) {
        this.closeList(i, n), n = null;
        const m = a[1].length;
        i.push(`<h${m}>${this.inlineMarkdown(a[2])}</h${m}>`);
        return;
      }
      if (h) {
        n !== "ul" && (this.closeList(i, n), i.push("<ul>"), n = "ul"), i.push(`<li>${this.inlineMarkdown(h[1])}</li>`);
        return;
      }
      if (u) {
        n !== "ol" && (this.closeList(i, n), i.push("<ol>"), n = "ol"), i.push(`<li>${this.inlineMarkdown(u[1])}</li>`);
        return;
      }
      if (d) {
        this.closeList(i, n), n = null, i.push(`<blockquote>${this.inlineMarkdown(d[1])}</blockquote>`);
        return;
      }
      if (r.trim() === "---") {
        this.closeList(i, n), n = null, i.push("<hr>");
        return;
      }
      this.closeList(i, n), n = null, r.trim() !== "" && i.push(`<p>${this.inlineMarkdown(r)}</p>`);
    }), this.closeList(i, n), i.join(`
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
const J = {
  link: B,
  image: U,
  table: q,
  codeView: O,
  fullscreen: j,
  find: P,
  note: X,
  media: K,
  markdown: G
};
Object.entries(J).forEach(([s, e]) => {
  b.registerPlugin(s, (t) => new e(t));
});
const p = /* @__PURE__ */ new Map(), Z = {
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
    if (p.has(t))
      return p.get(t);
    const i = new b(t, e), n = new D(i, e.toolbar);
    return i.on("destroy", () => n.destroy()), p.set(t, i), i.on("destroy", () => p.delete(t)), i;
  },
  /**
   * @param {string|HTMLTextAreaElement} target
   * @returns {EditorCore|undefined}
   */
  get(s) {
    const e = typeof s == "string" ? document.querySelector(s) : s;
    return e ? p.get(e) : void 0;
  },
  /** Destroys every editor instance currently mounted on the page. */
  destroyAll() {
    p.forEach((s) => s.destroy()), p.clear();
  },
  registerPlugin: b.registerPlugin
};
export {
  Z as default
};
//# sourceMappingURL=inkforge-editor.esm.js.map
