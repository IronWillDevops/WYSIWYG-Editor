import { D as g } from "./index-WraihT7V.js";
class x {
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
    this.dialog = new g(this.editor.wrapper, {
      title: "Find & Replace",
      bodyHtml: e,
      confirmLabel: "Replace all",
      onConfirm: (t) => this.replaceAll(t),
      // Clearing the highlights must also give the caret back: opening
      // the dialog moves focus into it, so without a restore the user
      // loses their place in the document after closing.
      onClose: () => {
        this.clearHighlights(), this.editor.selection.restore();
      }
    });
    const i = document.createElement("button");
    i.type = "button", i.className = "ife-btn ife-btn--ghost", i.textContent = "Highlight all", i.addEventListener("mousedown", (t) => t.preventDefault()), i.addEventListener("click", (t) => {
      t.stopPropagation(), this.highlightAll(new FormData(this.dialog.form));
    }), this.editor.selection.save(), this.dialog.open(), this.dialog.form.querySelector(".ife-dialog__footer").prepend(i);
  }
  buildRegex(e) {
    const i = String(e.get("query") ?? "").trim();
    if (!i) return null;
    const t = !!e.get("caseSensitive"), r = !!e.get("useRegex"), o = `g${t ? "" : "i"}`, s = r ? i : i.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(s, o);
  }
  /**
   * buildRegex() rethrows SyntaxError for a malformed user pattern; the
   * dialog handlers must not let that escape (it would leave the dialog
   * stuck with an uncaught error and no feedback).
   * @param {FormData|URLSearchParams} form
   * @returns {RegExp|null} null when the query is empty or invalid
   */
  safeBuildRegex(e) {
    try {
      return this.buildRegex(e);
    } catch {
      return null;
    }
  }
  highlightAll(e) {
    if (this.clearHighlights(), !String(e.get("query") ?? "")) return;
    const t = this.safeBuildRegex(e);
    if (!t) return;
    const r = document.createTreeWalker(this.editor.root, NodeFilter.SHOW_TEXT, null), o = [];
    let s = r.nextNode();
    for (; s; )
      o.push(s), s = r.nextNode();
    o.forEach((a) => {
      const n = a.textContent ?? "";
      if (!t.test(n)) return;
      t.lastIndex = 0;
      const c = document.createDocumentFragment();
      let h = 0, l = t.exec(n);
      for (; l; ) {
        if (l[0].length === 0) {
          t.lastIndex = l.index + 1, l = t.exec(n);
          continue;
        }
        c.appendChild(document.createTextNode(n.slice(h, l.index)));
        const d = document.createElement("mark");
        d.className = "ife-search-highlight", d.textContent = l[0], c.appendChild(d), h = l.index + l[0].length, l = t.exec(n);
      }
      c.appendChild(document.createTextNode(n.slice(h))), a.replaceWith(c);
    });
  }
  clearHighlights() {
    this.editor.root.querySelectorAll("mark.ife-search-highlight").forEach((e) => {
      e.replaceWith(document.createTextNode(e.textContent ?? ""));
    }), this.editor.root.normalize();
  }
  /**
   * @param {FormData|HTMLFormElement} form
   * @returns {boolean} false when there is nothing to replace (empty or
   *   invalid query) so the Dialog can stay open for correction
   */
  replaceAll(e) {
    const i = new FormData(e), t = this.safeBuildRegex(i);
    if (!t) return !1;
    const r = String(i.get("replacement") ?? "");
    this.editor.history.push(), this.clearHighlights();
    const o = document.createTreeWalker(this.editor.root, NodeFilter.SHOW_TEXT, null), s = [];
    let a = o.nextNode();
    for (; a; )
      s.push(a), a = o.nextNode();
    return s.forEach((n) => {
      n.textContent = (n.textContent ?? "").replace(t, r);
    }), this.editor.emitChange(), !0;
  }
  destroy() {
    var e;
    this.clearHighlights(), (e = this.dialog) == null || e.close();
  }
}
export {
  x as default
};
//# sourceMappingURL=FindModule-aWeQUnq3.js.map
