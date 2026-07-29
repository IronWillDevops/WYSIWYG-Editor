var V = Object.defineProperty;
var I = (a, e, t) => e in a ? V(a, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : a[e] = t;
var x = (a, e, t) => I(a, typeof e != "symbol" ? e + "" : e, t);
class q {
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
class O {
  /**
   * @param {object} options
   * @param {() => string} options.getContent
   * @param {(html: string) => void} options.setContent
   * @param {number} [options.maxSteps]
   * @param {number} [options.debounceMs]
   * @param {(event: string) => void} [options.onChange]
   */
  constructor({ getContent: e, setContent: t, maxSteps: i = 1e3, debounceMs: o = 300, onChange: n }) {
    this.getContent = e, this.setContent = t, this.maxSteps = i, this.debounceMs = o, this.onChange = n ?? (() => {
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
class P {
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
      case "removeFormat":
        document.execCommand("removeFormat", !1), this.clearInlineStyles();
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
   * Applies an inline CSS property to the current selection by wrapping it in a <span>.
   * @param {string} cssProperty camelCase property name
   * @param {string} value
   * @param {boolean} [onBlock] apply to the enclosing block instead of wrapping inline
   */
  setInlineStyle(e, t, i = !1) {
    if (i) {
      const n = this.selection.getBlockElement();
      if (n) {
        n.style[e] = t;
        return;
      }
    }
    const o = this.selection.wrap("span");
    o && (o.style[e] = t);
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
      const l = document.createElement("li");
      l.innerHTML = r.innerHTML || "<br>", n.appendChild(l);
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
    const t = /* @__PURE__ */ new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "DIV"]), i = (l) => {
      let d = l.nodeType === Node.TEXT_NODE ? l.parentElement : l;
      for (; d && d !== this.root; ) {
        if (d instanceof HTMLElement && d.parentElement === this.root && t.has(d.tagName))
          return d;
        d = d.parentElement;
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
        const l = s.parentNode;
        if (!l) return;
        for (; s.firstChild; ) l.insertBefore(s.firstChild, s);
        l.removeChild(s);
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
const U = /* @__PURE__ */ new Set([
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
  "hr"
]), W = {
  "*": /* @__PURE__ */ new Set(["class", "style", "id"]),
  a: /* @__PURE__ */ new Set(["href", "target", "rel", "title"]),
  img: /* @__PURE__ */ new Set(["src", "alt", "title", "width", "height", "loading"]),
  iframe: /* @__PURE__ */ new Set(["src", "width", "height", "allow", "allowfullscreen", "frameborder"]),
  video: /* @__PURE__ */ new Set(["src", "controls", "width", "height", "poster"]),
  audio: /* @__PURE__ */ new Set(["src", "controls"]),
  source: /* @__PURE__ */ new Set(["src", "type"]),
  td: /* @__PURE__ */ new Set(["colspan", "rowspan"]),
  th: /* @__PURE__ */ new Set(["colspan", "rowspan", "scope"])
}, X = /* @__PURE__ */ new Set(["http:", "https:", "mailto:", "tel:", ""]);
class K {
  /**
   * @param {object} [options]
   * @param {string[]} [options.allowedTags]
   * @param {Record<string, string[]>} [options.allowedAttributes]
   * @param {string[]} [options.allowedUrlSchemes]
   */
  constructor(e = {}) {
    this.allowedTags = e.allowedTags ? new Set(e.allowedTags) : U, this.allowedAttrs = e.allowedAttributes ? Object.fromEntries(Object.entries(e.allowedAttributes).map(([t, i]) => [t, new Set(i)])) : W, this.allowedSchemes = e.allowedUrlSchemes ? new Set(e.allowedUrlSchemes.map((t) => `${t}:`)) : X;
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
const G = {
  theme: "auto",
  locale: "en",
  height: 420,
  history: { max_steps: 1e3, debounce_ms: 300 },
  autosave: { enabled: !1, interval_ms: 15e3, storage_key: "inkforge-editor-autosave" }
}, z = /* @__PURE__ */ new Map();
let E = class {
  /**
   * @param {HTMLTextAreaElement} textarea
   * @param {EditorOptions} options
   */
  constructor(e, t = {}) {
    var i, o;
    this.textarea = e, this.options = { ...G, ...t }, this.events = new q(), this.sanitizer = new K(this.options.sanitizer), this.plugins = /* @__PURE__ */ new Map(), this.buildDom(), this.selection = new j(this.root), this.commands = new P(this), this.history = new O({
      getContent: () => this.root.innerHTML,
      setContent: (n) => {
        this.root.innerHTML = n;
      },
      maxSteps: ((i = this.options.history) == null ? void 0 : i.max_steps) ?? 1e3,
      debounceMs: ((o = this.options.history) == null ? void 0 : o.debounce_ms) ?? 300,
      onChange: (n) => this.events.emit(n)
    }), this.handleShortcut = this.handleShortcut.bind(this), this.bindEvents(), this.applyTheme(this.options.theme), this.loadPlugins(), this.setupAutosave(), this.events.emit("init", this);
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
    }), this.root.addEventListener("paste", (e) => this.handlePaste(e)), this.root.addEventListener("drop", (e) => this.events.emit("drop", e)), document.addEventListener("keydown", this.handleShortcut), this.textarea.form && this.textarea.form.addEventListener("submit", () => this.syncTextarea());
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
    var n, s;
    if (e.preventDefault(), this.destroyed) return;
    const t = (n = e.clipboardData) == null ? void 0 : n.getData("text/html"), i = ((s = e.clipboardData) == null ? void 0 : s.getData("text/plain")) ?? "", o = t ? this.sanitizer.sanitize(t) : this.escapeHtml(i);
    this.commands.insertHTML(o), this.events.emit("paste", { html: t, text: i });
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
    z.forEach((t, i) => {
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
    }), this.events.emit("destroy", this), clearInterval(this.autosaveTimer), document.removeEventListener("keydown", this.handleShortcut), this.history.destroy(), this.wrapper.remove(), this.textarea.style.display = "", this.events.destroy());
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
    z.set(e, t);
  }
};
const c = (a) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">${a}</svg>`, h = {
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
  charCount: c('<path d="M4 6h14v3h-2V8H6v8h4v2H4V6zm13 8h-2V9h2v5zm-2 2h2v2h-2v-2z"/>')
}, J = {
  undo: { icon: h.undo, label: "Undo", shortcut: "Ctrl+Z", type: "action", action: (a) => a.undo() },
  redo: { icon: h.redo, label: "Redo", shortcut: "Ctrl+Y", type: "action", action: (a) => a.redo() },
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
    onChange: (a, e) => a.commands.exec("blockFormat", e)
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
    onChange: (a, e) => a.commands.exec("fontName", e)
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
    onChange: (a, e) => a.commands.exec("fontSize", e)
  },
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
    action: (a) => a.commands.insertHTML('<ul class="ife-checklist"><li><input type="checkbox"> Item</li></ul>')
  },
  indent: { icon: h.indent, label: "Increase indent", type: "command", command: "indent" },
  outdent: { icon: h.outdent, label: "Decrease indent", type: "command", command: "outdent" },
  link: { icon: h.link, label: "Insert/edit link", type: "action", action: (a) => a.module("link").open() },
  unlink: {
    icon: h.unlink,
    label: "Remove link",
    type: "action",
    action: (a) => {
      const e = a.selection.closest("a");
      e && a.module("link").remove(e);
    }
  },
  image: { icon: h.image, label: "Insert image", type: "action", action: (a) => a.module("image").open() },
  video: { icon: h.videocam, label: "Insert video", type: "action", action: (a) => a.module("media").openVideo() },
  audio: { icon: h.audiotrack, label: "Insert audio", type: "action", action: (a) => a.module("media").openAudio() },
  table: { icon: h.table, label: "Insert table", type: "action", action: (a) => a.module("table").openInsertDialog() },
  hr: { icon: h.hr, label: "Horizontal rule", type: "action", action: (a) => a.module("media").insertHorizontalRule() },
  blockquote: { icon: h.blockquote, label: "Blockquote", type: "action", action: (a) => a.commands.exec("blockFormat", "blockquote") },
  codeInline: {
    icon: h.code,
    label: "Inline code",
    type: "action",
    action: (a) => a.selection.wrap("code") && a.emitChange()
  },
  codeBlock: { icon: h.codeBlock, label: "Code block", type: "action", action: (a) => a.commands.exec("blockFormat", "pre") },
  note: { icon: h.note, label: "Insert note", type: "action", action: (a) => a.module("note").open() },
  emoji: {
    icon: h.emoji,
    label: "Emoji",
    type: "action",
    action: (a, e) => a.module("emoji").open(e)
  },
  specialChars: {
    icon: h.specialChars,
    label: "Special characters",
    type: "action",
    action: (a) => a.commands.insertHTML("&amp;copy;")
  },
  find: { icon: h.find, label: "Find & Replace", type: "action", action: (a) => a.module("find").open() },
  sourceCode: {
    icon: h.sourceCode,
    label: "Source code",
    type: "action",
    toggle: !0,
    action: (a) => a.module("codeView").toggle()
  },
  fullscreen: {
    icon: h.fullscreen,
    label: "Fullscreen",
    type: "action",
    toggle: !0,
    action: (a) => a.module("fullscreen").toggle()
  }
}, Y = {
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
  removeFormat: "Clear formatting",
  insert: "Insert",
  update: "Update",
  cancel: "Cancel",
  remove: "Remove",
  findReplace: "Find & Replace",
  sourceCode: "Source code",
  fullscreen: "Fullscreen",
  uploadFailed: "Failed to upload the file. Please try again."
}, Q = {
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
  removeFormat: "Очистити форматування",
  insert: "Вставити",
  update: "Оновити",
  cancel: "Скасувати",
  remove: "Видалити",
  findReplace: "Знайти та замінити",
  sourceCode: "Вихідний код",
  fullscreen: "Повноекранний режим",
  uploadFailed: "Не вдалося завантажити файл. Спробуйте ще раз."
}, Z = {
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
  removeFormat: "Очистить форматирование",
  insert: "Вставить",
  update: "Обновить",
  cancel: "Отмена",
  remove: "Удалить",
  findReplace: "Найти и заменить",
  sourceCode: "Исходный код",
  fullscreen: "Полноэкранный режим",
  uploadFailed: "Не удалось загрузить файл. Попробуйте ещё раз."
}, y = /* @__PURE__ */ new Map([
  ["en", Y],
  ["uk", Q],
  ["ru", Z]
]), R = {
  /**
   * @param {string} code
   * @param {Record<string, string>} strings
   */
  register(a, e) {
    y.set(a, e);
  },
  /**
   * @param {string} locale
   * @param {string} key
   * @returns {string}
   */
  t(a, e) {
    return (y.get(a) ?? y.get("en"))[e] ?? y.get("en")[e] ?? e;
  },
  available() {
    return [...y.keys()];
  }
}, ee = [
  ["undo", "redo"],
  ["blockFormat", "fontFamily", "fontSize"],
  ["bold", "italic", "underline", "strike", "superscript", "subscript"],
  ["forecolor", "backcolor", "removeFormat"],
  ["alignLeft", "alignCenter", "alignRight", "alignJustify"],
  ["bulletList", "orderedList", "checklist", "indent", "outdent"],
  ["link", "unlink", "image", "video", "audio", "table", "hr"],
  ["blockquote", "codeInline", "codeBlock", "note"],
  ["emoji", "specialChars"],
  ["find", "sourceCode", "fullscreen"]
];
class te {
  /**
   * @param {import('../core/Editor').default} editor
   * @param {Array<string[]>|null} [layout]
   */
  constructor(e, t = null) {
    this.editor = e, this.layout = t ?? ee, this.buttons = /* @__PURE__ */ new Map(), this.el = document.createElement("div"), this.el.className = "ife-toolbar", this.el.setAttribute("role", "toolbar"), this.el.setAttribute("aria-label", "Text formatting"), this.render(), this.editor.wrapper.insertBefore(this.el, this.editor.root), this.editor.on("selectionchange", () => this.syncActiveStates()), this.editor.on("focus", () => this.syncActiveStates());
  }
  render() {
    this.layout.forEach((e) => {
      const t = document.createElement("div");
      t.className = "ife-toolbar__group", e.forEach((i) => {
        const o = J[i];
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
    let o = R.t(i, e) !== e ? R.t(i, e) : t.label;
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
    const i = document.createElement("select");
    return i.className = "ife-toolbar__select", i.setAttribute("aria-label", t.label), t.options.forEach(([o, n]) => {
      const s = document.createElement("option");
      s.value = o, s.textContent = n, i.appendChild(s);
    }), i.addEventListener("mousedown", (o) => o.stopPropagation()), i.addEventListener("change", () => {
      this.editor.selection.restore(), t.onChange(this.editor, i.value);
    }), this.buttons.set(e, i), i;
  }
  buildColorPicker(e, t) {
    const i = document.createElement("label");
    i.className = "ife-toolbar__color", i.title = t.label, i.innerHTML = t.icon;
    const o = document.createElement("input");
    return o.type = "color", o.setAttribute("aria-label", t.label), o.addEventListener("input", () => {
      this.editor.selection.restore(), this.editor.commands.exec(t.command, o.value);
    }), i.appendChild(o), this.buttons.set(e, i), i;
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
    }).forEach(([n, s]) => {
      const r = this.buttons.get(n);
      r instanceof HTMLElement && r.classList.toggle("is-active", this.editor.commands.queryState(s));
    });
    const t = this.editor.selection.getBlockElement();
    let i = "";
    if (t) {
      let n = t;
      for (; n && n !== this.editor.root; ) {
        if (n.style.textAlign) {
          i = n.style.textAlign;
          break;
        }
        n = n.parentElement;
      }
    }
    ["alignLeft", "alignCenter", "alignRight", "alignJustify"].forEach((n) => {
      const s = this.buttons.get(n);
      s instanceof HTMLElement && s.classList.toggle("is-active", i === n.replace("align", "").toLowerCase());
    });
    const o = this.buttons.get("blockquote");
    if (o instanceof HTMLElement) {
      let n = !1;
      if (t) {
        let s = t;
        for (; s && s !== this.editor.root; ) {
          if (s.tagName === "BLOCKQUOTE") {
            n = !0;
            break;
          }
          s = s.parentElement;
        }
      }
      o.classList.toggle("is-active", n);
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
class b {
  /**
   * @param {HTMLElement} container element the dialog is appended to (editor wrapper)
   * @param {object} config
   * @param {string} config.title
   * @param {string} config.bodyHtml
   * @param {string} [config.confirmLabel]
   * @param {string} [config.cancelLabel]
   * @param {(form: HTMLFormElement) => void} config.onConfirm
   */
  constructor(e, { title: t, bodyHtml: i, confirmLabel: o = "OK", cancelLabel: n = "Cancel", onConfirm: s }) {
    x(this, "handleEscape", (e) => {
      e.key === "Escape" && this.close();
    });
    this.container = e, this.onConfirm = s, this.overlay = document.createElement("div"), this.overlay.className = "ife-dialog-overlay", this.overlay.innerHTML = `
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
        `, this.form = this.overlay.querySelector("form"), this.overlay.querySelectorAll("button, input, select, textarea").forEach((r) => {
      r.addEventListener("click", (l) => l.stopPropagation()), r.addEventListener("keydown", (l) => l.stopPropagation());
    }), this.overlay.querySelectorAll("button").forEach((r) => {
      r.addEventListener("mousedown", (l) => l.preventDefault());
    }), this.overlay.querySelector(".ife-dialog__close").addEventListener("click", () => this.close()), this.overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => this.close()), this.overlay.addEventListener("click", (r) => {
      r.target === this.overlay && this.close();
    }), this.form.addEventListener("submit", (r) => {
      r.preventDefault(), r.stopPropagation(), this.onConfirm(this.form), this.close();
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
    document.body.style.overflow = "", document.body.style.paddingRight = "", this.scrollPos && window.scrollTo(this.scrollPos.x, this.scrollPos.y), this.container.scrollTop = this.containerScrollTop ?? 0, document.removeEventListener("keydown", this.handleEscape), this.overlay.remove();
  }
}
class ie {
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
class oe {
  constructor(e) {
    this.editor = e, this.uploadUrl = e.options.uploadUrl, this.handleDrop = this.handleDrop.bind(this), this.handleClick = this.handleClick.bind(this), this.handleDblClick = this.handleDblClick.bind(this), this.handleMouseDown = this.handleMouseDown.bind(this), e.root.addEventListener("dragover", (t) => t.preventDefault()), e.root.addEventListener("drop", this.handleDrop), e.root.addEventListener("click", this.handleClick), e.root.addEventListener("dblclick", this.handleDblClick), e.root.addEventListener("mousedown", this.handleMouseDown);
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
      const d = document.createElement("figcaption");
      d.textContent = i, s.appendChild(d);
    }
    const l = this.editor.selection.getRange();
    l == null || l.deleteContents(), l == null || l.insertNode(s), this.editor.emitChange();
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
    let l = e.querySelector("figcaption");
    o ? (l || (l = document.createElement("figcaption"), e.appendChild(l)), l.textContent = o) : l && l.remove(), e.classList.remove("ife-image--selected"), this.editor.emitChange();
  }
  /** Marks the clicked image's <figure> as selected (for edit/resize), or clears selection. */
  handleClick(e) {
    var i;
    const t = e.target.closest("figure.ife-image img");
    this.editor.root.querySelectorAll(".ife-image--selected").forEach((o) => o.classList.remove("ife-image--selected")), t && ((i = t.closest("figure")) == null || i.classList.add("ife-image--selected"));
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
      const l = r.clientX - i;
      t.style.width = `${Math.max(40, o + l)}px`;
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
    (e = this.dialog) == null || e.close(), this.editor.root.removeEventListener("drop", this.handleDrop), this.editor.root.removeEventListener("click", this.handleClick), this.editor.root.removeEventListener("dblclick", this.handleDblClick), this.editor.root.removeEventListener("mousedown", this.handleMouseDown);
  }
}
class ne {
  constructor(e) {
    this.editor = e, this.buildContextToolbar(), this.editor.root.addEventListener("click", () => this.syncContextToolbar()), this.editor.root.addEventListener("keyup", () => this.syncContextToolbar()), this.editor.on("selectionchange", () => this.syncContextToolbar()), this.adjustTableHeight = this.adjustTableHeight.bind(this), window.addEventListener("resize", this.adjustTableHeight), this.editor.on("init", () => setTimeout(this.adjustTableHeight, 0)), this.editor.on("change", this.adjustTableHeight);
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
    ].forEach(([n, s, r]) => {
      const l = document.createElement("button");
      l.type = "button", l.className = `ife-btn ife-btn--ghost ife-table-toolbar__btn${r ? " ife-table-toolbar__btn--danger" : ""}`, l.textContent = n, l.title = n, l.addEventListener("mousedown", (d) => d.preventDefault()), l.addEventListener("click", () => {
        this.editor.selection.restore(), s(), this.syncContextToolbar();
      }), this.contextToolbar.appendChild(l);
    });
    const t = document.createElement("label");
    t.className = "ife-table-toolbar__color", t.title = "Cell background color", t.textContent = "Cell";
    const i = document.createElement("input");
    i.type = "color", i.setAttribute("aria-label", "Cell background color"), i.addEventListener("mousedown", (n) => n.stopPropagation()), i.addEventListener("input", () => {
      this.editor.selection.restore(), this.setCellBackground(i.value);
    }), t.appendChild(i), this.contextToolbar.appendChild(t);
    const o = document.createElement("select");
    o.className = "ife-toolbar__select", o.setAttribute("aria-label", "Table alignment"), [["left", "Align left"], ["center", "Align center"], ["right", "Align right"]].forEach(([n, s]) => {
      const r = document.createElement("option");
      r.value = n, r.textContent = s, o.appendChild(r);
    }), o.addEventListener("mousedown", (n) => n.stopPropagation()), o.addEventListener("change", () => {
      this.editor.selection.restore(), this.setTableAlignment(o.value);
    }), this.contextToolbar.appendChild(o);
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
      const d = o.createTHead().insertRow();
      for (let m = 0; m < t; m += 1) {
        const u = document.createElement("th");
        u.contentEditable = "true", u.innerHTML = "<br>", d.appendChild(u);
      }
    }
    const n = o.createTBody(), s = i ? e - 1 : e;
    for (let l = 0; l < Math.max(s, 1); l += 1) {
      const d = n.insertRow();
      for (let m = 0; m < t; m += 1) {
        const u = d.insertCell();
        u.innerHTML = "<br>";
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
    this.editor.history.push();
    const o = i.cloneNode(!0);
    [...o.children].forEach((n) => {
      n.innerHTML = "<br>";
    }), i.parentNode.insertBefore(o, e ? i : i.nextSibling), this.editor.emitChange();
  }
  deleteRow() {
    var t;
    const e = (t = this.getCurrentCell()) == null ? void 0 : t.closest("tr");
    e && (this.editor.history.push(), e.remove(), this.editor.emitChange());
  }
  addColumn(e = !1) {
    const t = this.getCurrentTable(), i = this.getCurrentCell();
    if (!t || !i) return;
    const o = i.parentNode;
    if (!o) return;
    let n = [...o.children].indexOf(i);
    n < 0 || (this.editor.history.push(), t.querySelectorAll("tr").forEach((s) => {
      const r = s.children[n];
      if (!r) return;
      const l = document.createElement(r.tagName.toLowerCase() === "th" ? "th" : "td");
      l.innerHTML = "<br>", s.insertBefore(l, e ? r : r.nextSibling);
    }), this.editor.emitChange());
  }
  deleteColumn() {
    const e = this.getCurrentTable(), t = this.getCurrentCell();
    if (!e || !t) return;
    const i = t.parentNode;
    if (!i) return;
    const o = [...i.children].indexOf(t);
    o < 0 || (this.editor.history.push(), e.querySelectorAll("tr").forEach((n) => {
      var s;
      return (s = n.children[o]) == null ? void 0 : s.remove();
    }), this.editor.emitChange());
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
    e && !this.contextToolbar.isConnected && this.editor.wrapper.insertBefore(this.contextToolbar, this.editor.root);
    const t = this.contextToolbar.style.display === "none";
    this.contextToolbar.style.display = e ? "flex" : "none", (e || !t) && this.adjustTableHeight(), this.editor.events.emit("table:context", e);
  }
  /** Constrains content area and table height to fit within the viewport. */
  adjustTableHeight() {
    var k, L, T;
    if (!((k = this.editor.root) != null && k.isConnected)) return;
    const e = this.editor.wrapper, t = window.innerHeight, i = e.getBoundingClientRect(), o = e.querySelector(".ife-toolbar"), n = o ? o.offsetHeight : 0, r = ((L = this.contextToolbar) == null ? void 0 : L.style.display) !== "none" && ((T = this.contextToolbar) == null ? void 0 : T.offsetHeight) || 0, l = e.querySelector(".ife-statusbar"), d = l ? l.offsetHeight : 0, m = getComputedStyle(e), u = parseFloat(m.borderTopWidth) || 0, g = parseFloat(m.borderBottomWidth) || 0, p = t - i.top - u - n - r - d - g;
    this.editor.root.style.maxHeight = `${Math.max(200, Math.floor(p))}px`;
    const C = this.editor.root.querySelectorAll("table.ife-table");
    if (!C.length) return;
    const A = parseFloat(getComputedStyle(this.editor.root).paddingTop) || 16, $ = parseFloat(getComputedStyle(this.editor.root).paddingBottom) || 16;
    C.forEach((w) => {
      let H = 0, v = w.previousElementSibling;
      for (; v; ) {
        const M = getComputedStyle(v);
        H += v.offsetHeight + (parseFloat(M.marginTop) || 0) + (parseFloat(M.marginBottom) || 0), v = v.previousElementSibling;
      }
      const S = getComputedStyle(w), D = parseFloat(S.marginTop) || 0, F = parseFloat(S.marginBottom) || 0, B = p - A - H - D - F - $;
      w.style.maxHeight = `${Math.max(200, Math.floor(B))}px`;
    });
  }
  destroy() {
    var e;
    window.removeEventListener("resize", this.adjustTableHeight), this.editor.root.style.maxHeight = "", (e = this.contextToolbar) == null || e.remove();
  }
}
class se {
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
      const r = `${"  ".repeat(o)}${n}`, l = /\/>$/.test(n) || /<(br|hr|img|input|source)[ >]/i.test(n);
      return /^<[a-z]/i.test(n) && !s && !l && (o += 1), r;
    }).join(`
`);
  }
  destroy() {
    var e;
    (e = this.source) == null || e.remove();
  }
}
class re {
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
class ae {
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
      const l = r.textContent ?? "";
      if (!i.test(l)) return;
      i.lastIndex = 0;
      const d = document.createDocumentFragment();
      let m = 0, u = i.exec(l);
      for (; u; ) {
        d.appendChild(document.createTextNode(l.slice(m, u.index)));
        const g = document.createElement("mark");
        g.className = "ife-search-highlight", g.textContent = u[0], d.appendChild(g), m = u.index + u[0].length, u = i.exec(l);
      }
      d.appendChild(document.createTextNode(l.slice(m))), r.replaceWith(d);
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
    s.forEach((l) => {
      l.textContent = (l.textContent ?? "").replace(i, o);
    }), this.editor.emitChange();
  }
  destroy() {
    var e;
    this.clearHighlights(), (e = this.dialog) == null || e.close();
  }
}
const le = ["info", "warning", "danger", "success", "quote", "tip"];
class ce {
  constructor(e) {
    this.editor = e;
  }
  open() {
    const t = `
            <label class="ife-field">
                <span>Type</span>
                <select name="type">${le.map((i) => `<option value="${i}">${i[0].toUpperCase()}${i.slice(1)}</option>`).join("")}</select>
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
const N = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/, _ = /vimeo\.com\/(\d+)/;
class he {
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
    else if (N.test(o)) {
      const s = o.match(N)[1];
      n = `<iframe width="${t}" height="${i}" src="https://www.youtube.com/embed/${s}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else if (_.test(o)) {
      const s = o.match(_)[1];
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
class de {
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
      const s = n, r = s.match(/^(#{1,6})\s+(.*)$/), l = s.match(/^[-*]\s+(.*)$/), d = s.match(/^\d+\.\s+(.*)$/), m = s.match(/^>\s?(.*)$/);
      if (r) {
        this.closeList(i, o), o = null;
        const u = r[1].length;
        i.push(`<h${u}>${this.inlineMarkdown(r[2])}</h${u}>`);
        return;
      }
      if (l) {
        o !== "ul" && (this.closeList(i, o), i.push("<ul>"), o = "ul"), i.push(`<li>${this.inlineMarkdown(l[1])}</li>`);
        return;
      }
      if (d) {
        o !== "ol" && (this.closeList(i, o), i.push("<ol>"), o = "ol"), i.push(`<li>${this.inlineMarkdown(d[1])}</li>`);
        return;
      }
      if (m) {
        this.closeList(i, o), o = null, i.push(`<blockquote>${this.inlineMarkdown(m[1])}</blockquote>`);
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
class ue {
  constructor(e) {
    this.editor = e, this.update = this.update.bind(this), this.buildDom(), this.bindEvents(), this.update();
  }
  buildDom() {
    this.el = document.createElement("div"), this.el.className = "ife-statusbar", this.left = document.createElement("span"), this.left.className = "ife-statusbar__left", this.wordsEl = document.createElement("span"), this.wordsEl.className = "ife-statusbar__item", this.wordsEl.innerHTML = `${h.wordCount} <span class="ife-statusbar__value">0</span>`, this.charsEl = document.createElement("span"), this.charsEl.className = "ife-statusbar__item", this.charsEl.innerHTML = `${h.charCount} <span class="ife-statusbar__value">0</span>`, this.left.appendChild(this.wordsEl), this.left.appendChild(this.charsEl), this.right = document.createElement("span"), this.right.className = "ife-statusbar__right", this.right.textContent = "Made by ITkha", this.el.appendChild(this.left), this.el.appendChild(this.right), this.editor.wrapper.appendChild(this.el);
  }
  bindEvents() {
    this.editor.root.addEventListener("input", this.update), this.editor.on("change", this.update), this.editor.on("destroy", () => this.destroy());
  }
  update() {
    const e = this.editor.getText(), t = e.length, i = e.trim() ? e.trim().split(/\s+/).length : 0;
    this.wordsEl.querySelector(".ife-statusbar__value").textContent = i, this.charsEl.querySelector(".ife-statusbar__value").textContent = t;
  }
  destroy() {
    this.editor.root.removeEventListener("input", this.update), this.el.remove();
  }
}
class me {
  constructor(e) {
    this.editor = e, this.picker = null, this._triggerEl = null, this._boundOnScroll = null, this._boundOnResize = null;
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
    s.className = "ife-emoji-picker__body", n.forEach((l) => {
      const d = document.createElement("div");
      d.className = "ife-emoji-picker__group";
      const m = document.createElement("div");
      m.className = "ife-emoji-picker__group-label", m.textContent = l.name, d.appendChild(m);
      const u = document.createElement("div");
      u.className = "ife-emoji-picker__grid", l.emojis.forEach((g) => {
        const p = document.createElement("button");
        p.type = "button", p.className = "ife-emoji-picker__btn", p.textContent = g, p.setAttribute("aria-label", g), p.addEventListener("mousedown", (C) => C.preventDefault()), p.addEventListener("click", () => {
          this.editor.selection.restore(), this.editor.commands.insertHTML(g), this.close();
        }), u.appendChild(p);
      }), d.appendChild(u), s.appendChild(d);
    }), this.picker.appendChild(s), document.body.appendChild(this.picker);
    const r = this.editor.wrapper;
    this.picker.style.setProperty("--ife-bg", getComputedStyle(r).getPropertyValue("--ife-bg")), this.picker.style.setProperty("--ife-text", getComputedStyle(r).getPropertyValue("--ife-text")), this.picker.style.setProperty("--ife-border", getComputedStyle(r).getPropertyValue("--ife-border")), this.picker.style.setProperty("--ife-btn-hover", getComputedStyle(r).getPropertyValue("--ife-btn-hover")), this.picker.style.setProperty("--ife-btn-active", getComputedStyle(r).getPropertyValue("--ife-btn-active")), this.positionPicker(), this._boundOnScroll = () => this.close(), this._boundOnResize = () => this.positionPicker(), document.addEventListener("scroll", this._boundOnScroll, { capture: !0 }), window.addEventListener("resize", this._boundOnResize), setTimeout(() => {
      if (!this.picker) return;
      const l = this.picker.querySelector(".ife-emoji-picker__btn");
      l && l.focus();
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
    this._boundOnScroll && (document.removeEventListener("scroll", this._boundOnScroll, { capture: !0 }), this._boundOnScroll = null), this._boundOnResize && (window.removeEventListener("resize", this._boundOnResize), this._boundOnResize = null);
  }
  destroy() {
    this.close();
  }
}
const pe = {
  link: ie,
  image: oe,
  table: ne,
  codeView: se,
  fullscreen: re,
  find: ae,
  note: ce,
  media: he,
  markdown: de,
  statusBar: ue,
  emoji: me
};
Object.entries(pe).forEach(([a, e]) => {
  E.registerPlugin(a, (t) => new e(t));
});
const f = /* @__PURE__ */ new Map(), be = {
  /**
   * @param {string|HTMLTextAreaElement} target CSS selector or a textarea element
   * @param {import('./core/Editor.js').EditorOptions} [options]
   * @returns {EditorCore}
   */
  init(a, e = {}) {
    const t = typeof a == "string" ? document.querySelector(a) : a;
    if (!t)
      throw new Error(`InkForge Editor: target "${a}" not found`);
    if (t.tagName !== "TEXTAREA")
      throw new Error("InkForge Editor: init() target must be a <textarea> element");
    if (f.has(t))
      return f.get(t);
    const i = new E(t, e), o = new te(i, e.toolbar);
    return i.on("destroy", () => o.destroy()), f.set(t, i), i.on("destroy", () => f.delete(t)), i;
  },
  /**
   * @param {string|HTMLTextAreaElement} target
   * @returns {EditorCore|undefined}
   */
  get(a) {
    const e = typeof a == "string" ? document.querySelector(a) : a;
    return e ? f.get(e) : void 0;
  },
  /** Destroys every editor instance currently mounted on the page. */
  destroyAll() {
    f.forEach((a) => a.destroy()), f.clear();
  },
  registerPlugin: E.registerPlugin
};
export {
  be as default
};
//# sourceMappingURL=inkforge-editor.esm.js.map
