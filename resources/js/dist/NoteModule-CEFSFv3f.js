import { D as i } from "./index-DuOeHlvd.js";
const n = ["info", "warning", "danger", "success", "quote", "tip"];
class l {
  constructor(t) {
    this.editor = t;
  }
  open() {
    const o = `
            <label class="ife-field">
                <span>Type</span>
                <select name="type">${n.map((e) => `<option value="${e}">${e[0].toUpperCase()}${e.slice(1)}</option>`).join("")}</select>
            </label>
            <label class="ife-field">
                <span>Text</span>
                <textarea name="text" rows="3" required>${this.escape(this.editor.selection.getText())}</textarea>
            </label>
        `;
    this.dialog = new i(this.editor.wrapper, {
      title: "Insert note",
      bodyHtml: o,
      confirmLabel: "Insert",
      onConfirm: (e) => {
        const s = new FormData(e);
        if (this.insert(String(s.get("type")), String(s.get("text"))) === !1) return !1;
      }
    }), this.editor.selection.save(), this.dialog.open();
  }
  insert(t, o) {
    if (!String(o ?? "").trim()) return !1;
    this.editor.history.push(), this.editor.selection.restore();
    const e = document.createElement("div");
    e.className = `note note-${t}`, e.textContent = o;
    const s = this.editor.selection.getRange();
    return s ? (s.deleteContents(), s.insertNode(e)) : this.editor.root.appendChild(e), this.editor.emitChange(), !0;
  }
  escape(t) {
    return String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  destroy() {
    var t;
    (t = this.dialog) == null || t.close();
  }
}
export {
  l as default
};
//# sourceMappingURL=NoteModule-CEFSFv3f.js.map
