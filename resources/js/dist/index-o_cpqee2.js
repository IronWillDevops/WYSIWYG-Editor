var R = Object.defineProperty;
var B = (s, t, e) => t in s ? R(s, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : s[t] = e;
var H = (s, t, e) => B(s, typeof t != "symbol" ? t + "" : t, e);
class A {
  constructor() {
    this.listeners = /* @__PURE__ */ new Map();
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => void} handler
   * @returns {() => void} unsubscribe function
   */
  on(t, e) {
    return this.listeners.has(t) || this.listeners.set(t, /* @__PURE__ */ new Set()), this.listeners.get(t).add(e), () => this.off(t, e);
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => void} handler
   */
  off(t, e) {
    var n;
    (n = this.listeners.get(t)) == null || n.delete(e);
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => void} handler
   */
  once(t, e) {
    const n = (...o) => {
      this.off(t, n), e(...o);
    };
    this.on(t, n);
  }
  /**
   * @param {string} event
   * @param {...any} args
   */
  emit(t, ...e) {
    const n = this.listeners.get(t);
    n && [...n].forEach((o) => o(...e));
  }
  destroy() {
    this.listeners.clear();
  }
}
class V {
  /**
   * @param {HTMLElement} root contenteditable element
   */
  constructor(t) {
    this.root = t;
  }
  /** @returns {globalThis.Selection|null} */
  getNativeSelection() {
    return window.getSelection ? window.getSelection() : null;
  }
  /** @returns {Range|null} */
  getRange() {
    const t = this.getNativeSelection();
    if (!t || t.rangeCount === 0) return null;
    const e = t.getRangeAt(0);
    return this.root.contains(e.commonAncestorContainer) ? e : null;
  }
  /** @param {Range} range */
  setRange(t) {
    const e = this.getNativeSelection();
    e && (e.removeAllRanges(), e.addRange(t));
  }
  /** Save the current range so it can be restored after a toolbar click blurs the editor. */
  save() {
    const t = this.getRange();
    return this.savedRange = t ? t.cloneRange() : null, this.savedRange;
  }
  restore() {
    this.savedRange && (this.root.focus({ preventScroll: !0 }), this.setRange(this.savedRange.cloneRange()));
  }
  collapseToEnd() {
    const t = document.createRange();
    t.selectNodeContents(this.root), t.collapse(!1), this.setRange(t);
  }
  isCollapsed() {
    var t;
    return ((t = this.getNativeSelection()) == null ? void 0 : t.isCollapsed) ?? !0;
  }
  /** @returns {string} plain text of the current selection */
  getText() {
    var t;
    return ((t = this.getNativeSelection()) == null ? void 0 : t.toString()) ?? "";
  }
  /**
   * Returns the closest ancestor element matching selector, bounded by root.
   * @param {string} selector
   * @returns {HTMLElement|null}
   */
  closest(t) {
    const e = this.getRange();
    if (!e) return null;
    let n = e.commonAncestorContainer;
    for (n.nodeType === Node.TEXT_NODE && (n = n.parentElement); n && n !== this.root.parentElement; ) {
      if (n instanceof HTMLElement && n.matches(t)) return n;
      n = n.parentElement;
    }
    return null;
  }
  /**
   * Returns block-level ancestor of the current selection (p, h1-h6, li, blockquote, pre...).
   * @returns {HTMLElement|null}
   */
  getBlockElement() {
    const t = this.getRange();
    if (!t) return null;
    let e = t.commonAncestorContainer;
    e.nodeType === Node.TEXT_NODE && (e = e.parentElement);
    const n = /* @__PURE__ */ new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "LI", "DIV"]);
    for (; e && e !== this.root; ) {
      if (e instanceof HTMLElement && n.has(e.tagName)) return e;
      e = e.parentElement;
    }
    return null;
  }
  /**
   * Wraps the current selection in a new element, splitting text nodes as needed.
   * @param {string} tagName
   * @returns {HTMLElement|null}
   */
  wrap(t) {
    const e = this.getRange();
    if (!e) return null;
    const n = document.createElement(t);
    try {
      e.surroundContents(n);
    } catch {
      const i = e.extractContents();
      n.appendChild(i), e.insertNode(n);
    }
    const o = document.createRange();
    return o.selectNodeContents(n), this.setRange(o), n;
  }
  focus() {
    this.root.focus(), this.restore();
  }
}
class I {
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
  constructor({ getContent: t, setContent: e, maxSteps: n = 1e3, debounceMs: o = 300, saveBookmark: i, restoreBookmark: r, onChange: c }) {
    this.getContent = t, this.setContent = e, this.maxSteps = n, this.debounceMs = o, this.saveBookmark = i ?? (() => null), this.restoreBookmark = r ?? (() => {
    }), this.onChange = c ?? (() => {
    }), this.undoStack = [], this.redoStack = [], this.timer = null, this.isRestoring = !1, this.undoStack.push({ html: this.getContent(), bookmark: null });
  }
  /** Called on every input event; batches rapid keystrokes into one snapshot. */
  record() {
    this.isRestoring || (clearTimeout(this.timer), this.timer = setTimeout(() => this.push(), this.debounceMs));
  }
  /** Force-record immediately (e.g. before a toolbar command mutates content). */
  push() {
    if (this.isRestoring) return;
    const t = this.getContent(), e = this.undoStack[this.undoStack.length - 1];
    t !== e.html && (this.undoStack.push({ html: t, bookmark: this.saveBookmark() }), this.undoStack.length > this.maxSteps && this.undoStack.shift(), this.redoStack = []);
  }
  canUndo() {
    return this.undoStack.length > 1;
  }
  canRedo() {
    return this.redoStack.length > 0;
  }
  undo() {
    if (clearTimeout(this.timer), !this.canUndo()) return;
    const t = this.undoStack.pop();
    this.redoStack.push(t);
    const e = this.undoStack[this.undoStack.length - 1];
    this.isRestoring = !0, this.setContent(e.html), this.restoreBookmark(e.bookmark), this.isRestoring = !1, this.onChange("undo");
  }
  redo() {
    if (!this.canRedo()) return;
    const t = this.redoStack.pop();
    this.undoStack.push(t), this.isRestoring = !0, this.setContent(t.html), this.restoreBookmark(t.bookmark), this.isRestoring = !1, this.onChange("redo");
  }
  clear() {
    clearTimeout(this.timer), this.undoStack = [{ html: this.getContent(), bookmark: null }], this.redoStack = [];
  }
  destroy() {
    clearTimeout(this.timer), this.undoStack = [], this.redoStack = [];
  }
}
const N = /* @__PURE__ */ new Set([
  "black",
  "#000",
  "#000000",
  "rgb(0,0,0)",
  "rgb(0, 0, 0)",
  "rgb(0,0,0,0)",
  "rgba(0,0,0,1)",
  "rgba(0, 0, 0, 1)"
]), L = /* @__PURE__ */ new Set([
  "white",
  "#fff",
  "#ffffff",
  "rgb(255,255,255)",
  "rgb(255, 255, 255)",
  "rgba(255,255,255,1)",
  "rgba(255, 255, 255, 1)"
]);
function T(s) {
  const t = String(s).trim().toLowerCase().replace(/\s+/g, " ");
  return /^#[0-9a-f]{3}$/.test(t) ? `#${t.slice(1).split("").map((e) => `${e}${e}`).join("")}` : t;
}
function D(s) {
  return N.has(T(s));
}
function O(s) {
  return L.has(T(s));
}
const C = /* @__PURE__ */ new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "LI", "DIV", "UL", "OL", "TABLE", "FIGURE"]);
class _ {
  /**
   * @param {import('./Editor').default} editor
   */
  constructor(t) {
    this.editor = t;
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
  exec(t, e = null) {
    switch (this.prepare(), this.editor.history.push(), t) {
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
        document.execCommand(t, !1, e ?? void 0);
        break;
      case "superscript":
      case "subscript":
        try {
          document.execCommand("styleWithCSS", !1, !1);
        } catch {
        }
        document.execCommand(t, !1, e ?? void 0);
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
        e && !D(e) ? document.execCommand("foreColor", !1, e) : this.clearColor("color");
        break;
      case "backColor":
        e && !O(e) ? document.execCommand("hiliteColor", !1, e) : this.clearColor("backgroundColor");
        break;
      case "lineHeight":
        this.setInlineStyle("lineHeight", e, !0);
        break;
      case "direction":
        this.setDirection(e);
        break;
      case "removeFormat":
        document.execCommand("removeFormat", !1), this.clearInlineStyles();
        break;
      case "formatBlock":
        this.formatBlock(e);
        break;
      default:
        throw new Error(`Unknown command: ${t}`);
    }
    this.editor.emitChange(), this.editor.events.emit("selectionchange", this.editor);
  }
  queryState(t) {
    try {
      return document.queryCommandState(t);
    } catch {
      return !1;
    }
  }
  /**
   * Sets the text direction (ltr/rtl) on the current block element.
   * @param {'ltr'|'rtl'} dir
   */
  setDirection(t) {
    const e = this.selection.getBlockElement();
    if (e) {
      e.dir = t;
      return;
    }
  }
  /**
   * Applies an inline CSS property to the current selection by wrapping it in a <span>.
   * @param {string} cssProperty camelCase property name
   * @param {string} value
   * @param {boolean} [onBlock] apply to the enclosing block instead of wrapping inline
   */
  setInlineStyle(t, e, n = !1) {
    if (n) {
      const r = this.selection.getBlockElement();
      if (r) {
        r.style[t] = e;
        return;
      }
    }
    const o = this.selection.closest("span");
    if (o) {
      o.style[t] = e;
      return;
    }
    const i = this.selection.wrap("span");
    i && (i.style[t] = e);
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
  toggleList(t) {
    const e = this.selection.getRange();
    if (!e) return;
    const n = this.selection.closest("li");
    if (n) {
      const c = n.closest("ul, ol");
      c && c.tagName.toLowerCase() === t ? this.unwrapList(c) : c && this.convertList(c, t);
      return;
    }
    const o = this.getBlocksInRange(e);
    if (!o.length) return;
    const i = document.createElement(t);
    o.forEach((c) => {
      const l = document.createElement("li");
      l.innerHTML = c.innerHTML || "<br>", i.appendChild(l);
    }), o[0].replaceWith(i), o.slice(1).forEach((c) => c.remove());
    const r = document.createRange();
    r.selectNodeContents(i.lastElementChild), r.collapse(!1), this.selection.setRange(r);
  }
  /**
   * Finds the top-level block elements (paragraphs, headings, etc.)
   * touched by a range, so multi-line selections can become a single list.
   * @param {Range} range
   * @returns {HTMLElement[]}
   */
  getBlocksInRange(t) {
    if (!this.root.contains(t.commonAncestorContainer)) return [];
    if (t.commonAncestorContainer === this.root)
      return [...this.root.children].filter(
        (a) => a instanceof HTMLElement && C.has(a.tagName)
      );
    const e = (l) => {
      let a = l.nodeType === Node.TEXT_NODE ? l.parentElement : l;
      if (a === this.root) return null;
      for (; a && a !== this.root; ) {
        if (a instanceof HTMLElement && C.has(a.tagName))
          return a;
        a = a.parentElement;
      }
      return null;
    }, n = e(t.startContainer);
    if (!n) return [];
    const o = e(t.endContainer) ?? n;
    if (n === o) return [n];
    if (n.parentNode === o.parentNode) {
      const l = [];
      let a = n;
      for (; a && (l.push(a), a !== o); )
        a = a.nextElementSibling;
      return l.length ? l : [n];
    }
    const i = (l) => {
      let a = l;
      for (; a && a.parentNode !== this.root; ) a = a.parentNode;
      return a;
    }, r = i(n), c = i(o);
    if (r && c) {
      const l = [];
      let a = r;
      for (; a && (l.push(a), a !== c); )
        a = a.nextElementSibling;
      return l.length ? l : [n];
    }
    return [n];
  }
  /** @param {HTMLElement} list @param {'ul'|'ol'} listTag */
  convertList(t, e) {
    const n = document.createElement(e);
    n.className = t.className, n.innerHTML = t.innerHTML, t.replaceWith(n);
    const o = document.createRange();
    o.selectNodeContents(n), o.collapse(!1), this.selection.setRange(o);
  }
  /** Removes a list, turning each <li> back into a plain paragraph. @param {HTMLElement} list */
  unwrapList(t) {
    const e = document.createDocumentFragment();
    [...t.children].forEach((o) => {
      if (o.tagName !== "LI") return;
      const i = document.createElement("p");
      i.innerHTML = o.innerHTML || "<br>", e.appendChild(i);
    });
    const n = e.lastElementChild;
    if (t.replaceWith(e), n) {
      const o = document.createRange();
      o.selectNodeContents(n), o.collapse(!1), this.selection.setRange(o);
    }
  }
  /**
   * Removes a specific CSS property from every element touched by
   * the current selection. Used by the color button "clear" action.
   * @param {string} cssProp camelCase property name (e.g. 'color', 'backgroundColor')
   */
  clearColor(t) {
    var i;
    const e = this.selection.getRange();
    if (!e) return;
    let n = e.commonAncestorContainer;
    if (n.nodeType === Node.TEXT_NODE && (n = n.parentElement), !(n instanceof HTMLElement)) return;
    ((i = n.style) != null && i.length ? [n, ...n.querySelectorAll("*")] : [...n.querySelectorAll("*")]).forEach((r) => {
      var c;
      try {
        if (!e.intersectsNode(r)) return;
      } catch {
        return;
      }
      if ((c = r.style) != null && c[t] && (r.style[t] = "", r.style.length === 0 && r.removeAttribute("style")), ["SPAN", "FONT"].includes(r.tagName) && r.attributes.length === 0) {
        const l = r.parentNode;
        if (!l) return;
        for (; r.firstChild; ) l.insertBefore(r.firstChild, r);
        l.removeChild(r);
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
    const t = this.selection.getRange();
    if (!t) return;
    let e = t.commonAncestorContainer;
    if (e.nodeType === Node.TEXT_NODE && (e = e.parentElement), !(e instanceof HTMLElement)) return;
    ((o = e.style) != null && o.length ? [e, ...e.querySelectorAll("*")] : [...e.querySelectorAll("*")]).forEach((i) => {
      if (!(!this.root.contains(i) || !t.intersectsNode(i)) && (i.removeAttribute("style"), ["SPAN", "FONT"].includes(i.tagName) && i.attributes.length === 0)) {
        const r = i.parentNode;
        if (!r) return;
        for (; i.firstChild; ) r.insertBefore(i.firstChild, i);
        r.removeChild(i);
      }
    });
  }
  /** Inserts raw (already sanitized) HTML at the current caret position. */
  insertHTML(t) {
    this.prepare(), this.editor.history.push();
    const e = this.selection.getRange();
    if (!e) return;
    e.deleteContents();
    const n = e.createContextualFragment(t), o = n.lastChild;
    if (e.insertNode(n), o) {
      const i = document.createRange();
      i.setStartAfter(o), i.collapse(!0), this.selection.setRange(i);
    }
    this.editor.emitChange();
  }
  /**
   * Changes the block-level element type of the current block(s).
   * Converts every block touched by the selection (a single block, several
   * paragraphs, or a full Select-All range whose common ancestor is the root)
   * to the given tag name, e.g. 'h1' or 'p'.
   * @param {string} tag the target block tag name (lowercase, e.g. 'p', 'h1'-'h6')
   */
  formatBlock(t) {
    const e = this.selection.getRange();
    if (!e) return;
    const n = t.toLowerCase(), o = this.getBlocksInRange(e);
    if (!o.length) {
      const c = this.wrapInlineIntoBlock(e, n);
      if (!c) return;
      this.editor.history.push();
      const l = document.createRange();
      l.selectNodeContents(c), l.collapse(!1), this.selection.setRange(l);
      return;
    }
    const i = o.filter(
      (c) => c.tagName.toLowerCase() !== n
    );
    if (!i.length) return;
    this.editor.history.push();
    let r = null;
    if (i.forEach((c) => {
      const l = document.createElement(n);
      l.innerHTML = c.innerHTML || "<br>", c.replaceWith(l), r = l;
    }), r) {
      const c = document.createRange();
      c.selectNodeContents(r), c.collapse(!1), this.selection.setRange(c);
    }
  }
  /**
   * Wraps a caret line or text selection into a block element when the
   * content has no enclosing block (plain text / inline elements living
   * directly under the root). If the caret is collapsed, the whole line
   * bounded by <br>/block edges is wrapped; otherwise only the selected run.
   * @param {Range} range
   * @param {string} targetTag lowercase block tag name (e.g. 'h1')
   * @returns {HTMLElement|null} the created block, or null when nothing to wrap
   */
  wrapInlineIntoBlock(t, e) {
    const n = document.createElement(e);
    let o;
    if (t.collapsed) {
      if (t.startContainer === this.root) {
        n.innerHTML = "<br>";
        const r = this.root.childNodes[t.startOffset] || null;
        return this.root.insertBefore(n, r), n;
      }
      if (o = this.getInlineLineRange(t), !o) return null;
    } else
      o = t;
    const i = o.extractContents();
    return n.appendChild(i), o.insertNode(n), n;
  }
  /**
   * Builds a range covering the whole "line" that contains a collapsed caret
   * when there is no enclosing block: the maximal run of root-level inline
   * nodes (text + inline elements) bounded by <br>, block edges or the root.
   * @param {Range} range a collapsed range
   * @returns {Range|null}
   */
  getInlineLineRange(t) {
    let e = t.startContainer;
    if (e.nodeType === Node.TEXT_NODE && e.parentNode && e.parentNode !== this.root && (e = e.parentElement ?? e), !(e instanceof HTMLElement || e.nodeType === Node.TEXT_NODE) || e === this.root) return null;
    if (e.nodeType === Node.ELEMENT_NODE) {
      for (; e.parentNode && e.parentNode !== this.root; )
        e = e.parentNode;
      if (e.nodeType !== Node.ELEMENT_NODE || e === this.root) return null;
    }
    const n = (a) => a === this.root || a.nodeType === Node.ELEMENT_NODE && (a.tagName === "BR" || C.has(a.tagName));
    let o = e, i = o.previousSibling;
    for (; i && !n(i); )
      o = i, i = i.previousSibling;
    let r = e, c = r.nextSibling;
    for (; c && !n(c); )
      r = c, c = c.nextSibling;
    const l = document.createRange();
    if (l.setStart(o, 0), r.nodeType === Node.TEXT_NODE)
      l.setEnd(r, r.length);
    else {
      const a = r.lastChild;
      a ? l.setEndAfter(a) : l.setEnd(r, 0);
    }
    return l;
  }
}
const P = /* @__PURE__ */ new Set([
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
]), F = {
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
}, q = /* @__PURE__ */ new Set(["http:", "https:", "mailto:", "tel:", ""]);
class W {
  /**
   * @param {object} [options]
   * @param {string[]} [options.allowedTags]
   * @param {Record<string, string[]>} [options.allowedAttributes]
   * @param {string[]} [options.allowedUrlSchemes]
   */
  constructor(t = {}) {
    this.allowedTags = t.allowedTags ? new Set(t.allowedTags) : P, this.allowedAttrs = t.allowedAttributes ? Object.fromEntries(Object.entries(t.allowedAttributes).map(([e, n]) => [e, new Set(n)])) : F, this.allowedSchemes = t.allowedUrlSchemes ? new Set(t.allowedUrlSchemes.map((e) => `${e}:`)) : q;
  }
  /**
   * @param {string} dirtyHtml
   * @returns {string} sanitized HTML
   */
  sanitize(t) {
    let e = this.stripWordMso(t);
    e = this.decodeDoubleEscapedEntities(e);
    const n = document.createElement("template");
    return n.innerHTML = e, this.cleanNode(n.content), n.innerHTML;
  }
  /**
   * Decodes HTML entities when content contains no raw HTML tags but does
   * contain entity-encoded tags (e.g. &lt;span&gt;). This handles
   * double-escaped content produced by htmlspecialchars() or similar.
   */
  decodeDoubleEscapedEntities(t) {
    if (!/&[a-z]+;|&#\d+;/i.test(t)) return t;
    const e = document.createElement("textarea");
    return e.innerHTML = t, e.value;
  }
  /** Strips Microsoft Word/Copilot mso-* junk, XML wrappers, and empty elements. */
  stripWordMso(t) {
    return t.replace(/<!--\[if[^>]*>.*?<!\[endif\]-->/gs, "").replace(/<!--[^>]*-->/g, "").replace(/<(\w+)[^>]*\s(?:class|style)=["'][^"']*?mso-[^"']*["'][^>]*>/gi, (e) => e.replace(/\s(?:class|style)=["'][^"']*?mso-[^"']*["']/gi, "")).replace(/<o:p>[^<]*<\/o:p>/gi, "").replace(/<w:[^>]+>[^<]*<\/w:[^>]+>/gi, "").replace(/<\\?\?(xml|mso)[^>]*>/gi, "").replace(/style=["'][^"']*mso-[^"']*["']/gi, "").replace(/class=["'][^"']*Mso[^"']*["']/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<meta[^>]*>/gi, "").replace(/<link[^>]*>/gi, "").replace(/<span[^>]*>\s*<\/span>/gi, "").replace(/<p[^>]*>\s*<\/p>/gi, "").replace(/&nbsp;/gi, " ");
  }
  /** @param {Node} root */
  cleanNode(t) {
    const e = [...t.childNodes];
    for (let n = 0; n < e.length; n++) {
      const o = e[n];
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
  cleanAttributes(t, e) {
    const n = this.allowedAttrs["*"] ?? /* @__PURE__ */ new Set(), o = this.allowedAttrs[e] ?? /* @__PURE__ */ new Set();
    [...t.attributes].forEach((i) => {
      const r = i.name.toLowerCase();
      if (r.startsWith("on")) {
        t.removeAttribute(i.name);
        return;
      }
      if (!n.has(r) && !o.has(r)) {
        t.removeAttribute(i.name);
        return;
      }
      if ((r === "href" || r === "src") && !this.isSafeUrl(i.value) && t.removeAttribute(i.name), r === "style") {
        const c = this.cleanStyle(i.value);
        c ? t.setAttribute("style", c) : t.removeAttribute("style");
      }
    });
  }
  /** @param {string} value */
  isSafeUrl(t) {
    const e = t.trim();
    if (e.startsWith("#") || e.startsWith("/")) return !0;
    try {
      const n = new URL(e, window.location.href);
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
  cleanStyle(t) {
    return t.split(";").map((e) => e.trim()).filter((e) => e.length > 0).filter((e) => !/expression\s*\(|javascript:/i.test(e)).filter((e) => !this.isThemeNeutralColor(e)).join(";");
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
  isThemeNeutralColor(t) {
    const e = /^([a-z-]+)\s*:\s*(.+)$/i.exec(t);
    if (!e) return !1;
    const n = e[1].toLowerCase(), o = T(e[2]);
    return n === "color" ? N.has(o) : n === "background-color" ? L.has(o) : n === "background" ? this.isSolidBalancedColor(o) && L.has(o) : !1;
  }
  /**
   * Reports whether a value is a single balanced `color(...)` expression —
   * i.e. the `background` shorthand contains nothing but a color. Gradient
   * or image backgrounds contain unbalanced parens/`url(` and are skipped.
   * @param {string} value
   * @returns {boolean}
   */
  isSolidBalancedColor(t) {
    if (/url\(/i.test(t)) return !1;
    let e = 0;
    for (const n of t)
      if (n === "(" && (e += 1), n === ")" && (e -= 1), e < 0) return !1;
    return e === 0;
  }
  /** @param {HTMLElement} el */
  unwrap(t) {
    const e = t.parentNode;
    if (e) {
      for (; t.firstChild; ) e.insertBefore(t.firstChild, t);
      e.removeChild(t);
    }
  }
}
const U = {
  theme: "auto",
  locale: "en",
  height: 420,
  history: { max_steps: 1e3, debounce_ms: 300 },
  autosave: { enabled: !1, interval_ms: 15e3, storage_key: "wysiwyg-editor-autosave" }
}, M = /* @__PURE__ */ new Map();
class S {
  /**
   * @param {HTMLTextAreaElement} textarea
   * @param {EditorOptions} options
   */
  constructor(t, e = {}) {
    var n, o;
    this.textarea = t, this.options = { ...U, ...e }, this.events = new A(), this.sanitizer = new W(this.options.sanitizer), this.plugins = /* @__PURE__ */ new Map(), this.buildDom(), this.selection = new V(this.root), this.commands = new _(this), this.history = new I({
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
      console.error("WYSIWYG Editor: plugin loading failed", i);
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
    }), this.root.addEventListener("paste", (t) => this.handlePaste(t)), this.root.addEventListener("drop", (t) => this.events.emit("drop", t)), this.root.addEventListener("dragover", (t) => this.handleDragOver(t)), this.root.addEventListener("dragleave", (t) => this.handleDragLeave(t)), document.addEventListener("keydown", this.handleShortcut), document.addEventListener("keydown", this.handleTableTab), document.addEventListener("keydown", this.handleEnter), this.textarea.form && this.textarea.form.addEventListener("submit", () => this.syncTextarea());
  }
  syncSelectionState() {
    this.selection.save(), this.events.emit("selectionchange", this);
  }
  syncTextarea() {
    this.textarea.value = this.getHTML();
  }
  /** Serialize caret position as text offsets for undo/redo. */
  saveSelectionBookmark() {
    const t = window.getSelection();
    if (!t || t.rangeCount === 0) return null;
    const e = t.getRangeAt(0);
    return this.root.contains(e.commonAncestorContainer) ? {
      start: this.textOffset(e.startContainer, e.startOffset),
      end: this.textOffset(e.endContainer, e.endOffset)
    } : null;
  }
  /** Calculate character offset from root start to a given node+offset. */
  textOffset(t, e) {
    const n = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT, null);
    let o = 0, i;
    for (; i = n.nextNode(); ) {
      if (i === t) return o + e;
      o += (i.textContent || "").length;
    }
    return o;
  }
  /** Restore caret from a previously saved bookmark. */
  restoreSelectionBookmark(t) {
    if (!t) return;
    const { start: e, end: n } = t, o = this.nodeAtOffset(e), i = this.nodeAtOffset(n);
    if (!o || !i) return;
    const r = document.createRange();
    r.setStart(o.node, Math.min(o.offset, (o.node.textContent || "").length)), r.setEnd(i.node, Math.min(i.offset, (i.node.textContent || "").length));
    const c = window.getSelection();
    c && (c.removeAllRanges(), c.addRange(r));
  }
  /** Find text node and offset at a given character position from root start. */
  nodeAtOffset(t) {
    const e = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT, null);
    let n = 0, o;
    for (; o = e.nextNode(); ) {
      const i = (o.textContent || "").length;
      if (n + i >= t) return { node: o, offset: t - n };
      n += i;
    }
    return null;
  }
  _debounce(t, e) {
    let n;
    return (...o) => {
      clearTimeout(n), n = setTimeout(() => t(...o), e);
    };
  }
  emitChange() {
    this._debouncedSyncTextarea(), this.events.emit("change", this.getHTML());
  }
  /** @param {ClipboardEvent} event */
  handlePaste(t) {
    var i, r;
    if (t.preventDefault(), this.destroyed) return;
    const e = (i = t.clipboardData) == null ? void 0 : i.getData("text/html"), n = ((r = t.clipboardData) == null ? void 0 : r.getData("text/plain")) ?? "";
    let o;
    e ? o = this.sanitizer.sanitize(e) : o = this.escapeHtml(this.autoLink(n)), this.commands.insertHTML(o), this.events.emit("paste", { html: e, text: n });
  }
  /** Converts URLs in plain text to clickable <a> links. */
  autoLink(t) {
    return t.replace(
      /(https?:\/\/[^\s<]+)/gi,
      '<a href="$1">$1</a>'
    );
  }
  /** @param {string} text */
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t, e.innerHTML.replace(/\n/g, "<br>");
  }
  /** @param {KeyboardEvent} event */
  handleShortcut(t) {
    if (this.destroyed || !this.root.contains(document.activeElement) || !(t.ctrlKey || t.metaKey)) return;
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
      z: () => t.shiftKey ? this.history.redo() : this.history.undo(),
      y: () => this.history.redo(),
      s: () => this.events.emit("save", this.getHTML())
    }[t.key.toLowerCase()];
    o && (t.preventDefault(), o());
  }
  /** @param {KeyboardEvent} event */
  handleTableTab(t) {
    if (t.key !== "Tab" || this.destroyed || !this.root.contains(document.activeElement)) return;
    const e = this.module("table");
    if (!e || !e.getCurrentTable()) return;
    t.preventDefault();
    const n = t.shiftKey;
    e.navigateToCell(n ? "prev" : "next");
  }
  /** @param {KeyboardEvent} event */
  handleEnter(t) {
    if (t.key !== "Enter" || t.shiftKey || this.destroyed || !this.root.contains(document.activeElement)) return;
    const e = this.selection.getBlockElement();
    if (!e) return;
    const n = e.closest("blockquote"), o = e.tagName === "PRE" || !!e.closest("pre"), i = e.tagName === "DIV" && e.classList.contains("note"), r = this.selection.getRange();
    if (!r) return;
    if (!n && !o && !i) {
      let l = r.startContainer;
      if (l.nodeType === Node.TEXT_NODE && (l = l.parentElement), !(l instanceof HTMLElement) || !l.closest("code")) return;
    }
    if (t.preventDefault(), this.history.push(), o) {
      if (!e.textContent.trim()) {
        const a = document.createElement("p");
        a.innerHTML = "<br>", e.parentNode.insertBefore(a, e.nextSibling), e.parentNode.removeChild(e);
        const h = document.createRange();
        h.setStart(a, 0), h.collapse(!0), this.selection.setRange(h);
      } else
        this._insertBreakInPre(r);
      this.emitChange();
      return;
    }
    if (n) {
      if (!e.textContent.trim()) {
        const m = document.createElement("p");
        m.innerHTML = "<br>", n.parentNode.insertBefore(m, n.nextSibling), e.parentNode.removeChild(e), !n.textContent.trim() && !n.children.length && n.parentNode.removeChild(n);
        const f = document.createRange();
        f.setStart(m, 0), f.collapse(!0), this.selection.setRange(f), this.emitChange();
        return;
      }
      const a = document.createElement("p"), { startContainer: h, startOffset: p } = r;
      if (h.nodeType === Node.TEXT_NODE && e.contains(h)) {
        const m = h.textContent, f = m.slice(0, p), b = m.slice(p);
        h.textContent = f, b && (a.textContent = b);
      }
      a.textContent || (a.innerHTML = "<br>"), e.parentNode.insertBefore(a, e.nextSibling);
      const g = document.createRange(), v = a.firstChild || a;
      g.setStart(v, 0), g.collapse(!0), this.selection.setRange(g), this.emitChange();
      return;
    }
    if (i) {
      if (!e.textContent.trim()) {
        const m = document.createElement("p");
        m.innerHTML = "<br>", e.parentNode.insertBefore(m, e.nextSibling), e.parentNode.removeChild(e);
        const f = document.createRange();
        f.setStart(m, 0), f.collapse(!0), this.selection.setRange(f), this.emitChange();
        return;
      }
      const a = document.createElement("p"), { startContainer: h, startOffset: p } = r;
      if (h.nodeType === Node.TEXT_NODE && e.contains(h)) {
        const m = h.textContent, f = m.slice(0, p), b = m.slice(p);
        h.textContent = f, b && (a.textContent = b);
      }
      a.textContent || (a.innerHTML = "<br>"), e.parentNode.insertBefore(a, e.nextSibling);
      const g = document.createRange(), v = a.firstChild || a;
      g.setStart(v, 0), g.collapse(!0), this.selection.setRange(g), this.emitChange();
      return;
    }
    const c = (() => {
      let l = r.startContainer;
      return l.nodeType === Node.TEXT_NODE && (l = l.parentElement), l instanceof HTMLElement ? l.closest("code") : null;
    })();
    if (c) {
      const { startContainer: l, startOffset: a } = r;
      if (l.nodeType === Node.TEXT_NODE && e.contains(l)) {
        const h = l.textContent, p = h.slice(0, a), g = h.slice(a);
        l.textContent = p;
        const v = document.createElement("p");
        if (g ? v.textContent = g : v.innerHTML = "<br>", e.parentNode.insertBefore(v, e.nextSibling), !c.textContent.trim()) {
          const b = c.parentNode, x = document.createTextNode("");
          b.replaceChild(x, c);
        }
        const m = document.createRange(), f = v.firstChild || v;
        m.setStart(f, 0), m.collapse(!0), this.selection.setRange(m);
      } else {
        const h = document.createElement("p");
        h.innerHTML = "<br>", e.parentNode.insertBefore(h, e.nextSibling);
        const p = document.createRange();
        p.setStart(h, 0), p.collapse(!0), this.selection.setRange(p);
      }
      this.emitChange();
    }
  }
  _insertBreakInPre(t) {
    const { startContainer: e, startOffset: n } = t, o = document.createElement("br");
    if (e.nodeType === Node.TEXT_NODE) {
      const r = e.textContent, c = r.slice(0, n), l = r.slice(n);
      if (e.textContent = c, e.parentNode.insertBefore(o, e.nextSibling), l) {
        const a = document.createTextNode(l);
        e.parentNode.insertBefore(a, o.nextSibling);
      }
    } else {
      const r = e.childNodes[n] || null;
      e.insertBefore(o, r);
    }
    const i = document.createRange();
    i.setStartAfter(o), i.collapse(!0), this.selection.setRange(i);
  }
  handleDragOver() {
    if (this.destroyed) return;
    if (!this.wrapper.querySelector(".ife-drop-cursor")) {
      const e = document.createElement("div");
      e.className = "ife-drop-cursor", this.wrapper.appendChild(e);
    }
  }
  /** @param {DragEvent} event */
  handleDragLeave(t) {
    if (this.destroyed || t.relatedTarget && this.wrapper.contains(t.relatedTarget)) return;
    const e = this.wrapper.querySelector(".ife-drop-cursor");
    e && e.remove();
  }
  setupAutosave() {
    const t = this.options.autosave;
    t != null && t.enabled && (this.autosaveTimer = setInterval(() => {
      try {
        window.localStorage.setItem(t.storage_key, this.getHTML());
      } catch {
      }
    }, t.interval_ms ?? 15e3));
  }
  /**
   * Loads every registered plugin (built-in modules and third-party ones)
   * unless explicitly excluded via options.disabledPlugins. This keeps
   * built-in features (link, image, table, ...) equally pluggable while
   * still available out of the box without extra configuration.
   */
  async loadPlugins() {
    const t = new Set(this.options.disabledPlugins ?? []), e = [];
    M.forEach((n, o) => {
      t.has(o) || e.push(
        Promise.resolve(n(this)).then((i) => {
          this.plugins.set(o, i);
        })
      );
    }), await Promise.all(e);
  }
  /**
   * @param {string} name registered plugin/module name (e.g. "link", "table")
   */
  module(t) {
    return this.plugins.get(t);
  }
  applyTheme(t) {
    var e;
    if (this.wrapper.dataset.theme = t, t === "auto") {
      const n = (e = window.matchMedia) == null ? void 0 : e.call(window, "(prefers-color-scheme: dark)").matches;
      this.wrapper.dataset.resolvedTheme = n ? "dark" : "light";
    } else
      this.wrapper.dataset.resolvedTheme = t;
  }
  // --------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------
  getHTML() {
    return this.sanitizer.sanitize(this.root.innerHTML);
  }
  /** @param {string} html */
  setHTML(t) {
    this.root.innerHTML = this.sanitizer.sanitize(t), this.history.push(), this.emitChange();
  }
  /** @param {string} html */
  insertHTML(t) {
    this.commands.insertHTML(this.sanitizer.sanitize(t));
  }
  undo() {
    this.history.undo(), this.emitChange();
  }
  redo() {
    this.history.redo(), this.emitChange();
  }
  clear() {
    var t;
    if (this.setHTML("<div><br></div>"), this.history.clear(), (t = this.options.autosave) != null && t.enabled)
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
    this.destroyed || (this.destroyed = !0, this.plugins.forEach((t) => {
      var e;
      return (e = t == null ? void 0 : t.destroy) == null ? void 0 : e.call(t);
    }), this.events.emit("destroy", this), clearInterval(this.autosaveTimer), document.removeEventListener("keydown", this.handleShortcut), document.removeEventListener("keydown", this.handleTableTab), document.removeEventListener("keydown", this.handleEnter), this.root.removeEventListener("dragover", this.handleDragOver), this.root.removeEventListener("dragleave", this.handleDragLeave), this.history.destroy(), this.wrapper.remove(), this.textarea.style.display = "", this.events.destroy());
  }
  /**
   * @param {string} event
   * @param {(...args: any[]) => void} handler
   */
  on(t, e) {
    return this.events.on(t, e);
  }
  /**
   * @param {string} name
   * @param {(editor: Editor) => { destroy?: () => void }} factory
   */
  static registerPlugin(t, e) {
    M.set(t, e);
  }
}
const d = (s) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">${s}</svg>`, u = {
  undo: d('<path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>'),
  redo: d('<path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.06-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>'),
  bold: d('<path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h6.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5S13.83 9.5 13 9.5h-3v-3zm3.5 8H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>'),
  italic: d('<path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>'),
  underline: d('<path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/>'),
  strikeThrough: d('<path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/>'),
  superscript: d('<path d="M20.34 4.63l-1.31 1.53-1.31-1.53-.72.61 1.52 1.76-1.52 1.76.72.61 1.31-1.53 1.31 1.53.72-.61-1.52-1.76 1.52-1.76zM5.88 18.94h2.66l3.16-4.98h.12l3.17 4.98h2.66l-4.32-6.6 4.03-6.15h-2.61l-2.9 4.65h-.12l-2.89-4.65H6.02l4.04 6.19z"/>'),
  subscript: d('<path d="M20.34 19.37l-1.31-1.53-1.31 1.53-.72-.61 1.52-1.76-1.52-1.76.72-.61 1.31 1.53 1.31-1.53.72.61-1.52 1.76 1.52 1.76zM5.88 18.94h2.66l3.16-4.98h.12l3.17 4.98h2.66l-4.32-6.6 4.03-6.15h-2.61l-2.9 4.65h-.12l-2.89-4.65H6.02l4.04 6.19z"/>'),
  formatColorText: d('<path d="M2 20h20v4H2zM5.49 17h1.9l1.13-3h4.96l1.13 3h1.9L11.44 3h-1.87L5.49 17zm3.66-4.66L11 6l1.85 6.34H9.15z"/>'),
  clearFormat: d('<path d="M6.4 4L4 6.4l5.6 5.6-1.6 3.7v.1c-.4.9.3 1.9 1.3 1.9h.1c.6 0 1.1-.4 1.3-.9l1.4-3.2 5.2 5.2 2.4-2.4L6.4 4zM7.6 5.4L12 9.8 13.6 6H8.4l-.8-.6zM17 4H9.4l2.6 2.6H17V4z"/>'),
  formatColorFill: d('<path d="M16.56 8.94L7.62 0 6.21 1.41l2.38 2.38-5.15 5.15c-.59.59-.59 1.54 0 2.12l5.5 5.5c.29.29.68.44 1.06.44s.77-.15 1.06-.44l5.5-5.5c.59-.58.59-1.53 0-2.12zM5.21 10L10 5.21 14.79 10H5.21zM19 11.5s-2 2.17-2 3.5c0 1.1.9 2 2 2s2-.9 2-2c0-1.33-2-3.5-2-3.5z"/>'),
  alignLeft: d('<path d="M3 21h12v-2H3v2zM3 17h18v-2H3v2zM3 13h12v-2H3v2zM3 9h18V7H3v2zM3 5h12V3H3v2z"/>'),
  alignCenter: d('<path d="M7 21h10v-2H7v2zM3 17h18v-2H3v2zM7 13h10v-2H7v2zM3 9h18V7H3v2zM7 5h10V3H7v2z"/>'),
  alignRight: d('<path d="M9 21h12v-2H9v2zM3 17h18v-2H3v2zM9 13h12v-2H9v2zM3 9h18V7H3v2zM9 5h12V3H9v2z"/>'),
  alignJustify: d('<path d="M3 21h18v-2H3v2zM3 17h18v-2H3v2zM3 13h18v-2H3v2zM3 9h18V7H3v2zM3 5h18V3H3v2z"/>'),
  listBulleted: d('<path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>'),
  listNumbered: d('<path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zM7 5v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>'),
  checklist: d('<path d="M3 5h6v6H3V5zm2 2v2h2V7H5zm6.5-1.5h9v2h-9v-2zm0 6.5h9v2h-9v-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm6.5.5h9v2h-9v-2z"/>'),
  link: d('<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>'),
  unlink: d('<path d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zM3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM2 2l20 20-1.4 1.4L.6 3.4z"/>'),
  image: d('<path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>'),
  videocam: d('<path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11z"/>'),
  audiotrack: d('<path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>'),
  table: d('<path d="M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zm0 5h16V6H4v3zm0 2v3h5v-3H4zm7 0v3h9v-3h-9zm-7 5v3h5v-3H4zm7 0v3h9v-3h-9z"/>'),
  hr: d('<path d="M2 11h20v2H2z"/>'),
  blockquote: d('<path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>'),
  code: d('<path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6z"/>'),
  codeBlock: d('<path d="M3 3h18v18H3zm2 2v14h14V5H5zm3.4 7.6L4.8 9l3.6-3.6L9.8 6.8 7.4 9l2.4 2.2zm5.2 0l2.4-2.6-2.4-2.2 1.4-1.4L19 9l-3.6 3.6z"/>'),
  note: d('<path d="M20 2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM7 9h10v2H7V9zm6 6H7v-2h6v2zm4-8H7V5h10v2z"/>'),
  emoji: d('<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm7 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM12 17.5c-2.33 0-4.32-1.45-5.15-3.5h10.3c-.83 2.05-2.82 3.5-5.15 3.5z"/>'),
  specialChars: d('<path d="M5 4v3h5.5v12h3V7H19V4z"/>'),
  find: d('<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1114 9.5 4.5 4.5 0 019.5 14z"/>'),
  sourceCode: d('<path d="M14.6 16.6L19.2 12l-4.6-4.6L16 6l6 6-6 6zM9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6z"/>'),
  fullscreen: d('<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>'),
  indent: d('<path d="M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/>'),
  outdent: d('<path d="M3 21h18v-2H3v2zM7 8v8l-4-4 4-4zm4 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/>'),
  wordCount: d('<path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2zm13 0h3v2h-3v-2zm-3-5h6v2h-6v-2z"/>'),
  ltr: d('<path d="M6 4v16h2v-5h4v5h2V4h-2v5H8V4H6zm10 0v16h2V4h-2z"/>'),
  rtl: d('<path d="M8 4v16h2v-5h4v5h2V4h-2v5h-4V4H8zM18 4v16h2V4h-2z"/>'),
  markdown: d('<path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h2l2 3 2-3h2v8h-2v-5l-2 3-2-3v5H7V7zm10 0h2v8h-4v-2h2V7z"/>'),
  date: d('<path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V9h14v10z"/>'),
  time: d('<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm1-13h-2v6l5.25 3.15.75-1.23-4-2.37V7z"/>'),
  template: d('<path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zM13 3h8v8h-8V3zm0 10h8v8h-8v-8z"/>'),
  anchor: d('<path d="M18 10h-4V6a2 2 0 00-4 0v4H6a2 2 0 000 4h4v4a2 2 0 004 0v-4h4a2 2 0 000-4z"/>'),
  listProps: d('<path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>'),
  paragraph: d('<path d="M13 4v16h-2V4H7v16c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V4h-4z"/>')
};
class $ {
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
  constructor(t, { title: e, bodyHtml: n, confirmLabel: o = "OK", cancelLabel: i = "Cancel", onConfirm: r, onClose: c }) {
    H(this, "handleEscape", (t) => {
      t.key === "Escape" && this.close();
    });
    this.container = t, this.onConfirm = r, this.onClose = c, this.overlay = document.createElement("div"), this.overlay.className = "ife-dialog-overlay", this.overlay.innerHTML = `
            <form class="ife-dialog" role="dialog" aria-modal="true" aria-label="${e}">
                <header class="ife-dialog__header">
                    <h2>${e}</h2>
                    <button type="button" class="ife-dialog__close" aria-label="Close">&times;</button>
                </header>
                <div class="ife-dialog__body">${n}</div>
                <footer class="ife-dialog__footer">
                    <button type="button" class="ife-btn ife-btn--ghost" data-action="cancel">${i}</button>
                    <button type="submit" class="ife-btn ife-btn--primary" data-action="confirm">${o}</button>
                </footer>
            </form>
        `, this.form = this.overlay.querySelector("form"), this.overlay.querySelectorAll("button, input, select, textarea").forEach((l) => {
      l.addEventListener("click", (a) => a.stopPropagation()), l.addEventListener("keydown", (a) => {
        a.key !== "Escape" && a.stopPropagation();
      });
    }), this.overlay.querySelectorAll("button").forEach((l) => {
      l.addEventListener("mousedown", (a) => a.preventDefault());
    }), this.overlay.querySelector(".ife-dialog__close").addEventListener("click", () => this.close()), this.overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => this.close()), this.overlay.addEventListener("click", (l) => {
      l.target === this.overlay && this.close();
    }), this.form.addEventListener("submit", (l) => {
      l.preventDefault(), l.stopPropagation(), this.onConfirm(this.form), this.close();
    }), document.addEventListener("keydown", this.handleEscape);
  }
  open() {
    this.scrollPos = { x: window.scrollX, y: window.scrollY }, this.containerScrollTop = this.container.scrollTop, document.body.style.overflow = "hidden", document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`, document.body.appendChild(this.overlay);
    const t = getComputedStyle(this.container);
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
      this.overlay.style.setProperty(o, t.getPropertyValue(o));
    });
    const n = this.form.querySelector("input, textarea, select");
    n == null || n.focus({ preventScroll: !0 });
  }
  close() {
    document.body.style.overflow = "", document.body.style.paddingRight = "", this.scrollPos && window.scrollTo(this.scrollPos.x, this.scrollPos.y), this.container.scrollTop = this.containerScrollTop ?? 0, document.removeEventListener("keydown", this.handleEscape), this.overlay.remove(), this.onClose && this.onClose();
  }
}
const z = {
  blockFormat: {
    icon: u.paragraph,
    label: "Block format",
    type: "select",
    options: [
      ["p", "paragraph"],
      ["h1", "heading1"],
      ["h2", "heading2"],
      ["h3", "heading3"],
      ["h4", "heading4"],
      ["h5", "heading5"],
      ["h6", "heading6"]
    ],
    onChange: (s, t) => {
      s.commands.exec("formatBlock", t);
    }
  },
  undo: { icon: u.undo, label: "Undo", shortcut: "Ctrl+Z", type: "action", action: (s) => s.undo() },
  redo: { icon: u.redo, label: "Redo", shortcut: "Ctrl+Y", type: "action", action: (s) => s.redo() },
  bold: { icon: u.bold, label: "Bold", shortcut: "Ctrl+B", type: "command", command: "bold" },
  italic: { icon: u.italic, label: "Italic", shortcut: "Ctrl+I", type: "command", command: "italic" },
  underline: { icon: u.underline, label: "Underline", shortcut: "Ctrl+U", type: "command", command: "underline" },
  strike: { icon: u.strikeThrough, label: "Strikethrough", type: "command", command: "strikeThrough" },
  superscript: { icon: u.superscript, label: "Superscript", type: "command", command: "superscript" },
  subscript: { icon: u.subscript, label: "Subscript", type: "command", command: "subscript" },
  forecolor: { icon: u.formatColorText, label: "Text color", type: "color", command: "foreColor" },
  backcolor: { icon: u.formatColorFill, label: "Background color", type: "color", command: "backColor" },
  removeFormat: {
    icon: u.clearFormat,
    label: "Clear formatting",
    type: "command",
    command: "removeFormat"
  },
  alignLeft: { icon: u.alignLeft, label: "Align left", type: "command", command: "justifyLeft" },
  alignCenter: { icon: u.alignCenter, label: "Align center", type: "command", command: "justifyCenter" },
  alignRight: { icon: u.alignRight, label: "Align right", type: "command", command: "justifyRight" },
  alignJustify: { icon: u.alignJustify, label: "Justify", type: "command", command: "justifyFull" },
  bulletList: { icon: u.listBulleted, label: "Bulleted list", type: "command", command: "insertUnorderedList" },
  orderedList: { icon: u.listNumbered, label: "Numbered list", type: "command", command: "insertOrderedList" },
  checklist: {
    icon: u.checklist,
    label: "Checklist",
    type: "action",
    action: (s) => s.commands.insertHTML('<ul class="ife-checklist"><li><input type="checkbox"> Item</li></ul>')
  },
  indent: { icon: u.indent, label: "Increase indent", type: "command", command: "indent" },
  outdent: { icon: u.outdent, label: "Decrease indent", type: "command", command: "outdent" },
  link: { icon: u.link, label: "Insert/edit link", shortcut: "Ctrl+K", type: "action", action: (s) => s.module("link").open() },
  unlink: {
    icon: u.unlink,
    label: "Remove link",
    type: "action",
    action: (s) => {
      const t = s.selection.closest("a");
      t && s.module("link").remove(t);
    }
  },
  image: { icon: u.image, label: "Insert image", type: "action", action: (s) => s.module("image").open() },
  video: { icon: u.videocam, label: "Insert video", type: "action", action: (s) => s.module("media").openVideo() },
  audio: { icon: u.audiotrack, label: "Insert audio", type: "action", action: (s) => s.module("media").openAudio() },
  table: { icon: u.table, label: "Insert table", type: "action", action: (s) => s.module("table").openInsertDialog() },
  hr: { icon: u.hr, label: "Horizontal rule", type: "action", action: (s) => s.module("media").insertHorizontalRule() },
  blockquote: { icon: u.blockquote, label: "Blockquote", type: "action", action: (s) => {
    const t = s.selection.getBlockElement();
    if (!t || t === s.root) return;
    if (t.tagName === "BLOCKQUOTE" || t.closest("blockquote")) {
      const n = t.tagName === "BLOCKQUOTE" ? t : t.closest("blockquote");
      s.history.push();
      const o = document.createElement("p");
      o.innerHTML = n.innerHTML, n.replaceWith(o);
    } else {
      s.history.push();
      const n = document.createElement("blockquote");
      n.innerHTML = t.outerHTML, t.replaceWith(n);
    }
    s.emitChange();
  } },
  codeInline: {
    icon: u.code,
    label: "Inline code",
    type: "action",
    action: (s) => s.selection.wrap("code") && s.emitChange()
  },
  codeBlock: { icon: u.codeBlock, label: "Code block", type: "action", action: (s) => {
    const t = s.selection.getBlockElement();
    if (!t || t === s.root) return;
    const e = t.tagName === "PRE" || t.closest("pre");
    if (s.history.push(), e) {
      const n = t.tagName === "PRE" ? t : t.closest("pre"), o = document.createElement("p");
      o.innerHTML = n.innerHTML, n.replaceWith(o);
    } else {
      const n = document.createElement("pre");
      n.innerHTML = t.innerHTML, t.replaceWith(n);
    }
    s.emitChange();
  } },
  note: { icon: u.note, label: "Insert note", type: "action", action: (s) => s.module("note").open() },
  emoji: {
    icon: u.emoji,
    label: "Emoji",
    type: "action",
    action: (s, t) => s.module("emoji").open(t)
  },
  specialChars: {
    icon: u.specialChars,
    label: "Special characters",
    type: "action",
    action: (s) => s.commands.insertHTML("&amp;copy;")
  },
  find: { icon: u.find, label: "Find & Replace", shortcut: "Ctrl+F", type: "action", action: (s) => s.module("find").open() },
  sourceCode: {
    icon: u.sourceCode,
    label: "Source code",
    type: "action",
    toggle: !0,
    action: (s) => s.module("codeView").toggle()
  },
  fullscreen: {
    icon: u.fullscreen,
    label: "Fullscreen",
    type: "action",
    toggle: !0,
    action: (s) => s.module("fullscreen").toggle()
  },
  ltr: {
    icon: u.ltr,
    label: "Left-to-right",
    type: "action",
    toggle: !0,
    action: (s) => s.commands.exec("direction", "ltr")
  },
  rtl: {
    icon: u.rtl,
    label: "Right-to-left",
    type: "action",
    toggle: !0,
    action: (s) => s.commands.exec("direction", "rtl")
  },
  markdown: {
    icon: u.markdown,
    label: "Markdown",
    type: "action",
    toggle: !0,
    action: (s) => {
      const t = s.module("markdown");
      if (t)
        if (s.root.dataset.markdownMode === "true") {
          s.root.dataset.markdownMode = "false";
          const e = s.getHTML(), n = t.htmlToMarkdown(e);
          s.setHTML(t.markdownToHtml(n));
        } else
          s._mdSource = t.export(), t.import(s._mdSource), s.root.dataset.markdownMode = "true";
    }
  },
  date: {
    icon: u.date,
    label: "Insert date",
    type: "action",
    action: (s) => {
      const e = (/* @__PURE__ */ new Date()).toLocaleDateString(s.options.locale ?? "en", { year: "numeric", month: "long", day: "numeric" });
      s.commands.insertHTML(e);
    }
  },
  time: {
    icon: u.time,
    label: "Insert time",
    type: "action",
    action: (s) => {
      const e = (/* @__PURE__ */ new Date()).toLocaleTimeString(s.options.locale ?? "en", { hour: "2-digit", minute: "2-digit" });
      s.commands.insertHTML(e);
    }
  },
  anchor: {
    icon: u.anchor,
    label: "Insert anchor",
    type: "action",
    action: (s) => {
      const t = prompt("Anchor name:");
      if (!t) return;
      s.history.push();
      const e = document.createElement("a");
      e.name = t.trim();
      const n = s.selection.getRange();
      n && (n.deleteContents(), n.insertNode(e)), s.emitChange();
    }
  },
  templates: {
    icon: u.template,
    label: "Content templates",
    type: "action",
    action: (s) => {
      var t;
      return (t = s.module("templates")) == null ? void 0 : t.open();
    }
  },
  listProps: {
    icon: u.listProps,
    label: "List properties",
    type: "action",
    action: (s) => {
      const t = s.selection.closest("li"), e = t == null ? void 0 : t.closest("ol, ul");
      if (!e || e.tagName !== "OL") return;
      const n = e.getAttribute("start") || "", o = e.style.listStyleType || "", i = `
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
            `, r = new $(s.wrapper, {
        title: "List properties",
        bodyHtml: i,
        confirmLabel: "Apply",
        onConfirm: (c) => {
          const l = new FormData(c), a = l.get("start"), h = l.get("type");
          s.history.push(), a ? e.setAttribute("start", String(a)) : e.removeAttribute("start"), h ? e.style.listStyleType = h : e.style.listStyleType = "", s.emitChange();
        }
      });
      s.selection.save(), r.open();
    }
  }
}, j = {
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
  blockFormat: "Block format",
  madeBy: "Made by ITkha"
}, X = {
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
  blockFormat: "Формат блоку",
  madeBy: "Зроблено в ITkha"
}, K = {
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
  blockFormat: "Формат блока",
  madeBy: "Сделано в ITkha"
}, k = /* @__PURE__ */ new Map([
  ["en", j],
  ["uk", X],
  ["ru", K]
]), y = {
  /**
   * @param {string} code
   * @param {Record<string, string>} strings
   */
  register(s, t) {
    k.set(s, t);
  },
  /**
   * @param {string} locale
   * @param {string} key
   * @returns {string}
   */
  t(s, t) {
    return (k.get(s) ?? k.get("en"))[t] ?? k.get("en")[t] ?? t;
  },
  available() {
    return [...k.keys()];
  }
}, G = [
  ["undo", "redo"],
  ["blockFormat"],
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
class J {
  /**
   * @param {import('../core/Editor').default} editor
   * @param {Array<string[]>|null} [layout]
   */
  constructor(t, e = null) {
    this.editor = t, this.layout = e ?? G, this.buttons = /* @__PURE__ */ new Map(), this.el = document.createElement("div"), this.el.className = "ife-toolbar", this.el.setAttribute("role", "toolbar"), this.el.setAttribute("aria-label", "Text formatting"), this.render(), this.editor.wrapper.insertBefore(this.el, this.editor.root), this.editor.on("selectionchange", () => this.syncActiveStates()), this.editor.on("focus", () => this.syncActiveStates()), this.el.addEventListener("mousedown", () => {
      this.editor.selection.save();
    }, !0);
  }
  render() {
    this.layout.forEach((t) => {
      const e = document.createElement("div");
      e.className = "ife-toolbar__group", t.forEach((n) => {
        const o = z[n];
        if (!o) return;
        const i = this.buildControl(n, o);
        i && e.appendChild(i);
      }), e.children.length && this.el.appendChild(e);
    });
  }
  buildControl(t, e) {
    return e.type === "select" ? this.buildSelect(t, e) : e.type === "color" ? this.buildColorPicker(t, e) : this.buildButton(t, e);
  }
  buildButton(t, e) {
    const n = this.editor.options.locale ?? "en";
    let o = y.t(n, t) !== t ? y.t(n, t) : e.label;
    if (e.shortcut) {
      const r = e.shortcut.replace(/Ctrl/g, "⌘");
      o += ` (${e.shortcut} / ${r})`;
    }
    const i = document.createElement("button");
    return i.type = "button", i.className = "ife-toolbar__btn", i.dataset.command = t, i.title = o, i.setAttribute("aria-label", o), i.innerHTML = e.icon ?? "", i.addEventListener("mousedown", (r) => r.preventDefault()), i.addEventListener("click", () => {
      var r;
      this.editor.selection.restore(), e.type === "command" ? this.editor.commands.exec(e.command) : (r = e.action) == null || r.call(e, this.editor, i), e.toggle && i.classList.toggle("is-active"), this.syncActiveStates();
    }), this.buttons.set(t, i), i;
  }
  buildSelect(t, e) {
    const n = this.editor.options.locale ?? "en", o = document.createElement("select");
    return o.className = "ife-toolbar__select", o.setAttribute("aria-label", y.t(n, t) !== t ? y.t(n, t) : e.label), e.options.forEach(([i, r]) => {
      const c = document.createElement("option");
      c.value = i, c.textContent = r, o.appendChild(c);
    }), o.addEventListener("pointerdown", () => {
      this.editor.selection.save();
    }), o.addEventListener("mousedown", () => {
      this.editor.selection.save();
    }), o.addEventListener("change", () => {
      this.editor.selection.restore(), e.onChange(this.editor, o.value), this.syncActiveStates();
    }), this.buttons.set(t, o), o;
  }
  buildColorPicker(t, e) {
    const n = this.editor.options.locale ?? "en", o = y.t(n, t) !== t ? y.t(n, t) : e.label, i = document.createElement("label");
    i.className = "ife-toolbar__color", i.title = o, i.innerHTML = e.icon;
    const r = document.createElement("input");
    r.type = "color", r.setAttribute("aria-label", o);
    const c = e.command === "backColor" ? "backgroundColor" : "color", l = () => {
      const a = this.getCurrentColor(c);
      a && (r.value = a);
    };
    return r.addEventListener("pointerdown", () => {
      this.editor.selection.save(), l();
    }), r.addEventListener("mousedown", () => {
      this.editor.selection.save(), l();
    }), r.addEventListener("input", () => {
      this.editor.selection.restore(), this.editor.commands.exec(e.command, r.value);
    }), i.appendChild(r), this.buttons.set(t, i), i;
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
    }).forEach(([a, h]) => {
      const p = this.buttons.get(a);
      p instanceof HTMLElement && p.classList.toggle("is-active", this.editor.commands.queryState(h));
    });
    const e = this.editor.selection.getBlockElement();
    let n = "";
    if (e) {
      let a = e;
      for (; a && a !== this.editor.root; ) {
        if (a.style.textAlign) {
          n = a.style.textAlign;
          break;
        }
        a = a.parentElement;
      }
    }
    ["alignLeft", "alignCenter", "alignRight", "alignJustify"].forEach((a) => {
      const h = this.buttons.get(a);
      h instanceof HTMLElement && h.classList.toggle("is-active", n === a.replace("align", "").toLowerCase());
    });
    const o = this.buttons.get("ltr"), i = this.buttons.get("rtl");
    if (o instanceof HTMLElement && i instanceof HTMLElement) {
      let a = "";
      if (e) {
        let h = e;
        for (; h && h !== this.editor.root; ) {
          if (h.dir) {
            a = h.dir;
            break;
          }
          h = h.parentElement;
        }
      }
      o.classList.toggle("is-active", a === "ltr"), i.classList.toggle("is-active", a === "rtl");
    }
    const r = this.buttons.get("markdown");
    r instanceof HTMLElement && r.classList.toggle("is-active", this.editor.root.dataset.markdownMode === "true");
    const c = this.buttons.get("blockquote");
    if (c instanceof HTMLElement) {
      let a = !1;
      if (e) {
        let h = e;
        for (; h && h !== this.editor.root; ) {
          if (h.tagName === "BLOCKQUOTE") {
            a = !0;
            break;
          }
          h = h.parentElement;
        }
      }
      c.classList.toggle("is-active", a);
    }
    const l = this.buttons.get("blockFormat");
    if (l instanceof HTMLSelectElement && e) {
      const a = e.tagName.toLowerCase(), h = ["p", "h1", "h2", "h3", "h4", "h5", "h6"];
      l.value = h.includes(a) ? a : "p";
    }
    ["forecolor", "backcolor"].forEach((a) => {
      const h = z[a], p = this.buttons.get(a);
      if (!h || !(p instanceof HTMLInputElement || p instanceof HTMLLabelElement)) return;
      const g = p.querySelector('input[type="color"]');
      if (!g) return;
      const v = h.command === "backColor" ? "backgroundColor" : "color", m = this.getCurrentColor(v);
      m && (g.value = m);
    });
  }
  /**
   * Returns the effective inline color of the current selection for the given
   * CSS property (e.g. 'color' or 'backgroundColor'), walking up from the
   * caret to the nearest element that sets it, normalized to '#rrggbb' so it
   * can be assigned to a native <input type="color"> value.
   * @param {string} cssProp camelCase CSS property name
   * @returns {string} normalized hex color, or '' when none is set
   */
  getCurrentColor(t) {
    var i;
    const e = this.editor.selection.getRange();
    if (!e) return "";
    let n = e.commonAncestorContainer;
    n.nodeType === Node.TEXT_NODE && (n = n.parentElement);
    let o = n instanceof HTMLElement ? n : null;
    for (; o && o !== this.editor.root; ) {
      if ((i = o.style) != null && i[t])
        return this.normalizeColorValue(o.style[t]);
      o = o.parentElement;
    }
    return "";
  }
  /** Normalizes a CSS color ('#ff0000', 'rgb(255, 0, 0)', ...) to '#rrggbb'. */
  normalizeColorValue(t) {
    if (!t) return "";
    const e = String(t).trim(), n = e.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (n) {
      const o = (i) => parseInt(i, 10).toString(16).padStart(2, "0");
      return `#${o(n[1])}${o(n[2])}${o(n[3])}`;
    }
    return e;
  }
  setEnabled(t, e) {
    const n = this.buttons.get(t);
    (n instanceof HTMLButtonElement || n instanceof HTMLSelectElement) && (n.disabled = !e);
  }
  destroy() {
    this.el.remove();
  }
}
const Y = {
  link: () => import("./LinkModule-DAr7R9F4.js"),
  image: () => import("./ImageModule-DtlD1ZS6.js"),
  table: () => import("./TableModule-BHrpijY-.js"),
  codeView: () => import("./CodeViewModule-Wu0FnDsK.js"),
  fullscreen: () => import("./FullscreenModule-CNXzlUim.js"),
  find: () => import("./FindModule-BfXV4ASr.js"),
  note: () => import("./NoteModule-BO0t8vZ7.js"),
  media: () => import("./MediaModule-DctRdH7H.js"),
  markdown: () => import("./MarkdownModule-DDfsA3Gh.js"),
  statusBar: () => import("./StatusBar-B1gRKvUv.js"),
  emoji: () => import("./EmojiModule-BZoYsWjN.js"),
  contextMenu: () => import("./ContextMenu-BECN7uLZ.js"),
  templates: () => import("./TemplateModule-BKSluB7-.js")
};
Object.entries(Y).forEach(([s, t]) => {
  S.registerPlugin(s, async (e) => {
    const { default: n } = await t();
    return new n(e);
  });
});
const w = /* @__PURE__ */ new WeakMap(), E = /* @__PURE__ */ new Set(), Z = {
  /**
   * @param {string|HTMLTextAreaElement} target CSS selector or a textarea element
   * @param {import('./core/Editor.js').EditorOptions} [options]
   * @returns {EditorCore}
   */
  init(s, t = {}) {
    const e = typeof s == "string" ? document.querySelector(s) : s;
    if (!e)
      throw new Error(`WYSIWYG Editor: target "${s}" not found`);
    if (e.tagName !== "TEXTAREA")
      throw new Error("WYSIWYG Editor: init() target must be a <textarea> element");
    if (w.has(e))
      return w.get(e);
    const n = new S(e, t), o = new J(n, t.toolbar);
    return n.on("destroy", () => o.destroy()), w.set(e, n), E.add(n), n.on("destroy", () => {
      w.delete(e), E.delete(n);
    }), n;
  },
  /**
   * @param {string|HTMLTextAreaElement} target
   * @returns {EditorCore|undefined}
   */
  get(s) {
    const t = typeof s == "string" ? document.querySelector(s) : s;
    return t ? w.get(t) : void 0;
  },
  /** Destroys every editor instance currently mounted on the page. */
  destroyAll() {
    E.forEach((s) => s.destroy()), E.clear();
  },
  registerPlugin: S.registerPlugin
};
export {
  $ as D,
  u as I,
  y as L,
  Z as W
};
//# sourceMappingURL=index-o_cpqee2.js.map
