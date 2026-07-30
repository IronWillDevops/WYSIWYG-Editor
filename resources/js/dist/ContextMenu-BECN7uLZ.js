class u {
  constructor(n) {
    this.editor = n, this.menu = null, this.handleContextMenu = this.handleContextMenu.bind(this), this.close = this.close.bind(this), n.root.addEventListener("contextmenu", this.handleContextMenu), document.addEventListener("click", this.close), document.addEventListener("keydown", (i) => {
      i.key === "Escape" && this.close();
    });
  }
  handleContextMenu(n) {
    n.preventDefault(), this.close();
    const i = n.target;
    this.menu = document.createElement("div"), this.menu.className = "ife-context-menu", this.menu.style.left = `${n.clientX}px`, this.menu.style.top = `${n.clientY}px`;
    const t = [], l = i.closest("figure.ife-image img");
    l && (t.push({ label: "Edit image", action: () => {
      var e;
      return (e = this.editor.module("image")) == null ? void 0 : e.open();
    } }), t.push({ label: "Remove image", action: () => {
      const e = l.closest("figure.ife-image");
      e && (this.editor.history.push(), e.remove(), this.editor.emitChange());
    } }));
    const a = i.closest("a");
    a && (t.push({ label: "Edit link", action: () => {
      var e;
      return (e = this.editor.module("link")) == null ? void 0 : e.open();
    } }), t.push({ label: "Remove link", action: () => {
      var e;
      return (e = this.editor.module("link")) == null ? void 0 : e.remove(a);
    } })), i.closest("td, th") && (t.push({ label: "Row above", action: () => {
      var e;
      return (e = this.editor.module("table")) == null ? void 0 : e.addRow(!0);
    } }), t.push({ label: "Row below", action: () => {
      var e;
      return (e = this.editor.module("table")) == null ? void 0 : e.addRow(!1);
    } }), t.push({ label: "Delete row", action: () => {
      var e;
      return (e = this.editor.module("table")) == null ? void 0 : e.deleteRow();
    } }), t.push({ label: "Column left", action: () => {
      var e;
      return (e = this.editor.module("table")) == null ? void 0 : e.addColumn(!0);
    } }), t.push({ label: "Column right", action: () => {
      var e;
      return (e = this.editor.module("table")) == null ? void 0 : e.addColumn(!1);
    } }), t.push({ label: "Delete column", action: () => {
      var e;
      return (e = this.editor.module("table")) == null ? void 0 : e.deleteColumn();
    } })), t.push({ type: "separator" }), t.push({ label: "Cut", action: () => document.execCommand("cut") }), t.push({ label: "Copy", action: () => document.execCommand("copy") }), t.push({ label: "Paste", action: () => {
      var e;
      return (e = navigator.clipboard) == null ? void 0 : e.readText().then((o) => {
        this.editor.commands.insertHTML(this.editor.escapeHtml(o));
      });
    } }), t.push({ type: "separator" }), t.push({ label: "Select all", action: () => {
      const e = document.createRange();
      e.selectNodeContents(this.editor.root), this.editor.selection.setRange(e);
    } }), t.forEach((e) => {
      if (e.type === "separator") {
        const s = document.createElement("div");
        s.className = "ife-context-menu__separator", this.menu.appendChild(s);
        return;
      }
      const o = document.createElement("button");
      o.type = "button", o.className = "ife-context-menu__item", o.textContent = e.label, o.addEventListener("mousedown", (s) => s.preventDefault()), o.addEventListener("click", () => {
        this.close(), this.editor.selection.restore(), e.action();
      }), this.menu.appendChild(o);
    }), document.body.appendChild(this.menu), this.editor.selection.save();
  }
  close() {
    this.menu && (this.menu.remove(), this.menu = null);
  }
  destroy() {
    this.close(), this.editor.root.removeEventListener("contextmenu", this.handleContextMenu), document.removeEventListener("click", this.close);
  }
}
export {
  u as default
};
//# sourceMappingURL=ContextMenu-BECN7uLZ.js.map
