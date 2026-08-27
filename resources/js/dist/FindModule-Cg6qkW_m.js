import { D as g } from "./index-NEan-xA9.js";
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
      onClose: () => this.clearHighlights()
    });
    const i = document.createElement("button");
    i.type = "button", i.className = "ife-btn ife-btn--ghost", i.textContent = "Highlight all", i.addEventListener("mousedown", (t) => t.preventDefault()), i.addEventListener("click", (t) => {
      t.stopPropagation(), this.highlightAll(new FormData(this.dialog.form));
    }), this.dialog.open(), this.dialog.form.querySelector(".ife-dialog__footer").prepend(i);
  }
  buildRegex(e) {
    const i = String(e.get("query") ?? "").trim();
    if (!i) return null;
    const t = !!e.get("caseSensitive"), a = !!e.get("useRegex"), o = `g${t ? "" : "i"}`, n = a ? i : i.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(n, o);
  }
  highlightAll(e) {
    if (this.clearHighlights(), !String(e.get("query") ?? "")) return;
    const t = this.buildRegex(e);
    if (!t) return;
    const a = document.createTreeWalker(this.editor.root, NodeFilter.SHOW_TEXT, null), o = [];
    let n = a.nextNode();
    for (; n; )
      o.push(n), n = a.nextNode();
    o.forEach((s) => {
      const l = s.textContent ?? "";
      if (!t.test(l)) return;
      t.lastIndex = 0;
      const c = document.createDocumentFragment();
      let h = 0, r = t.exec(l);
      for (; r; ) {
        c.appendChild(document.createTextNode(l.slice(h, r.index)));
        const d = document.createElement("mark");
        d.className = "ife-search-highlight", d.textContent = r[0], c.appendChild(d), h = r.index + r[0].length, r = t.exec(l);
      }
      c.appendChild(document.createTextNode(l.slice(h))), s.replaceWith(c);
    });
  }
  clearHighlights() {
    this.editor.root.querySelectorAll("mark.ife-search-highlight").forEach((e) => {
      e.replaceWith(document.createTextNode(e.textContent ?? ""));
    }), this.editor.root.normalize();
  }
  replaceAll(e) {
    const i = new FormData(e), t = this.buildRegex(i);
    if (!t) return;
    const a = String(i.get("replacement") ?? "");
    this.editor.history.push(), this.clearHighlights();
    const o = document.createTreeWalker(this.editor.root, NodeFilter.SHOW_TEXT, null), n = [];
    let s = o.nextNode();
    for (; s; )
      n.push(s), s = o.nextNode();
    n.forEach((l) => {
      l.textContent = (l.textContent ?? "").replace(t, a);
    }), this.editor.emitChange();
  }
  destroy() {
    var e;
    this.clearHighlights(), (e = this.dialog) == null || e.close();
  }
}
export {
  x as default
};
//# sourceMappingURL=FindModule-Cg6qkW_m.js.map
