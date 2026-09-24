var z = Object.defineProperty;
var B = (l, e, t) => e in l ? z(l, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : l[e] = t;
var _ = (l, e, t) => B(l, typeof e != "symbol" ? e + "" : e, t);
class A {
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
class I {
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
    return e ? (this.savedRange = e.cloneRange(), this.savedStart = this.offsetOf(e.startContainer, e.startOffset), this.savedEnd = this.offsetOf(e.endContainer, e.endOffset)) : (this.savedRange = null, this.savedStart = null, this.savedEnd = null), this.savedRange;
  }
  /** @returns {Range|null} a clone of the saved range (or null if none) */
  getSavedRange() {
    return this.savedRange ? this.savedRange.cloneRange() : null;
  }
  /** @returns {[number, number]|null} saved [start, end] character offsets */
  getSavedOffsets() {
    return this.savedStart !== null && this.savedEnd !== null ? [this.savedStart, this.savedEnd] : null;
  }
  restore() {
    if (!this.savedRange) return;
    this.root.focus({ preventScroll: !0 });
    const e = this.buildRangeFromOffsets();
    this.setRange(e ?? this.savedRange.cloneRange());
  }
  /**
   * Restores the saved selection by offsets WITHOUT focusing the editor.
   * Used by the native colour input: focusing while the colour dialog is open
   * dismisses it, so this keeps the picker live while colouring updates.
   */
  restoreSavedOffsets() {
    const e = this.buildRangeFromOffsets();
    e && this.setRange(e);
  }
  /** @returns {Range|null} a range for the saved character offsets */
  buildRangeFromOffsets() {
    if (this.savedStart === null || this.savedEnd === null) return null;
    const e = this.offsetToPoint(this.savedStart), t = this.offsetToPoint(this.savedEnd);
    if (!e || !t) return null;
    const n = document.createRange();
    return n.setStart(e.node, e.offset), n.setEnd(t.node, t.offset), n;
  }
  /**
   * Character offset of a (node, offset) boundary in the root's concatenated
   * text stream. Element boundaries resolve to the start (offset 0) or the end
   * of the element's own text (offset > 0).
   * @param {Node} node
   * @param {number} offset
   * @returns {number}
   */
  offsetOf(e, t) {
    return e.nodeType === Node.TEXT_NODE ? this.textOffsetBefore(e) + t : t === 0 ? this.textOffsetBefore(e) : this.textOffsetBefore(e) + this.subtreeTextLength(e);
  }
  /** Number of text characters that precede `node` within the root. */
  textOffsetBefore(e) {
    let t = 0;
    const n = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
    let o;
    for (; (o = n.nextNode()) && !(o === e || e.contains(o)); )
      t += o.textContent.length;
    return t;
  }
  /** Total text character count inside `node`'s subtree. */
  subtreeTextLength(e) {
    let t = 0;
    const n = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    let o;
    for (; o = n.nextNode(); ) t += o.textContent.length;
    return t;
  }
  /** @returns {{node: Text, offset: number}|null} the point at a char offset */
  offsetToPoint(e) {
    let t = 0;
    const n = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
    let o;
    for (; o = n.nextNode(); ) {
      const i = o.textContent.length;
      if (e <= t + i)
        return { node: o, offset: e - t };
      t += i;
    }
    return null;
  }
  /**
   * Re-selects the text between two character offsets in the root's text
   * stream, locating the text nodes that now hold those offsets (robust to the
   * splits and moves performed by colouring).
   * @param {number} start
   * @param {number} end
   */
  setRangeByOffsets(e, t) {
    const n = this.offsetToPoint(e), o = this.offsetToPoint(t);
    if (!n || !o) return;
    const i = document.createRange();
    i.setStart(n.node, n.offset), i.setEnd(o.node, o.offset), this.setRange(i);
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
class D {
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
  constructor({ getContent: e, setContent: t, maxSteps: n = 1e3, debounceMs: o = 300, saveBookmark: i, restoreBookmark: s, onChange: a }) {
    this.getContent = e, this.setContent = t, this.maxSteps = n, this.debounceMs = o, this.saveBookmark = i ?? (() => null), this.restoreBookmark = s ?? (() => {
    }), this.onChange = a ?? (() => {
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
const R = /* @__PURE__ */ new Set([
  "black",
  "#000",
  "#000000",
  "rgb(0,0,0)",
  "rgb(0, 0, 0)",
  "rgb(0,0,0,0)",
  "rgba(0,0,0,1)",
  "rgba(0, 0, 0, 1)"
]), N = /* @__PURE__ */ new Set([
  "white",
  "#fff",
  "#ffffff",
  "rgb(255,255,255)",
  "rgb(255, 255, 255)",
  "rgba(255,255,255,1)",
  "rgba(255, 255, 255, 1)"
]);
function M(l) {
  const e = String(l).trim().toLowerCase().replace(/\s+/g, " ");
  return /^#[0-9a-f]{3}$/.test(e) ? `#${e.slice(1).split("").map((t) => `${t}${t}`).join("")}` : e;
}
function P(l) {
  return R.has(M(l));
}
function V(l) {
  return N.has(M(l));
}
const w = /* @__PURE__ */ new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "LI", "DIV", "UL", "OL", "TABLE", "FIGURE"]);
class F {
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
    switch (this.prepare(), e) {
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
      case "codeBlock":
        this.toggleCodeBlock();
        break;
      case "foreColor":
        t && !P(t) ? this.applyColor("color", t) : this.clearColor("color");
        break;
      case "backColor":
        t && !V(t) ? this.applyColor("backgroundColor", t) : this.clearColor("backgroundColor");
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
      case "formatBlock":
        this.formatBlock(t);
        break;
      default:
        throw new Error(`Unknown command: ${e}`);
    }
    this.editor.history.push(), this.editor.emitChange(), this.editor.events.emit("selectionchange", this.editor);
  }
  queryState(e) {
    if (e === "codeBlock") {
      const t = this.selection.getRange();
      return t ? this.closestPre(t.startContainer) !== null : !1;
    }
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
      const a = n.closest("ul, ol");
      a && a.tagName.toLowerCase() === e ? this.unwrapList(a) : a && this.convertList(a, e);
      return;
    }
    if (t.collapsed) {
      const a = this.blockAt(t.startContainer);
      if (a && this._convertCaretLine(a, t, (c) => {
        const h = document.createElement(e), d = document.createElement("li");
        return c.firstChild ? d.appendChild(c) : d.innerHTML = "<br>", h.appendChild(d), h;
      }))
        return;
    }
    const o = this.getBlocksInRange(t);
    if (!o.length) {
      const a = this._wrapRangeIntoList(t, e);
      a && this._placeCaretAtEnd(a);
      return;
    }
    const i = document.createElement(e);
    o.forEach((a) => {
      const r = document.createElement("li");
      r.innerHTML = a.innerHTML || "<br>", i.appendChild(r);
    }), o[0].replaceWith(i), o.slice(1).forEach((a) => a.remove());
    const s = document.createRange();
    s.selectNodeContents(i.lastElementChild), s.collapse(!1), this.selection.setRange(s);
  }
  /**
   * Finds the top-level block elements (paragraphs, headings, etc.)
   * touched by a range, so multi-line selections can become a single list.
   * @param {Range} range
   * @returns {HTMLElement[]}
   */
  getBlocksInRange(e) {
    if (!this.root.contains(e.commonAncestorContainer)) return [];
    if (e.commonAncestorContainer === this.root)
      return [...this.root.children].filter(
        (r) => r instanceof HTMLElement && w.has(r.tagName)
      );
    const t = this.blockAt(e.startContainer);
    if (!t) return [];
    const n = this.blockAt(e.endContainer) ?? t;
    if (t === n) return [t];
    if (t.parentNode === n.parentNode) {
      const a = [];
      let r = t;
      for (; r && (a.push(r), r !== n); )
        r = r.nextElementSibling;
      return a.length ? a : [t];
    }
    const o = (a) => {
      let r = a;
      for (; r && r.parentNode !== this.root; ) r = r.parentNode;
      return r;
    }, i = o(t), s = o(n);
    if (i && s) {
      const a = [];
      let r = i;
      for (; r && (a.push(r), r !== s); )
        r = r.nextElementSibling;
      return a.length ? a : [t];
    }
    return [t];
  }
  /**
   * Nearest block-level ancestor of a node at any depth (the block does not
   * have to be a direct child of the root — nested <p> inside a <div>,
   * inline wrappers, etc. all resolve to their real block).
   * @param {Node} node
   * @returns {HTMLElement|null}
   */
  blockAt(e) {
    let t = e.nodeType === Node.TEXT_NODE ? e.parentElement : e;
    if (t === this.root) return null;
    for (; t && t !== this.root; ) {
      if (t instanceof HTMLElement && w.has(t.tagName))
        return t;
      t = t.parentElement;
    }
    return null;
  }
  /**
   * Nearest <pre> ancestor of a node, bounded by the editor root.
   * @param {Node} node
   * @returns {HTMLElement|null}
   */
  closestPre(e) {
    let t = e.nodeType === Node.TEXT_NODE ? e.parentElement : e;
    for (; t && t !== this.root; ) {
      if (t instanceof HTMLElement && t.tagName === "PRE") return t;
      t = t.parentElement;
    }
    return null;
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
    var a;
    const t = this.selection.getRange();
    if (!t) return;
    const n = this.selection.offsetOf(t.startContainer, t.startOffset), o = this.selection.offsetOf(t.endContainer, t.endOffset);
    let i = t.commonAncestorContainer;
    if (i.nodeType === Node.TEXT_NODE && (i = i.parentElement), !(i instanceof HTMLElement)) return;
    ((a = i.style) != null && a.length ? [i, ...i.querySelectorAll("*")] : [...i.querySelectorAll("*")]).forEach((r) => {
      var c;
      try {
        if (!t.intersectsNode(r)) return;
      } catch {
        return;
      }
      if ((c = r.style) != null && c[e] && (r.style[e] = "", r.style.length === 0 && r.removeAttribute("style")), ["SPAN", "FONT"].includes(r.tagName) && r.attributes.length === 0) {
        const h = r.parentNode;
        if (!h) return;
        for (; r.firstChild; ) h.insertBefore(r.firstChild, r);
        h.removeChild(r);
      }
    }), this.selection.setRangeByOffsets(n, o);
  }
  /**
   * Applies an inline color (text `color` or `backgroundColor`) to the
   * current selection by wrapping just the selected text nodes in
   * `<span style="...">`, splitting text at the selection edges.
   *
   * Replaces `document.execCommand('foreColor'/'hiliteColor')`, which is
   * unreliable for whole‑block / large selections (it can silently no‑op)
   * and collapses the live selection after applying — both of which made
   * live recolouring while dragging a selection handle impossible.
   *
   * This implementation is:
   *  - robust for any selection (partial word, whole paragraph, multi-line);
   *  - idempotent — re‑applying the same color keeps it instead of toggling
   *    it off (execCommand toggles when the surrounding text is already the
   *    same color) and merges adjacent equal‑color spans instead of nesting;
   *  - non‑collapsing — it never touches the native selection, so it can be
   *    called repeatedly on `selectionchange` while the user drags a handle.
   * @param {'color'|'backgroundColor'} cssProp
   * @param {string} value CSS color value
   */
  applyColor(e, t) {
    const n = this.selection.getRange();
    if (!n || n.collapsed) return;
    const o = this.selection.offsetOf(n.startContainer, n.startOffset), i = this.selection.offsetOf(n.endContainer, n.endOffset), s = n.startContainer, a = n.startOffset, r = n.endContainer, c = n.endOffset;
    this.colorTextNodes(e, t, s, a, r, c), this.selection.setRangeByOffsets(o, i);
  }
  /**
   * Styles every text node intersecting the given range, splitting the
   * boundary text nodes so only the in‑range portion is wrapped.
   * @param {'color'|'backgroundColor'} cssProp
   * @param {string} value
   * @param {Node} startNode
   * @param {number} startOffset
   * @param {Node} endNode
   * @param {number} endOffset
   */
  colorTextNodes(e, t, n, o, i, s) {
    const a = document.createTreeWalker(this.editor.root, NodeFilter.SHOW_TEXT);
    let r;
    for (; r = a.nextNode(); )
      if (this.rangeIntersectsText(r, n, o, i, s)) {
        const c = r.textContent.length;
        let h = 0, d = c;
        r === n && (h = o), r === i && (d = s), this.wrapTextSegment(r, h, d, e, t);
      }
  }
  /**
   * Whether a text node's content range intersects the selection range,
   * computed with `compareDocumentPosition` so it stays valid after splits.
   * @param {Node} textNode
   * @param {Node} startNode
   * @param {number} startOffset
   * @param {Node} endNode
   * @param {number} endOffset
   * @returns {boolean}
   */
  rangeIntersectsText(e, t, n, o, i) {
    const s = e.textContent.length;
    return this.pointOrderedAtOrBefore(e, 0, o, i) && this.pointOrderedAtOrBefore(t, n, e, s);
  }
  /**
   * Compares two `(node, offset)` points using document order without
   * mutating any range, so offsets stay valid even after text splits.
   * @param {Node} aNode
   * @param {number} aOffset
   * @param {Node} bNode
   * @param {number} bOffset
   * @returns {boolean} true when (aNode,aOffset) is before-or-equal (bNode,bOffset)
   */
  pointOrderedAtOrBefore(e, t, n, o) {
    if (e === n) return t <= o;
    const i = e.compareDocumentPosition(n);
    return i & Node.DOCUMENT_POSITION_FOLLOWING ? !0 : i & Node.DOCUMENT_POSITION_PRECEDING ? !1 : t <= o;
  }
  /**
   * Wraps a contiguous segment of a text node — from `from` to `to` — in a
   * `<span>` carrying the requested color, splitting the text node if the
   * segment touches its edge and merging equal‑color neighbours.
   * @param {Text} textNode
   * @param {number} from
   * @param {number} to
   * @param {'color'|'backgroundColor'} cssProp
   * @param {string} value
   */
  wrapTextSegment(e, t, n, o, i) {
    if (t >= n) return;
    let s = e, a = t, r = n;
    a > 0 && (s = e.splitText(a), r -= a), r < s.textContent.length && s.splitText(r), this.colorTextNode(s, o, i);
  }
  /**
   * Ensures a text node is wrapped in a span with the given color, reusing
   * an existing equal‑color span and merging equal‑color neighbours so the
   * markup stays flat (idempotent).
   * @param {Text} textNode
   * @param {'color'|'backgroundColor'} cssProp
   * @param {string} value
   */
  colorTextNode(e, t, n) {
    if (!e.textContent) return;
    const o = e.parentElement;
    if (o && o.tagName === "SPAN" && this.sameColor(t, o.style[t], n)) {
      this.mergeColorSpan(o, t, n);
      return;
    }
    let i = null;
    if (o && o.tagName === "SPAN" && o.style[t])
      i = o.style.cssText, this.splitSpanAroundNode(o, e);
    else if (o && o.tagName === "SPAN" && !o.style[t] && o.childNodes.length === 1 && o.firstChild === e) {
      o.style[t] = n, this.mergeColorSpan(o, t, n);
      return;
    }
    const s = document.createElement("span");
    i && (s.style.cssText = i), s.style[t] = n, e.parentNode.insertBefore(s, e), s.appendChild(e), this.mergeColorSpan(s, t, n);
  }
  /**
   * Pulls a single child out of a span, preserving the span's colour (and any
   * other inline styles) on the content that remains before and after, so the
   * extracted node becomes a plain sibling between them.
   * @param {HTMLSpanElement} span
   * @param {Text} node direct child of `span`
   */
  splitSpanAroundNode(e, t) {
    const n = e.style.cssText, o = e.parentNode, i = document.createDocumentFragment();
    for (; e.firstChild && e.firstChild !== t; )
      i.appendChild(e.firstChild);
    e.removeChild(t);
    const s = document.createDocumentFragment();
    for (; e.firstChild; )
      s.appendChild(e.firstChild);
    const a = (h) => {
      if (!h.firstChild) return null;
      const d = document.createElement("span");
      return d.style.cssText = n, d.appendChild(h), d;
    }, r = a(i), c = a(s);
    r && o.insertBefore(r, e), o.insertBefore(t, e), c && o.insertBefore(c, e), o.removeChild(e);
  }
  /**
   * Merges a freshly coloured span with any equal-coloured element siblings so
   * the markup stays flat (idempotent re-colouring).
   * @param {HTMLSpanElement} span
   * @param {'color'|'backgroundColor'} cssProp
   * @param {string} value
   */
  mergeColorSpan(e, t, n) {
    const o = e.previousElementSibling;
    let i = e;
    o && o.tagName === "SPAN" && this.sameColor(t, o.style[t], n) && (o.appendChild(e.childNodes), e.remove(), i = o);
    const s = i.nextElementSibling;
    s && s.tagName === "SPAN" && this.sameColor(t, s.style[t], n) && (i.appendChild(s.childNodes), s.remove());
  }
  /**
   * Compares two CSS color strings after normalising shorthand/white-space
   * so `#ff0000` matches `rgb(255, 0, 0)` for span merging.
   * @param {'color'|'backgroundColor'} cssProp
   * @param {string} a
   * @param {string} b
   * @returns {boolean}
   */
  sameColor(e, t, n) {
    if (!t || !n) return !1;
    const o = document.createElement("span");
    o.style[e] = t;
    const i = o.style[e];
    o.style[e] = n;
    const s = o.style[e];
    return i === s;
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
        const s = i.parentNode;
        if (!s) return;
        for (; i.firstChild; ) s.insertBefore(i.firstChild, i);
        s.removeChild(i);
      }
    });
  }
  /** Inserts raw (already sanitized) HTML at the current caret position. */
  insertHTML(e) {
    this.prepare();
    const t = this.selection.getRange();
    if (!t) return;
    t.deleteContents();
    const n = t.createContextualFragment(e), o = n.lastChild;
    if (t.insertNode(n), o) {
      const i = document.createRange();
      i.setStartAfter(o), i.collapse(!0), this.selection.setRange(i);
    }
    this.editor.history.push(), this.editor.emitChange();
  }
  /**
   * Changes the block-level element type of the current block(s).
   * Converts every block touched by the selection (a single block, several
   * paragraphs, or a full Select-All range whose common ancestor is the root)
   * to the given tag name, e.g. 'h1' or 'p'.
   * @param {string} tag the target block tag name (lowercase, e.g. 'p', 'h1'-'h6')
   */
  formatBlock(e) {
    const t = this.selection.getRange();
    if (!t) return;
    const n = e.toLowerCase(), o = this.getBlocksInRange(t);
    if (t.collapsed && o.length === 1 && this._convertCaretLine(o[0], t, (r) => {
      const c = document.createElement(n);
      return r.firstChild ? c.appendChild(r) : c.innerHTML = "<br>", c;
    }))
      return;
    if (!o.length) {
      const a = this.wrapInlineIntoBlock(t, n);
      if (!a) return;
      const r = document.createRange();
      r.selectNodeContents(a), r.collapse(!1), this.selection.setRange(r);
      return;
    }
    const i = o.filter(
      (a) => a.tagName.toLowerCase() !== n
    );
    if (!i.length) return;
    let s = null;
    if (i.forEach((a) => {
      const r = document.createElement(n);
      r.innerHTML = a.innerHTML || "<br>", a.replaceWith(r), s = r;
    }), s) {
      const a = document.createRange();
      a.selectNodeContents(s), a.collapse(!1), this.selection.setRange(a);
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
  wrapInlineIntoBlock(e, t) {
    const n = document.createElement(t);
    let o;
    if (e.collapsed) {
      if (e.startContainer === this.root) {
        n.innerHTML = "<br>";
        const s = this.root.childNodes[e.startOffset] || null;
        return this.root.insertBefore(n, s), n;
      }
      if (o = this.getInlineLineRange(e), !o) return null;
    } else
      o = e;
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
  getInlineLineRange(e) {
    let t = e.startContainer;
    if (t.nodeType === Node.TEXT_NODE && t.parentNode && t.parentNode !== this.root && (t = t.parentElement ?? t), !(t instanceof HTMLElement || t.nodeType === Node.TEXT_NODE) || t === this.root) return null;
    if (t.nodeType === Node.ELEMENT_NODE) {
      for (; t.parentNode && t.parentNode !== this.root; )
        t = t.parentNode;
      if (t.nodeType !== Node.ELEMENT_NODE || t === this.root) return null;
    }
    const n = (c) => c === this.root || c.nodeType === Node.ELEMENT_NODE && (c.tagName === "BR" || w.has(c.tagName));
    let o = t, i = o.previousSibling;
    for (; i && !n(i); )
      o = i, i = i.previousSibling;
    let s = t, a = s.nextSibling;
    for (; a && !n(a); )
      s = a, a = a.nextSibling;
    const r = document.createRange();
    if (r.setStart(o, 0), s.nodeType === Node.TEXT_NODE)
      r.setEnd(s, s.length);
    else {
      const c = s.lastChild;
      c ? r.setEndAfter(c) : r.setEnd(s, 0);
    }
    return r;
  }
  // --------------------------------------------------------------------
  // Code block + line-aware block conversion helpers
  // --------------------------------------------------------------------
  /**
   * Toggles the current selection or caret line in/out of a <pre> code
   * block. Entering wraps the caret's line (or the selected run) in a
   * <pre>; leaving unwraps the caret's line back into a <p>.
   */
  toggleCodeBlock() {
    const e = this.selection.getRange();
    if (!e) return;
    if (e.collapsed) {
      const o = this.blockAt(e.startContainer);
      if (o) {
        const s = o.tagName === "PRE" ? "p" : "pre";
        if (this._convertCaretLine(o, e, (r) => {
          const c = document.createElement(s);
          return r.firstChild ? c.appendChild(r) : c.innerHTML = "<br>", c;
        })) return;
        this._convertBlocksToTag([o], s);
        return;
      }
      if (e.startContainer === this.root) {
        const s = document.createElement("pre");
        s.innerHTML = "<br>";
        const a = this.root.childNodes[e.startOffset] || null;
        this.root.insertBefore(s, a);
        const r = document.createRange();
        r.setStart(s, 0), r.collapse(!0), this.selection.setRange(r);
        return;
      }
      const i = this.wrapInlineIntoBlock(e, "pre");
      i && this._placeCaretAtEnd(i);
      return;
    }
    const t = this.getBlocksInRange(e);
    if (t.length === 1) {
      const o = t[0];
      if (o.tagName === "PRE") {
        this._convertBlocksToTag([o], "p");
        return;
      }
      const i = this._splitBlockAtSelection(o, e, "pre");
      i && this._placeCaretAtEnd(i);
      return;
    }
    if (t.length > 1) {
      const o = t.every((i) => i.tagName === "PRE");
      t.forEach((i) => {
        i.tagName === "PRE" ? o && this._convertBlocksToTag([i], "p") : this._convertBlocksToTag([i], "pre");
      });
      return;
    }
    const n = this.wrapInlineIntoBlock(e, "pre");
    n && this._placeCaretAtEnd(n);
  }
  /**
   * Converts every given block element to the target tag, preserving the
   * block's class attribute. Blocks already using the tag are left alone.
   * @param {HTMLElement[]} blocks
   * @param {string} tag lowercase target tag name
   * @returns {HTMLElement|null} the last replacement element (or null)
   */
  _convertBlocksToTag(e, t) {
    let n = null;
    return e.forEach((o) => {
      if (o.tagName.toLowerCase() === t) return;
      const i = document.createElement(t), s = o.getAttribute("class");
      s && i.setAttribute("class", s), i.innerHTML = o.innerHTML || "<br>", o.replaceWith(i), n = i;
    }), n;
  }
  /**
   * Converts the caret's line inside `block` into a new element built by
   * `buildTarget`, splitting `block` into [prefix | target | suffix] and
   * re-placing the caret at the same character offset inside the target.
   * Returns null when the caret line spans the whole block — callers then
   * convert the whole block instead.
   * @param {HTMLElement} block
   * @param {Range} range collapsed caret range
   * @param {(fragment: DocumentFragment) => HTMLElement} buildTarget
   * @returns {HTMLElement|null}
   */
  _convertCaretLine(e, t, n) {
    const o = this._getLineWindow(e, t.startContainer, t.startOffset), { children: i, startIndex: s, endIndex: a } = o;
    if (s === 0 && a === i.length - 1) return null;
    const r = this._caretOffsetInLine(e, o, t.startContainer, t.startOffset), c = this._splitLineInto(e, o, n);
    return c && this._placeCaretAtTextOffset(c, r), c;
  }
  /**
   * Returns the child-index window describing the "line" of a caret point
   * inside a block: the maximal run of direct children between the nearest
   * <br>/block separators. Empty lines (endIndex < startIndex) are possible.
   * @param {HTMLElement} block
   * @param {Node} node caret container
   * @param {number} offset caret offset
   * @returns {{children: Node[], startIndex: number, endIndex: number}}
   */
  _getLineWindow(e, t, n) {
    const o = [...e.childNodes];
    let i;
    if (t === e)
      i = n;
    else {
      let r = t;
      for (; r && r.parentNode !== e; ) r = r.parentNode;
      r && r === t && r.nodeType === Node.ELEMENT_NODE && r.tagName === "BR" ? i = o.indexOf(r) + 1 : (i = r ? o.indexOf(r) : -1, i === -1 && (i = o.length));
    }
    let s = -1;
    for (let r = i - 1; r >= 0; r--)
      if (this._isLineSeparator(o[r])) {
        s = r;
        break;
      }
    let a = o.length;
    for (let r = i; r < o.length; r++)
      if (this._isLineSeparator(o[r])) {
        a = r;
        break;
      }
    return { children: o, startIndex: s + 1, endIndex: a - 1 };
  }
  /** Whether a node terminates a line inside a block (<br> or a block tag). */
  _isLineSeparator(e) {
    return e.nodeType === Node.ELEMENT_NODE && (e.tagName === "BR" || w.has(e.tagName));
  }
  /**
   * Character offset of (node, offset) from the start of the caret line, so
   * a later split can re-place the caret at the identical text position.
   * @param {HTMLElement} block
   * @param {{children: Node[], startIndex: number, endIndex: number}} window
   * @param {Node} node caret container
   * @param {number} offset caret offset
   * @returns {number}
   */
  _caretOffsetInLine(e, t, n, o) {
    var h, d, g;
    const { children: i, startIndex: s, endIndex: a } = t;
    let r = 0;
    for (let p = s; p <= a; p++)
      r += (((h = i[p]) == null ? void 0 : h.textContent) ?? "").length;
    let c = 0;
    if (n === e)
      for (let p = s; p < Math.min(o, a + 1); p++)
        c += (((d = i[p]) == null ? void 0 : d.textContent) ?? "").length;
    else {
      let p = n;
      for (; p && p.parentNode !== e; ) p = p.parentNode;
      const f = p ? i.indexOf(p) : -1;
      if (f !== -1 && f >= s && f <= a) {
        for (let v = s; v < f; v++)
          c += (((g = i[v]) == null ? void 0 : g.textContent) ?? "").length;
        c += this._textOffsetAt(p, n, o);
      } else f !== -1 && (c = r);
    }
    return Math.min(Math.max(c, 0), r);
  }
  /**
   * Number of text characters between the start of `scope` and the point
   * (target, offset) inside it, walking text nodes in document order.
   * Unlike Selection.offsetOf this handles element boundary points and
   * <br> children without throwing or mis-counting.
   * @param {Node} scope
   * @param {Node} target
   * @param {number} offset
   * @returns {number}
   */
  _textOffsetAt(e, t, n) {
    let o = 0;
    const i = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    let s;
    for (; s = i.nextNode(); ) {
      if (s === t) return o + n;
      if (t.nodeType === Node.TEXT_NODE) {
        if (s.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_PRECEDING) break;
        o += s.length;
      } else if (t.contains(s)) {
        let a = s, r = s.parentNode;
        for (; r && r !== t; )
          a = r, r = r.parentNode;
        if (r === t)
          if (Array.prototype.indexOf.call(t.childNodes, a) < n) o += s.length;
          else break;
      } else {
        if (s.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_PRECEDING) break;
        o += s.length;
      }
    }
    return o;
  }
  /**
   * Splits a block around a non-collapsed selection into
   * [prefix | target | suffix], converting the selected run into a fresh
   * element of `targetTag`. Sides keep the original block's tag and class.
   * @param {HTMLElement} block
   * @param {Range} range non-collapsed range inside block
   * @param {string} targetTag e.g. 'pre'
   * @returns {HTMLElement} the new target element
   */
  _splitBlockAtSelection(e, t, n) {
    const o = e.tagName.toLowerCase(), i = e.getAttribute("class"), s = () => {
      const v = document.createElement(o);
      return i && v.setAttribute("class", i), v;
    }, a = t.startContainer, r = t.startOffset, c = s(), h = document.createRange();
    h.setStart(e, 0), h.setEnd(a, r), c.appendChild(h.extractContents());
    const d = document.createElement(n), g = document.createRange();
    g.setStart(h.startContainer, h.startOffset), g.setEnd(t.endContainer, t.endOffset), d.appendChild(g.extractContents());
    const p = s();
    for (; e.firstChild; ) p.appendChild(e.firstChild);
    d.firstChild || (d.innerHTML = "<br>"), this._dropSeamBr(c, "end"), this._dropSeamBr(p, "start");
    const f = e.parentNode;
    return p.firstChild && f.insertBefore(p, e), f.insertBefore(d, e), c.firstChild && f.insertBefore(c, e), e.remove(), d;
  }
  /**
   * Splits the block around a (line) window into [left | target | right],
   * where `target` is built by `buildTarget` from the extracted line content.
   * Boundary <br>s at the seams are dropped when the side keeps content, so
   * a lone <br> (a real empty line) survives.
   * @param {HTMLElement} block
   * @param {{children: Node[], startIndex: number, endIndex: number}} window
   * @param {(fragment: DocumentFragment) => HTMLElement} buildTarget
   * @returns {HTMLElement|null}
   */
  _splitLineInto(e, t, n) {
    const { startIndex: o, endIndex: i } = t, s = e.tagName.toLowerCase(), a = e.getAttribute("class"), r = () => {
      const v = document.createElement(s);
      return a && v.setAttribute("class", a), v;
    }, c = document.createRange();
    c.setStart(e, o), c.setEnd(e, i + 1);
    const h = c.extractContents(), d = r();
    for (let v = 0; v < o; v++) d.appendChild(e.firstChild);
    const g = r();
    for (; e.firstChild; ) g.appendChild(e.firstChild);
    const p = n(h);
    if (!p) return null;
    const f = e.parentNode;
    return this._dropSeamBr(d, "end"), this._dropSeamBr(g, "start"), d.firstChild && f.insertBefore(d, e), f.insertBefore(p, e), g.firstChild && f.insertBefore(g, e), e.remove(), p;
  }
  /**
   * Drops the seam <br> of a split side (last child for end, first child for
   * start) — the break consumed by the block boundary — unless the side only
   * holds <br>s, in which case it represents a real empty line.
   * @param {HTMLElement} side
   * @param {'start'|'end'} which
   */
  _dropSeamBr(e, t) {
    const n = t === "end" ? e.lastChild : e.firstChild;
    if (!n || n.nodeType !== Node.ELEMENT_NODE || n.tagName !== "BR") return;
    [...e.childNodes].some(
      (i) => i !== n && !(i.nodeType === Node.ELEMENT_NODE && i.tagName === "BR")
    ) && n.remove();
  }
  /**
   * Wraps the current line (collapsed) or selection (non-collapsed) of
   * root-level inline content into a fresh single-item list.
   * @param {Range} range
   * @param {'ul'|'ol'} listTag
   * @returns {HTMLElement|null}
   */
  _wrapRangeIntoList(e, t) {
    const n = document.createElement(t), o = document.createElement("li");
    let i = e;
    if (e.collapsed)
      if (e.startContainer === this.root)
        o.innerHTML = "<br>";
      else {
        const a = this.getInlineLineRange(e);
        if (!a) return null;
        i = a;
      }
    const s = i.extractContents();
    if (s.firstChild ? o.appendChild(s) : o.firstChild || (o.innerHTML = "<br>"), n.appendChild(o), e.collapsed && e.startContainer === this.root) {
      const a = this.root.childNodes[e.startOffset] || null;
      this.root.insertBefore(n, a);
    } else
      i.insertNode(n);
    return n;
  }
  /** Collapses the selection at the end of an element. @param {HTMLElement} el */
  _placeCaretAtEnd(e) {
    const t = document.createRange();
    t.selectNodeContents(e), t.collapse(!1), this.selection.setRange(t);
  }
  /**
   * Collapses the selection to the given character offset within an element,
   * walking the element's text nodes in document order.
   * @param {HTMLElement} el
   * @param {number} offset
   */
  _placeCaretAtTextOffset(e, t) {
    let n = Math.max(t, 0);
    const o = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    let i;
    for (; i = o.nextNode(); ) {
      if (n <= i.length) {
        const a = document.createRange();
        a.setStart(i, n), a.collapse(!0), this.selection.setRange(a);
        return;
      }
      n -= i.length;
    }
    const s = document.createRange();
    s.selectNodeContents(e), s.collapse(!1), this.selection.setRange(s);
  }
}
const q = /* @__PURE__ */ new Set([
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
  "input",
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
]), W = {
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
  input: /* @__PURE__ */ new Set(["type", "checked", "disabled"]),
  ol: /* @__PURE__ */ new Set(["start", "type", "reversed", "class", "style"]),
  ul: /* @__PURE__ */ new Set(["class", "style"])
}, U = /* @__PURE__ */ new Set(["http:", "https:", "mailto:", "tel:", ""]);
class $ {
  /**
   * @param {object} [options]
   * @param {string[]} [options.allowedTags]
   * @param {Record<string, string[]>} [options.allowedAttributes]
   * @param {string[]} [options.allowedUrlSchemes]
   */
  constructor(e = {}) {
    this.allowedTags = e.allowedTags ? new Set(e.allowedTags) : q, this.allowedAttrs = e.allowedAttributes ? Object.fromEntries(Object.entries(e.allowedAttributes).map(([t, n]) => [t, new Set(n)])) : W, this.allowedSchemes = e.allowedUrlSchemes ? new Set(e.allowedUrlSchemes.map((t) => `${t}:`)) : U;
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
    if (!/&[a-z]+;|&#\d+;/i.test(e)) return e;
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
      ), s = i.tagName.toLowerCase();
      if (s === "script" || s === "style" || s === "noscript") {
        i.remove();
        continue;
      }
      if (this.cleanNode(i), !this.allowedTags.has(s)) {
        this.unwrap(i);
        continue;
      }
      this.cleanAttributes(i, s);
    }
  }
  /**
   * @param {HTMLElement} el
   * @param {string} tag
   */
  cleanAttributes(e, t) {
    const n = this.allowedAttrs["*"] ?? /* @__PURE__ */ new Set(), o = this.allowedAttrs[t] ?? /* @__PURE__ */ new Set();
    [...e.attributes].forEach((i) => {
      const s = i.name.toLowerCase();
      if (s.startsWith("on")) {
        e.removeAttribute(i.name);
        return;
      }
      if (!n.has(s) && !o.has(s)) {
        e.removeAttribute(i.name);
        return;
      }
      if ((s === "href" || s === "src") && !this.isSafeUrl(i.value) && e.removeAttribute(i.name), s === "style") {
        const a = this.cleanStyle(i.value);
        a ? e.setAttribute("style", a) : e.removeAttribute("style");
      }
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
    return e.split(";").map((t) => t.trim()).filter((t) => t.length > 0).filter((t) => !/expression\s*\(|javascript:/i.test(t)).filter((t) => !this.isThemeNeutralColor(t)).join(";");
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
  isThemeNeutralColor(e) {
    const t = /^([a-z-]+)\s*:\s*(.+)$/i.exec(e);
    if (!t) return !1;
    const n = t[1].toLowerCase(), o = M(t[2]);
    return n === "color" ? R.has(o) : n === "background-color" ? N.has(o) : n === "background" ? this.isSolidBalancedColor(o) && N.has(o) : !1;
  }
  /**
   * Reports whether a value is a single balanced `color(...)` expression —
   * i.e. the `background` shorthand contains nothing but a color. Gradient
   * or image backgrounds contain unbalanced parens/`url(` and are skipped.
   * @param {string} value
   * @returns {boolean}
   */
  isSolidBalancedColor(e) {
    if (/url\(/i.test(e)) return !1;
    let t = 0;
    for (const n of e)
      if (n === "(" && (t += 1), n === ")" && (t -= 1), t < 0) return !1;
    return t === 0;
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
const X = {
  theme: "auto",
  locale: "en",
  height: 420,
  history: { max_steps: 1e3, debounce_ms: 300 },
  autosave: { enabled: !1, interval_ms: 15e3, storage_key: "wysiwyg-editor-autosave" }
}, H = /* @__PURE__ */ new Map();
class x {
  /**
   * @param {HTMLTextAreaElement} textarea
   * @param {EditorOptions} options
   */
  constructor(e, t = {}) {
    var n, o;
    this.textarea = e, this.options = { ...X, ...t }, this.events = new A(), this.sanitizer = new $(this.options.sanitizer), this.plugins = /* @__PURE__ */ new Map(), this.buildDom(), this.selection = new I(this.root), this.commands = new F(this), this.history = new D({
      getContent: () => this.root.innerHTML,
      setContent: (i) => {
        this.root.innerHTML = i;
      },
      saveBookmark: () => this.saveSelectionBookmark(),
      restoreBookmark: (i) => this.restoreSelectionBookmark(i),
      maxSteps: ((n = this.options.history) == null ? void 0 : n.max_steps) ?? 1e3,
      debounceMs: ((o = this.options.history) == null ? void 0 : o.debounce_ms) ?? 300,
      onChange: (i) => this.events.emit(i)
    }), this.handleShortcut = this.handleShortcut.bind(this), this.handleTableTab = this.handleTableTab.bind(this), this.handleEnter = this.handleEnter.bind(this), this.handleBackspaceDelete = this.handleBackspaceDelete.bind(this), this.handleDragOver = this.handleDragOver.bind(this), this.handleDragLeave = this.handleDragLeave.bind(this), this.bindEvents(), this.applyTheme(this.options.theme), this._debouncedSyncTextarea = this._debounce(() => this.syncTextarea(), 300), this.loadPlugins().catch((i) => {
      console.error("WYSIWYG Editor: plugin loading failed", i);
    }), this.setupAutosave(), this.events.emit("init", this);
  }
  /** Builds the contenteditable root and hides the original textarea. */
  buildDom() {
    this.textarea.style.display = "none", this.wrapper = document.createElement("div"), this.wrapper.className = "ife-wrapper", this.wrapper.dataset.theme = this.options.theme, this.root = document.createElement("div"), this.root.className = "ife-content", this.root.contentEditable = "true", this.root.spellcheck = !0, this.root.style.minHeight = `${this.options.height}px`, this.root.style.maxHeight = `${this.options.height}px`, this.root.innerHTML = this.sanitizer.sanitize(this.textarea.value || "") || "<div><br></div>", this.root.setAttribute("role", "textbox"), this.root.setAttribute("aria-multiline", "true"), this.wrapper.appendChild(this.root), this.textarea.insertAdjacentElement("afterend", this.wrapper);
  }
  bindEvents() {
    this.root.addEventListener("input", () => {
      this.history.record(), this.emitChange();
    }), this.root.addEventListener("keyup", () => this.syncSelectionState()), this.root.addEventListener("mouseup", () => this.syncSelectionState()), this.root.addEventListener("focus", () => this.events.emit("focus", this)), this.root.addEventListener("blur", () => {
      this.syncTextarea(), this.events.emit("blur", this);
    }), this.root.addEventListener("paste", (e) => this.handlePaste(e)), this.root.addEventListener("drop", (e) => this.events.emit("drop", e)), this.root.addEventListener("dragover", (e) => this.handleDragOver(e)), this.root.addEventListener("dragleave", (e) => this.handleDragLeave(e)), document.addEventListener("keydown", this.handleShortcut), document.addEventListener("keydown", this.handleTableTab), document.addEventListener("keydown", this.handleEnter), document.addEventListener("keydown", this.handleBackspaceDelete), this.textarea.form && this.textarea.form.addEventListener("submit", () => this.syncTextarea());
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
    const s = document.createRange();
    s.setStart(o.node, Math.min(o.offset, (o.node.textContent || "").length)), s.setEnd(i.node, Math.min(i.offset, (i.node.textContent || "").length));
    const a = window.getSelection();
    a && (a.removeAllRanges(), a.addRange(s));
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
      clearTimeout(n), this._debounceTimer = n = setTimeout(() => e(...o), t);
    };
  }
  emitChange() {
    this._debouncedSyncTextarea(), this.events.emit("change", this.getHTML());
  }
  /** @param {ClipboardEvent} event */
  handlePaste(e) {
    var i, s;
    if (e.preventDefault(), this.destroyed) return;
    const t = (i = e.clipboardData) == null ? void 0 : i.getData("text/html"), n = ((s = e.clipboardData) == null ? void 0 : s.getData("text/plain")) ?? "";
    let o;
    t ? o = this.sanitizer.sanitize(t) : o = this.autoLink(this.escapeHtml(n)), this.commands.insertHTML(o), this.events.emit("paste", { html: t, text: n });
  }
  /** Converts URLs in plain text to clickable <a> links. */
  autoLink(e) {
    const t = (n) => n.replace(/&(?!(?:amp|lt|gt|quot|#\d+|#x[0-9a-f]+);)/gi, "&amp;").replace(/"/g, "&quot;");
    return e.replace(
      /(https?:\/\/[^\s<]+)/gi,
      (n) => {
        const o = t(n);
        return `<a href="${o}">${o}</a>`;
      }
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
      z: () => {
        e.shiftKey ? this.history.redo() : this.history.undo(), this.syncSelectionState();
      },
      y: () => {
        this.history.redo(), this.syncSelectionState();
      },
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
    const n = t.closest("blockquote"), o = t.tagName === "PRE" || !!t.closest("pre"), i = t.tagName === "DIV" && t.classList.contains("note"), s = this.selection.getRange();
    if (!s) return;
    if (!n && !o && !i) {
      let r = s.startContainer;
      if (r.nodeType === Node.TEXT_NODE && (r = r.parentElement), !(r instanceof HTMLElement) || !r.closest("code")) return;
    }
    if (e.preventDefault(), o) {
      if (!t.textContent.trim()) {
        const p = document.createElement("p");
        p.innerHTML = "<br>", t.parentNode.insertBefore(p, t.nextSibling), t.parentNode.removeChild(t);
        const f = document.createRange();
        f.setStart(p, 0), f.collapse(!0), this.selection.setRange(f), this.commit();
        return;
      }
      const { children: c, startIndex: h, endIndex: d } = this.commands._getLineWindow(
        t,
        s.startContainer,
        s.startOffset
      );
      c.slice(h, d + 1).map((p) => p.textContent ?? "").join("").trim() === "" ? this._exitPreFromEmptyLine(t, h - 1, d + 1) : this._insertBreakInPre(s), this.commit();
      return;
    }
    if (n) {
      if (!t.textContent.trim()) {
        const f = document.createElement("p");
        f.innerHTML = "<br>", n.parentNode.insertBefore(f, n.nextSibling), t.parentNode.removeChild(t), !n.textContent.trim() && !n.children.length && n.parentNode.removeChild(n);
        const v = document.createRange();
        v.setStart(f, 0), v.collapse(!0), this.selection.setRange(v), this.commit();
        return;
      }
      const c = document.createElement("p"), { startContainer: h, startOffset: d } = s;
      if (h.nodeType === Node.TEXT_NODE && t.contains(h)) {
        const f = h.textContent, v = f.slice(0, d), b = f.slice(d);
        h.textContent = v, b && (c.textContent = b);
      }
      c.textContent || (c.innerHTML = "<br>"), t.parentNode.insertBefore(c, t.nextSibling);
      const g = document.createRange(), p = c.firstChild || c;
      g.setStart(p, 0), g.collapse(!0), this.selection.setRange(g), this.commit();
      return;
    }
    if (i) {
      if (!t.textContent.trim()) {
        const f = document.createElement("p");
        f.innerHTML = "<br>", t.parentNode.insertBefore(f, t.nextSibling), t.parentNode.removeChild(t);
        const v = document.createRange();
        v.setStart(f, 0), v.collapse(!0), this.selection.setRange(v), this.commit();
        return;
      }
      const c = document.createElement("p"), { startContainer: h, startOffset: d } = s;
      if (h.nodeType === Node.TEXT_NODE && t.contains(h)) {
        const f = h.textContent, v = f.slice(0, d), b = f.slice(d);
        h.textContent = v, b && (c.textContent = b);
      }
      c.textContent || (c.innerHTML = "<br>"), t.parentNode.insertBefore(c, t.nextSibling);
      const g = document.createRange(), p = c.firstChild || c;
      g.setStart(p, 0), g.collapse(!0), this.selection.setRange(g), this.commit();
      return;
    }
    const a = (() => {
      let r = s.startContainer;
      return r.nodeType === Node.TEXT_NODE && (r = r.parentElement), r instanceof HTMLElement ? r.closest("code") : null;
    })();
    if (a) {
      const { startContainer: r, startOffset: c } = s;
      if (r.nodeType === Node.TEXT_NODE && t.contains(r)) {
        const h = r.textContent, d = h.slice(0, c), g = h.slice(c);
        r.textContent = d;
        const p = document.createElement("p");
        if (g ? p.textContent = g : p.innerHTML = "<br>", t.parentNode.insertBefore(p, t.nextSibling), !a.textContent.trim()) {
          const b = a.parentNode, O = document.createTextNode("");
          b.replaceChild(O, a);
        }
        const f = document.createRange(), v = p.firstChild || p;
        f.setStart(v, 0), f.collapse(!0), this.selection.setRange(f);
      } else {
        const h = document.createElement("p");
        h.innerHTML = "<br>", t.parentNode.insertBefore(h, t.nextSibling);
        const d = document.createRange();
        d.setStart(h, 0), d.collapse(!0), this.selection.setRange(d);
      }
      this.commit();
    }
  }
  /** Records a history snapshot and notifies listeners after a mutation */
  commit() {
    this.history.push(), this.emitChange();
  }
  _insertBreakInPre(e) {
    const { startContainer: t, startOffset: n } = e, o = document.createElement("br");
    if (t.nodeType === Node.TEXT_NODE) {
      const a = t.textContent, r = a.slice(0, n), c = a.slice(n);
      if (t.textContent = r, t.parentNode.insertBefore(o, t.nextSibling), c) {
        const h = document.createTextNode(c);
        t.parentNode.insertBefore(h, o.nextSibling);
      }
    } else if (t.tagName === "BR")
      t.parentNode.insertBefore(o, t.nextSibling);
    else {
      const a = t.childNodes[n] || null;
      t.insertBefore(o, a);
    }
    const i = this.commands.closestPre(o);
    if (i && o.parentNode !== i) {
      let a = o;
      for (; a.parentNode && a.parentNode !== i; ) a = a.parentNode;
      i.insertBefore(o, a.nextSibling);
    }
    const s = document.createRange();
    s.setStartAfter(o), s.collapse(!0), this.selection.setRange(s);
  }
  /**
   * Exits a code block from an empty line: splits the <pre> around the empty
   * line into [<pre>left</pre> <p><br></p> <pre>right</pre>] and places the
   * caret in the new paragraph. The seam <br>s consumed by the split are
   * dropped when the side keeps other content (a lone <br> is a real empty
   * line and is preserved).
   * @param {HTMLElement} pre the code block
   * @param {number} lo index in pre.childNodes of the separator before the empty line
   * @param {number} hi index in pre.childNodes of the separator after the empty line
   */
  _exitPreFromEmptyLine(e, t, n) {
    const o = [...e.childNodes], i = () => {
      const d = document.createElement("pre"), g = e.getAttribute("class");
      return g && d.setAttribute("class", g), d;
    }, s = i();
    for (let d = 0; d <= t; d++) s.appendChild(o[d]);
    const a = i();
    for (let d = n; d < o.length; d++) a.appendChild(o[d]);
    this.commands._dropSeamBr(s, "end"), this.commands._dropSeamBr(a, "start");
    const r = document.createElement("p");
    r.innerHTML = "<br>";
    const c = e.parentNode;
    s.firstChild && c.insertBefore(s, e), c.insertBefore(r, e), a.firstChild && c.insertBefore(a, e), e.remove();
    const h = document.createRange();
    h.setStart(r, 0), h.collapse(!0), this.selection.setRange(h);
  }
  /**
   * Keydown handler for Backspace/Delete inside a code block. Native
   * contenteditable handles editing fine in most browsers, but an empty
   * <pre> (the placeholder a code block leaves behind once its content is
   * gone) can get stuck: Chrome does not remove an empty <pre> on Backspace
   * the way it removes an empty <p>. Removing it manually lets the user
   * actually delete a code block.
   * @param {KeyboardEvent} event
   */
  handleBackspaceDelete(e) {
    if (e.key !== "Backspace" && e.key !== "Delete" || this.destroyed || !this.root.contains(document.activeElement)) return;
    const t = this.selection.getRange();
    if (!t || !t.collapsed) return;
    const n = this.commands.closestPre(t.startContainer);
    if (!n || n.textContent.trim() !== "") return;
    const o = this._isAtBlockStart(n, t), i = this._isAtBlockEnd(n, t);
    !(e.key === "Backspace" && o) && !(e.key === "Delete" && i) || (e.preventDefault(), this._removeEmptyPre(n, e.key === "Backspace"), this.commit(), this.syncSelectionState());
  }
  /** Whether a collapsed range sits at the very start of an element. */
  _isAtBlockStart(e, t) {
    const n = document.createRange();
    return n.setStart(e, 0), n.setEnd(t.startContainer, t.startOffset), n.toString() === "";
  }
  /** Whether a collapsed range sits at the very end of an element. */
  _isAtBlockEnd(e, t) {
    const n = document.createRange();
    return n.setStart(t.startContainer, t.startOffset), n.setEnd(e, e.childNodes.length), n.toString() === "";
  }
  /**
   * Removes an empty code block and moves the caret to the neighboring
   * block — the end of the previous one after Backspace, the start of the
   * next one after Delete (mirroring native empty-paragraph removal).
   * @param {HTMLElement} pre
   * @param {boolean} isBackspace
   */
  _removeEmptyPre(e, t) {
    const n = e.previousElementSibling, o = e.nextElementSibling;
    e.remove();
    const i = document.createRange(), s = t ? n ?? o : o ?? n;
    s && s !== this.root ? t ? (i.selectNodeContents(s), i.collapse(!1)) : (i.setStart(s, 0), i.collapse(!0)) : (i.selectNodeContents(this.root), i.collapse(!1)), this.selection.setRange(i);
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
    H.forEach((n, o) => {
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
    this.history.undo(), this.syncSelectionState(), this.emitChange();
  }
  redo() {
    this.history.redo(), this.syncSelectionState(), this.emitChange();
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
    }), this.events.emit("destroy", this), clearInterval(this.autosaveTimer), clearTimeout(this._debounceTimer), document.removeEventListener("keydown", this.handleShortcut), document.removeEventListener("keydown", this.handleTableTab), document.removeEventListener("keydown", this.handleEnter), document.removeEventListener("keydown", this.handleBackspaceDelete), this.root.removeEventListener("dragover", this.handleDragOver), this.root.removeEventListener("dragleave", this.handleDragLeave), this.history.destroy(), this.wrapper.remove(), this.textarea.style.display = "", this.events.destroy());
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
    H.set(e, t);
  }
}
const u = (l) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">${l}</svg>`, m = {
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
  listProps: u('<path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>'),
  paragraph: u('<path d="M13 4v16h-2V4H7v16c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V4h-4z"/>')
};
class j {
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
  constructor(e, { title: t, bodyHtml: n, confirmLabel: o = "OK", cancelLabel: i = "Cancel", onConfirm: s, onClose: a }) {
    _(this, "handleEscape", (e) => {
      e.key === "Escape" && this.close();
    });
    this.container = e, this.onConfirm = s, this.onClose = a, this.overlay = document.createElement("div"), this.overlay.className = "ife-dialog-overlay", this.overlay.innerHTML = `
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
        `, this.form = this.overlay.querySelector("form"), this.overlay.querySelectorAll("button, input, select, textarea").forEach((r) => {
      r.addEventListener("click", (c) => c.stopPropagation()), r.addEventListener("keydown", (c) => {
        c.key !== "Escape" && c.stopPropagation();
      });
    }), this.overlay.querySelectorAll("button").forEach((r) => {
      r.addEventListener("mousedown", (c) => c.preventDefault());
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
    const n = this.form.querySelector("input, textarea, select");
    n == null || n.focus({ preventScroll: !0 });
  }
  close() {
    document.body.style.overflow = "", document.body.style.paddingRight = "", this.scrollPos && window.scrollTo(this.scrollPos.x, this.scrollPos.y), this.container.scrollTop = this.containerScrollTop ?? 0, document.removeEventListener("keydown", this.handleEscape), this.overlay.remove(), this.onClose && this.onClose();
  }
}
const K = {
  blockFormat: {
    icon: m.paragraph,
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
    onChange: (l, e) => {
      l.commands.exec("formatBlock", e);
    }
  },
  undo: { icon: m.undo, label: "Undo", shortcut: "Ctrl+Z", type: "action", action: (l) => l.undo() },
  redo: { icon: m.redo, label: "Redo", shortcut: "Ctrl+Y", type: "action", action: (l) => l.redo() },
  bold: { icon: m.bold, label: "Bold", shortcut: "Ctrl+B", type: "command", command: "bold" },
  italic: { icon: m.italic, label: "Italic", shortcut: "Ctrl+I", type: "command", command: "italic" },
  underline: { icon: m.underline, label: "Underline", shortcut: "Ctrl+U", type: "command", command: "underline" },
  strike: { icon: m.strikeThrough, label: "Strikethrough", type: "command", command: "strikeThrough" },
  superscript: { icon: m.superscript, label: "Superscript", type: "command", command: "superscript" },
  subscript: { icon: m.subscript, label: "Subscript", type: "command", command: "subscript" },
  forecolor: { icon: m.formatColorText, label: "Text color", type: "color", command: "foreColor" },
  backcolor: { icon: m.formatColorFill, label: "Background color", type: "color", command: "backColor" },
  removeFormat: {
    icon: m.clearFormat,
    label: "Clear formatting",
    type: "command",
    command: "removeFormat"
  },
  alignLeft: { icon: m.alignLeft, label: "Align left", type: "command", command: "justifyLeft" },
  alignCenter: { icon: m.alignCenter, label: "Align center", type: "command", command: "justifyCenter" },
  alignRight: { icon: m.alignRight, label: "Align right", type: "command", command: "justifyRight" },
  alignJustify: { icon: m.alignJustify, label: "Justify", type: "command", command: "justifyFull" },
  bulletList: { icon: m.listBulleted, label: "Bulleted list", type: "command", command: "insertUnorderedList" },
  orderedList: { icon: m.listNumbered, label: "Numbered list", type: "command", command: "insertOrderedList" },
  checklist: {
    icon: m.checklist,
    label: "Checklist",
    type: "action",
    action: (l) => l.commands.insertHTML('<ul class="ife-checklist"><li><input type="checkbox"> Item</li></ul>')
  },
  indent: { icon: m.indent, label: "Increase indent", type: "command", command: "indent" },
  outdent: { icon: m.outdent, label: "Decrease indent", type: "command", command: "outdent" },
  link: { icon: m.link, label: "Insert/edit link", shortcut: "Ctrl+K", type: "action", action: (l) => l.module("link").open() },
  unlink: {
    icon: m.unlink,
    label: "Remove link",
    type: "action",
    action: (l) => {
      const e = l.selection.closest("a");
      e && l.module("link").remove(e);
    }
  },
  image: { icon: m.image, label: "Insert image", type: "action", action: (l) => l.module("image").open() },
  video: { icon: m.videocam, label: "Insert video", type: "action", action: (l) => l.module("media").openVideo() },
  audio: { icon: m.audiotrack, label: "Insert audio", type: "action", action: (l) => l.module("media").openAudio() },
  table: { icon: m.table, label: "Insert table", type: "action", action: (l) => l.module("table").openInsertDialog() },
  hr: { icon: m.hr, label: "Horizontal rule", type: "action", action: (l) => l.module("media").insertHorizontalRule() },
  blockquote: { icon: m.blockquote, label: "Blockquote", type: "action", action: (l) => {
    const e = l.selection.getBlockElement();
    if (!e || e === l.root) return;
    if (e.tagName === "BLOCKQUOTE" || e.closest("blockquote")) {
      const n = e.tagName === "BLOCKQUOTE" ? e : e.closest("blockquote"), o = document.createElement("p");
      o.innerHTML = n.innerHTML, n.replaceWith(o);
    } else {
      const n = document.createElement("blockquote");
      n.innerHTML = e.outerHTML, e.replaceWith(n);
    }
    l.history.push(), l.emitChange();
  } },
  codeInline: {
    icon: m.code,
    label: "Inline code",
    type: "action",
    action: (l) => {
      l.selection.wrap("code") && (l.history.push(), l.emitChange());
    }
  },
  codeBlock: { icon: m.codeBlock, label: "Code block", type: "command", command: "codeBlock" },
  note: { icon: m.note, label: "Insert note", type: "action", action: (l) => l.module("note").open() },
  emoji: {
    icon: m.emoji,
    label: "Emoji",
    type: "action",
    action: (l, e) => l.module("emoji").open(e)
  },
  specialChars: {
    icon: m.specialChars,
    label: "Special characters",
    type: "action",
    action: (l) => l.commands.insertHTML("&amp;copy;")
  },
  find: { icon: m.find, label: "Find & Replace", shortcut: "Ctrl+F", type: "action", action: (l) => l.module("find").open() },
  sourceCode: {
    icon: m.sourceCode,
    label: "Source code",
    type: "action",
    toggle: !0,
    action: (l) => l.module("codeView").toggle()
  },
  fullscreen: {
    icon: m.fullscreen,
    label: "Fullscreen",
    type: "action",
    toggle: !0,
    action: (l) => l.module("fullscreen").toggle()
  },
  ltr: {
    icon: m.ltr,
    label: "Left-to-right",
    type: "action",
    toggle: !0,
    action: (l) => l.commands.exec("direction", "ltr")
  },
  rtl: {
    icon: m.rtl,
    label: "Right-to-left",
    type: "action",
    toggle: !0,
    action: (l) => l.commands.exec("direction", "rtl")
  },
  markdown: {
    icon: m.markdown,
    label: "Markdown",
    type: "action",
    toggle: !0,
    action: (l) => {
      const e = l.module("markdown");
      if (e)
        if (l.root.dataset.markdownMode === "true") {
          l.root.dataset.markdownMode = "false";
          const t = l.getHTML(), n = e.htmlToMarkdown(t);
          l.setHTML(e.markdownToHtml(n));
        } else
          l._mdSource = e.export(), e.import(l._mdSource), l.root.dataset.markdownMode = "true";
    }
  },
  date: {
    icon: m.date,
    label: "Insert date",
    type: "action",
    action: (l) => {
      const t = (/* @__PURE__ */ new Date()).toLocaleDateString(l.options.locale ?? "en", { year: "numeric", month: "long", day: "numeric" });
      l.commands.insertHTML(t);
    }
  },
  time: {
    icon: m.time,
    label: "Insert time",
    type: "action",
    action: (l) => {
      const t = (/* @__PURE__ */ new Date()).toLocaleTimeString(l.options.locale ?? "en", { hour: "2-digit", minute: "2-digit" });
      l.commands.insertHTML(t);
    }
  },
  anchor: {
    icon: m.anchor,
    label: "Insert anchor",
    type: "action",
    action: (l) => {
      const e = prompt("Anchor name:");
      if (!e) return;
      const t = document.createElement("a");
      t.name = e.trim();
      const n = l.selection.getRange();
      n && (n.deleteContents(), n.insertNode(t), l.history.push(), l.emitChange());
    }
  },
  templates: {
    icon: m.template,
    label: "Content templates",
    type: "action",
    action: (l) => {
      var e;
      return (e = l.module("templates")) == null ? void 0 : e.open();
    }
  },
  listProps: {
    icon: m.listProps,
    label: "List properties",
    type: "action",
    action: (l) => {
      const e = l.selection.closest("li"), t = e == null ? void 0 : e.closest("ol, ul");
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
            `, s = new j(l.wrapper, {
        title: "List properties",
        bodyHtml: i,
        confirmLabel: "Apply",
        onConfirm: (a) => {
          const r = new FormData(a), c = r.get("start"), h = r.get("type");
          c ? t.setAttribute("start", String(c)) : t.removeAttribute("start"), h ? t.style.listStyleType = h : t.style.listStyleType = "", l.history.push(), l.emitChange();
        }
      });
      l.selection.save(), s.open();
    }
  }
}, G = {
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
}, J = {
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
}, Y = {
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
}, C = /* @__PURE__ */ new Map([
  ["en", G],
  ["uk", J],
  ["ru", Y]
]), y = {
  /**
   * @param {string} code
   * @param {Record<string, string>} strings
   */
  register(l, e) {
    C.set(l, e);
  },
  /**
   * @param {string} locale
   * @param {string} key
   * @returns {string}
   */
  t(l, e) {
    return (C.get(l) ?? C.get("en"))[e] ?? C.get("en")[e] ?? e;
  },
  available() {
    return [...C.keys()];
  }
}, Q = [
  "#000000",
  "#444444",
  "#777777",
  "#aaaaaa",
  "#cccccc",
  "#eeeeee",
  "#ffffff",
  "#b71c1c",
  "#e53935",
  "#ff7043",
  "#fdd835",
  "#fbc02d",
  "#ffea00",
  "#1b5e20",
  "#43a047",
  "#8bc34a",
  "#00695c",
  "#26a69a",
  "#4dd0e1",
  "#0d47a1",
  "#1e88e5",
  "#64b5f6",
  "#4a148c",
  "#7b1fa2",
  "#ba68c8",
  "#880e4f",
  "#d81b60",
  "#f06292",
  "#4e342e",
  "#795548",
  "#a1887f"
];
function k(l, e, t) {
  return Math.max(e, Math.min(t, l));
}
function L(l) {
  const e = /^#([0-9a-f]{6})$/i.exec((l || "").trim());
  if (!e) return [0, 0, 0];
  const t = parseInt(e[1].slice(0, 2), 16) / 255, n = parseInt(e[1].slice(2, 4), 16) / 255, o = parseInt(e[1].slice(4, 6), 16) / 255, i = Math.max(t, n, o), s = Math.min(t, n, o), a = i - s, r = i;
  let c = 0, h = 0;
  return a !== 0 && (h = a / i, i === t ? c = (n - o) / a + (n < o ? 6 : 0) : i === n ? c = (o - t) / a + 2 : c = (t - n) / a + 4), [Math.round(c * 60), Math.round(h * 100), Math.round(r * 100)];
}
function T(l, e, t) {
  l = (l % 360 + 360) % 360, e = k(e, 0, 100) / 100, t = k(t, 0, 100) / 100;
  const n = t * e, o = n * (1 - Math.abs(l / 60 % 2 - 1)), i = t - n;
  let s = 0, a = 0, r = 0;
  l < 60 ? (s = n, a = o) : l < 120 ? (s = o, a = n) : l < 180 ? (a = n, r = o) : l < 240 ? (a = o, r = n) : l < 300 ? (s = o, r = n) : (s = n, r = o);
  const c = (h) => Math.round((h + i) * 255).toString(16).padStart(2, "0");
  return `#${c(s)}${c(a)}${c(r)}`;
}
class Z {
  /**
   * @param {import('../core/Editor').default} editor
   * @param {HTMLElement} triggerEl toolbar button that opens this picker
   * @param {ColorPickerOptions} options
   */
  constructor(e, t, n) {
    this.editor = e, this.triggerEl = t, this.id = n.id, this.cssProp = n.cssProp, this.label = n.label, this.onChange = n.onChange, this.onClear = n.onClear, this.picker = null, this.hue = 0, this.sat = 100, this.value = 100, this._squareDrag = !1, this._hueDrag = !1, this._boundOnResize = null, this._boundOnScroll = null, this._boundOnClickOutside = null, this._boundKeydown = null, this._boundPointerMove = null, this._boundPointerUp = null;
  }
  toggle() {
    this.picker ? this.close() : this.open();
  }
  open() {
    if (this.picker) return;
    this.editor.selection.save(), this.editor.wrapper.classList.add("ife-color-picking");
    const e = this.getCurrentColor(), [t, n, o] = e ? L(e) : [0, 0, 0];
    this.hue = t, this.sat = n, this.value = o, this.picker = document.createElement("div"), this.picker.className = "ife-color-picker", this.picker.setAttribute("role", "dialog"), this.picker.setAttribute("aria-label", this.label), this.buildPickerBody();
    const i = this.editor.wrapper;
    ["--ife-bg", "--ife-text", "--ife-border", "--ife-btn-hover", "--ife-btn-active"].forEach((s) => {
      this.picker.style.setProperty(s, getComputedStyle(i).getPropertyValue(s));
    }), document.body.appendChild(this.picker), this.positionPicker(), this._boundOnResize = () => this.positionPicker(), this._boundOnScroll = () => {
      this.picker && this.positionPicker();
    }, this._boundOnClickOutside = (s) => {
      this.picker && (this.picker.contains(s.target) || this.triggerEl && this.triggerEl.contains(s.target) || this.close());
    }, this._boundKeydown = (s) => {
      s.key === "Escape" && this.close();
    }, window.addEventListener("resize", this._boundOnResize), window.addEventListener("scroll", this._boundOnScroll, { passive: !0 }), document.addEventListener("click", this._boundOnClickOutside), document.addEventListener("keydown", this._boundKeydown), this.render();
  }
  buildPickerBody() {
    const e = document.createElement("div");
    e.className = "ife-color-picker__hue", e.setAttribute("aria-label", "Hue");
    const t = document.createElement("div");
    t.className = "ife-color-picker__square", t.setAttribute("aria-label", "Saturation and brightness");
    const n = document.createElement("div");
    n.className = "ife-color-picker__controls";
    const o = document.createElement("div");
    o.className = "ife-color-picker__field";
    const i = document.createElement("span");
    i.className = "ife-color-picker__field-label", i.textContent = this.label;
    const s = document.createElement("input");
    s.type = "text", s.className = "ife-color-picker__hex", s.value = T(this.hue, this.sat, this.value), s.setAttribute("aria-label", `${this.label} hex`), s.addEventListener("input", () => {
      const h = /^#?([0-9a-f]{6})$/i.exec(s.value.trim());
      if (!h) return;
      const [d, g, p] = L(`#${h[1]}`);
      this.hue = d, this.sat = g, this.value = p, this.render(), this.emit();
    }), s.addEventListener("mousedown", (h) => h.stopPropagation());
    const a = document.createElement("span");
    a.className = "ife-color-picker__preview", a.setAttribute("aria-hidden", "true");
    const r = document.createElement("button");
    r.type = "button", r.className = "ife-color-picker__clear", r.textContent = "✕", r.title = "Clear colour", r.setAttribute("aria-label", "Clear colour"), r.addEventListener("mousedown", (h) => h.preventDefault()), r.addEventListener("click", () => {
      this.onClear && this.onClear(), this.close();
    }), o.appendChild(i), o.appendChild(s), o.appendChild(a), o.appendChild(r);
    const c = document.createElement("div");
    c.className = "ife-color-picker__swatches", c.setAttribute("role", "group"), c.setAttribute("aria-label", "Preset colours"), Q.forEach((h) => {
      const d = document.createElement("button");
      d.type = "button", d.className = "ife-color-picker__swatch", d.style.backgroundColor = h, d.title = h, d.setAttribute("aria-label", h), d.setAttribute("data-color", h), d.addEventListener("mousedown", (g) => g.preventDefault()), d.addEventListener("click", () => {
        const [g, p, f] = L(h);
        this.hue = g, this.sat = p, this.value = f, this.render(), this.emit(h);
      }), c.appendChild(d);
    }), n.appendChild(e), n.appendChild(t), n.appendChild(o), n.appendChild(c), this.picker.appendChild(n), this.square = t, this.hueEl = e, this.hexEl = s, this.previewEl = a, this.square.addEventListener("pointerdown", (h) => this.onSquareDown(h)), this.hueEl.addEventListener("pointerdown", (h) => this.onHueDown(h)), this._boundPointerMove = (h) => this.onPointerMove(h), this._boundPointerUp = () => {
      this._squareDrag = !1, this._hueDrag = !1;
    }, document.addEventListener("pointermove", this._boundPointerMove), document.addEventListener("pointerup", this._boundPointerUp), this.picker.addEventListener("mousedown", (h) => {
      h.target.closest("input") || h.preventDefault();
    });
  }
  render() {
    if (!this.picker) return;
    const e = T(this.hue, this.sat, this.value);
    this.square.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${this.hue}, 100%, 50%))`;
    const t = this.square.querySelector(".ife-color-picker__square-handle") || (() => {
      const o = document.createElement("span");
      return o.className = "ife-color-picker__square-handle", this.square.appendChild(o), o;
    })();
    t.style.left = `${this.sat}%`, t.style.top = `${100 - this.value}%`, this.hueEl.style.background = "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)";
    const n = this.hueEl.querySelector(".ife-color-picker__hue-handle") || (() => {
      const o = document.createElement("span");
      return o.className = "ife-color-picker__hue-handle", this.hueEl.appendChild(o), o;
    })();
    n.style.left = `${this.hue / 360 * 100}%`, this.hexEl.value = e, this.previewEl.style.backgroundColor = e;
  }
  emit(e) {
    const t = e || T(this.hue, this.sat, this.value);
    this.hexEl.value = t, this.previewEl.style.backgroundColor = t, this.onChange && this.onChange(t);
  }
  onSquareDown(e) {
    e.preventDefault(), this._squareDrag = !0, this._squareFromPointer(e);
  }
  onHueDown(e) {
    e.preventDefault(), this._hueDrag = !0, this._hueFromPointer(e);
  }
  onPointerMove(e) {
    this._squareDrag && this._squareFromPointer(e), this._hueDrag && this._hueFromPointer(e);
  }
  _squareFromPointer(e) {
    const t = this.square.getBoundingClientRect(), n = k((e.clientX - t.left) / t.width, 0, 1) * 100, o = k((e.clientY - t.top) / t.height, 0, 1) * 100;
    this.sat = Math.round(n), this.value = Math.round(100 - o), this.render(), this.emit();
  }
  _hueFromPointer(e) {
    const t = this.hueEl.getBoundingClientRect(), n = k((e.clientX - t.left) / t.width, 0, 1);
    this.hue = Math.round(n * 360), this.render(), this.emit();
  }
  getCurrentColor() {
    var o;
    const e = this.editor.selection.getRange();
    if (!e) return "";
    let t = e.commonAncestorContainer;
    t.nodeType === Node.TEXT_NODE && (t = t.parentElement);
    let n = t instanceof HTMLElement ? t : null;
    for (; n && n !== this.editor.root; ) {
      if ((o = n.style) != null && o[this.cssProp]) {
        const i = n.style[this.cssProp], s = /^#([0-9a-f]{6})$/i.exec(i);
        if (s) return `#${s[1].toLowerCase()}`;
        const a = i.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (a) {
          const r = (c) => parseInt(c, 10).toString(16).padStart(2, "0");
          return `#${r(a[1])}${r(a[2])}${r(a[3])}`;
        }
      }
      n = n.parentElement;
    }
    return "";
  }
  positionPicker() {
    if (!this.triggerEl || !this.picker) return;
    const e = this.triggerEl.getBoundingClientRect(), t = this.picker.offsetWidth, n = this.picker.offsetHeight;
    let o = e.bottom + 4, i = e.left;
    o + n > window.innerHeight && e.top - n - 4 > 0 && (o = e.top - n - 4), i + t > window.innerWidth && (i = Math.max(8, window.innerWidth - t - 8)), i < 0 && (i = 8);
    const s = parseFloat(getComputedStyle(this.editor.wrapper).zIndex);
    isNaN(s) || (this.picker.style.zIndex = s + 1), this.picker.style.top = `${o}px`, this.picker.style.left = `${i}px`;
  }
  close() {
    this.picker && (this.picker.remove(), this.picker = null), this.editor.wrapper.classList.remove("ife-color-picking"), this._boundOnResize && window.removeEventListener("resize", this._boundOnResize), this._boundOnScroll && window.removeEventListener("scroll", this._boundOnScroll), this._boundOnClickOutside && document.removeEventListener("click", this._boundOnClickOutside), this._boundKeydown && document.removeEventListener("keydown", this._boundKeydown), this._boundPointerMove && document.removeEventListener("pointermove", this._boundPointerMove), this._boundPointerUp && document.removeEventListener("pointerup", this._boundPointerUp), this._boundOnResize = null, this._boundOnScroll = null, this._boundOnClickOutside = null, this._boundKeydown = null, this._boundPointerMove = null, this._boundPointerUp = null;
  }
  destroy() {
    this.close();
  }
}
const ee = [
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
class te {
  /**
   * @param {import('../core/Editor').default} editor
   * @param {Array<string[]>|null} [layout]
   */
  constructor(e, t = null) {
    this.editor = e, this.layout = t ?? ee, this.buttons = /* @__PURE__ */ new Map(), this._colorPickers = /* @__PURE__ */ new Map(), this.el = document.createElement("div"), this.el.className = "ife-toolbar", this.el.setAttribute("role", "toolbar"), this.el.setAttribute("aria-label", "Text formatting"), this.render(), this.editor.wrapper.insertBefore(this.el, this.editor.root), this.editor.on("selectionchange", () => this.syncActiveStates()), this.editor.on("focus", () => this.syncActiveStates()), this._liveColor = null, this._liveTimer = null, this._liveIdleTimer = null, this._liveLastSelection = "", this._handleLiveSelection = () => {
      if (!this._liveColor) return;
      const n = this.editor.selection.getNativeSelection();
      if (!n || n.rangeCount === 0 || n.isCollapsed) return;
      const o = n.getRangeAt(0);
      if (!this.editor.root.contains(o.commonAncestorContainer)) return;
      const i = n.toString();
      i.trim() && (i !== this._liveLastSelection && (clearTimeout(this._liveTimer), this._liveTimer = setTimeout(() => {
        this._liveLastSelection = i;
        const { command: s, value: a } = this._liveColor;
        this.editor.selection.save(), this.editor.commands.exec(s, a);
      }, 40)), clearTimeout(this._liveIdleTimer), this._liveIdleTimer = setTimeout(() => this.disarmLiveColor(), 1500));
    }, document.addEventListener("selectionchange", this._handleLiveSelection), document.addEventListener("mouseup", this._handleLiveSelection), this.el.addEventListener("mousedown", () => {
      this.editor.selection.save();
    }, !0);
  }
  render() {
    this.layout.forEach((e) => {
      const t = document.createElement("div");
      t.className = "ife-toolbar__group", e.forEach((n) => {
        const o = K[n];
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
      const s = t.shortcut.replace(/Ctrl/g, "⌘");
      o += ` (${t.shortcut} / ${s})`;
    }
    const i = document.createElement("button");
    return i.type = "button", i.className = "ife-toolbar__btn", i.dataset.command = e, i.title = o, i.setAttribute("aria-label", o), i.innerHTML = t.icon ?? "", i.addEventListener("mousedown", (s) => s.preventDefault()), i.addEventListener("click", () => {
      var s;
      this.editor.selection.restore(), t.type === "command" ? this.editor.commands.exec(t.command) : (s = t.action) == null || s.call(t, this.editor, i), t.toggle && i.classList.toggle("is-active"), this.syncActiveStates();
    }), this.buttons.set(e, i), i;
  }
  buildSelect(e, t) {
    const n = this.editor.options.locale ?? "en", o = document.createElement("select");
    return o.className = "ife-toolbar__select", o.setAttribute("aria-label", y.t(n, e) !== e ? y.t(n, e) : t.label), t.options.forEach(([i, s]) => {
      const a = document.createElement("option");
      a.value = i, a.textContent = s, o.appendChild(a);
    }), o.addEventListener("pointerdown", () => {
      this.editor.selection.save();
    }), o.addEventListener("mousedown", () => {
      this.editor.selection.save();
    }), o.addEventListener("change", () => {
      const i = o.value;
      this.editor.selection.restore(), t.onChange(this.editor, i), this.syncActiveStates();
    }), this.buttons.set(e, o), o;
  }
  buildColorPicker(e, t) {
    const n = this.editor.options.locale ?? "en", o = y.t(n, e) !== e ? y.t(n, e) : t.label, i = document.createElement("button");
    i.type = "button", i.className = "ife-toolbar__btn ife-toolbar__color", i.dataset.command = e, i.title = o, i.setAttribute("aria-label", o), i.setAttribute("aria-haspopup", "dialog"), i.innerHTML = t.icon;
    const s = t.command === "backColor" ? "backgroundColor" : "color", a = new Z(this.editor, i, {
      id: e,
      cssProp: s,
      label: o,
      onChange: (r) => {
        this.editor.selection.restoreSavedOffsets(), this.editor.commands.applyColor(s, r), this.armLiveColor({ command: t.command, value: r });
      },
      onClear: () => {
        this.editor.selection.restoreSavedOffsets(), this.editor.commands.clearColor(s), this.disarmLiveColor();
      }
    });
    return this._colorPickers.set(e, a), i.addEventListener("click", () => {
      this.editor.selection.save(), a.toggle();
    }), this.buttons.set(e, i), i;
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
      orderedList: "insertOrderedList",
      codeBlock: "codeBlock"
    }).forEach(([c, h]) => {
      const d = this.buttons.get(c);
      d instanceof HTMLElement && d.classList.toggle("is-active", this.editor.commands.queryState(h));
    });
    const t = this.editor.selection.getBlockElement();
    let n = "";
    if (t) {
      let c = t;
      for (; c && c !== this.editor.root; ) {
        if (c.style.textAlign) {
          n = c.style.textAlign;
          break;
        }
        c = c.parentElement;
      }
    }
    ["alignLeft", "alignCenter", "alignRight", "alignJustify"].forEach((c) => {
      const h = this.buttons.get(c);
      h instanceof HTMLElement && h.classList.toggle("is-active", n === c.replace("align", "").toLowerCase());
    });
    const o = this.buttons.get("ltr"), i = this.buttons.get("rtl");
    if (o instanceof HTMLElement && i instanceof HTMLElement) {
      let c = "";
      if (t) {
        let h = t;
        for (; h && h !== this.editor.root; ) {
          if (h.dir) {
            c = h.dir;
            break;
          }
          h = h.parentElement;
        }
      }
      o.classList.toggle("is-active", c === "ltr"), i.classList.toggle("is-active", c === "rtl");
    }
    const s = this.buttons.get("markdown");
    s instanceof HTMLElement && s.classList.toggle("is-active", this.editor.root.dataset.markdownMode === "true");
    const a = this.buttons.get("blockquote");
    if (a instanceof HTMLElement) {
      let c = !1;
      if (t) {
        let h = t;
        for (; h && h !== this.editor.root; ) {
          if (h.tagName === "BLOCKQUOTE") {
            c = !0;
            break;
          }
          h = h.parentElement;
        }
      }
      a.classList.toggle("is-active", c);
    }
    const r = this.buttons.get("blockFormat");
    if (r instanceof HTMLSelectElement && t) {
      const c = t.tagName.toLowerCase(), h = ["p", "h1", "h2", "h3", "h4", "h5", "h6"];
      r.value = h.includes(c) ? c : "p";
    }
  }
  setEnabled(e, t) {
    const n = this.buttons.get(e);
    (n instanceof HTMLButtonElement || n instanceof HTMLSelectElement) && (n.disabled = !t);
  }
  /**
   * Remembers the colour so dragging a selection handle recolours
   * newly-selected text with it (see the document selectionchange hook).
   * @param {{command: string, value: string}} live
   */
  armLiveColor(e) {
    this._liveColor = e, this._liveLastSelection = "";
  }
  /** Stops automatic recolouring on selection changes. */
  disarmLiveColor() {
    this._liveColor = null, this._liveLastSelection = "", clearTimeout(this._liveTimer), clearTimeout(this._liveIdleTimer);
  }
  destroy() {
    this.disarmLiveColor(), this._colorPickers.forEach((e) => e.destroy()), this._colorPickers.clear(), document.removeEventListener("selectionchange", this._handleLiveSelection), document.removeEventListener("mouseup", this._handleLiveSelection), this.el.remove();
  }
}
const ne = {
  link: () => import("./LinkModule-DOJ-Q8vc.js"),
  image: () => import("./ImageModule-CqlgaYVJ.js"),
  table: () => import("./TableModule-CgK4B4kU.js"),
  codeView: () => import("./CodeViewModule-Wu0FnDsK.js"),
  fullscreen: () => import("./FullscreenModule-Ck-yOE8o.js"),
  find: () => import("./FindModule-CM_sM3QO.js"),
  note: () => import("./NoteModule--2Qiy3Cq.js"),
  media: () => import("./MediaModule-Ca3SV2eV.js"),
  markdown: () => import("./MarkdownModule-DDfsA3Gh.js"),
  statusBar: () => import("./StatusBar-DPjQ5A7t.js"),
  emoji: () => import("./EmojiModule-BZoYsWjN.js"),
  contextMenu: () => import("./ContextMenu-BECN7uLZ.js"),
  templates: () => import("./TemplateModule-DgAejgKc.js")
};
Object.entries(ne).forEach(([l, e]) => {
  x.registerPlugin(l, async (t) => {
    const { default: n } = await e();
    return new n(t);
  });
});
const E = /* @__PURE__ */ new WeakMap(), S = /* @__PURE__ */ new Set(), ie = {
  /**
   * @param {string|HTMLTextAreaElement} target CSS selector or a textarea element
   * @param {import('./core/Editor.js').EditorOptions} [options]
   * @returns {EditorCore}
   */
  init(l, e = {}) {
    const t = typeof l == "string" ? document.querySelector(l) : l;
    if (!t)
      throw new Error(`WYSIWYG Editor: target "${l}" not found`);
    if (t.tagName !== "TEXTAREA")
      throw new Error("WYSIWYG Editor: init() target must be a <textarea> element");
    if (E.has(t))
      return E.get(t);
    const n = new x(t, e), o = new te(n, e.toolbar);
    return n.on("destroy", () => o.destroy()), E.set(t, n), S.add(n), n.on("destroy", () => {
      E.delete(t), S.delete(n);
    }), n;
  },
  /**
   * @param {string|HTMLTextAreaElement} target
   * @returns {EditorCore|undefined}
   */
  get(l) {
    const e = typeof l == "string" ? document.querySelector(l) : l;
    return e ? E.get(e) : void 0;
  },
  /** Destroys every editor instance currently mounted on the page. */
  destroyAll() {
    S.forEach((l) => l.destroy()), S.clear();
  },
  registerPlugin: x.registerPlugin
};
export {
  j as D,
  m as I,
  y as L,
  ie as W
};
//# sourceMappingURL=index-CkG4BTfX.js.map
