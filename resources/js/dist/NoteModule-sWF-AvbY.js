import { D as i } from "./index-Ccv0d7hY.js";
const n = ["info", "warning", "danger", "success", "quote", "tip"];
class r {
  constructor(o) {
    this.editor = o;
  }
  open() {
    const s = `
            <label class="ife-field">
                <span>Type</span>
                <select name="type">${n.map((t) => `<option value="${t}">${t[0].toUpperCase()}${t.slice(1)}</option>`).join("")}</select>
            </label>
            <label class="ife-field">
                <span>Text</span>
                <textarea name="text" rows="3">${this.editor.selection.getText()}</textarea>
            </label>
        `;
    this.dialog = new i(this.editor.wrapper, {
      title: "Insert note",
      bodyHtml: s,
      confirmLabel: "Insert",
      onConfirm: (t) => {
        const e = new FormData(t);
        this.insert(String(e.get("type")), String(e.get("text")));
      }
    }), this.editor.selection.save(), this.dialog.open();
  }
  insert(o, s) {
    this.editor.history.push(), this.editor.selection.restore();
    const t = document.createElement("div");
    t.className = `note note-${o}`, t.textContent = s;
    const e = this.editor.selection.getRange();
    e == null || e.deleteContents(), e == null || e.insertNode(t), this.editor.emitChange();
  }
  destroy() {
    var o;
    (o = this.dialog) == null || o.close();
  }
}
export {
  r as default
};
//# sourceMappingURL=NoteModule-sWF-AvbY.js.map
