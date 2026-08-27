import { D as s } from "./index-BSFSYvJ8.js";
class d {
  constructor(e) {
    this.editor = e, this.handleDblClick = this.handleDblClick.bind(this), e.root.addEventListener("dblclick", this.handleDblClick);
  }
  /** @param {MouseEvent} event */
  handleDblClick(e) {
    var t, l;
    const i = (l = (t = e.target).closest) == null ? void 0 : l.call(t, "a");
    if (!i || !this.editor.root.contains(i)) return;
    e.preventDefault();
    const n = document.createRange();
    n.selectNodeContents(i), this.editor.selection.setRange(n), this.editor.selection.save(), this.open();
  }
  open() {
    const e = this.editor.selection.closest("a"), i = this.editor.selection.getText(), n = `
            <label class="ife-field">
                <span>Text</span>
                <input type="text" name="text" value="${this.escape((e == null ? void 0 : e.textContent) ?? i)}" required>
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
    if (this.dialog = new s(this.editor.wrapper, {
      title: e ? "Edit link" : "Insert link",
      bodyHtml: n,
      confirmLabel: e ? "Update" : "Insert",
      onConfirm: (t) => this.apply(t, e)
    }), this.editor.selection.save(), this.dialog.open(), e) {
      const t = document.createElement("button");
      t.type = "button", t.className = "ife-btn ife-btn--danger", t.textContent = "Remove link", t.addEventListener("mousedown", (l) => l.preventDefault()), t.addEventListener("click", (l) => {
        l.stopPropagation(), this.remove(e), this.dialog.close();
      }), this.dialog.form.querySelector(".ife-dialog__footer").prepend(t);
    }
  }
  apply(e, i) {
    const n = new FormData(e), t = ["nofollow", "noopener", "noreferrer"].filter((o) => n.get(o)).join(" "), l = i ?? document.createElement("a");
    l.textContent = String(n.get("text"));
    const r = String(n.get("href"));
    if (l.setAttribute("href", this.editor.sanitizer.isSafeUrl(r) ? r : "#"), l.setAttribute("title", String(n.get("title") ?? "")), l.setAttribute("target", n.get("newTab") ? "_blank" : "_self"), t ? l.setAttribute("rel", t) : l.removeAttribute("rel"), this.editor.history.push(), !i) {
      this.editor.selection.restore();
      const o = this.editor.selection.getRange();
      o == null || o.deleteContents(), o == null || o.insertNode(l);
    }
    this.editor.emitChange();
  }
  remove(e) {
    this.editor.history.push();
    const i = e.parentNode;
    for (; e.firstChild; ) i.insertBefore(e.firstChild, e);
    i.removeChild(e), this.editor.emitChange();
  }
  escape(e) {
    return String(e ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  destroy() {
    var e;
    (e = this.dialog) == null || e.close(), this.editor.root.removeEventListener("dblclick", this.handleDblClick);
  }
}
export {
  d as default
};
//# sourceMappingURL=LinkModule-RarLYnMp.js.map
