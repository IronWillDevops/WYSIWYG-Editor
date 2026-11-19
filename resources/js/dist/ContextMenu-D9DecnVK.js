class h {
  constructor(o) {
    this.editor = o, this.menu = null, this.handleContextMenu = this.handleContextMenu.bind(this), this.close = this.close.bind(this), this.handleEscape = this.handleEscape.bind(this), o.root.addEventListener("contextmenu", this.handleContextMenu), document.addEventListener("click", this.close), document.addEventListener("keydown", this.handleEscape);
  }
  /** @param {KeyboardEvent} event */
  handleEscape(o) {
    o.key === "Escape" && this.close();
  }
  handleContextMenu(o) {
    o.preventDefault(), this.close();
    const i = o.target;
    this.menu = document.createElement("div"), this.menu.className = "ife-context-menu", this.menu.style.left = `${o.clientX}px`, this.menu.style.top = `${o.clientY}px`;
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
      var n;
      const e = (n = navigator.clipboard) == null ? void 0 : n.readText();
      e && e.then((s) => {
        this.editor.commands.insertHTML(this.editor.escapeHtml(s));
      }, () => {
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
      const n = document.createElement("button");
      n.type = "button", n.className = "ife-context-menu__item", n.textContent = e.label, n.addEventListener("mousedown", (s) => s.preventDefault()), n.addEventListener("click", () => {
        this.close(), this.editor.selection.restore(), e.action();
      }), this.menu.appendChild(n);
    }), document.body.appendChild(this.menu), this.editor.selection.save();
  }
  close() {
    this.menu && (this.menu.remove(), this.menu = null);
  }
  destroy() {
    this.close(), this.editor.root.removeEventListener("contextmenu", this.handleContextMenu), document.removeEventListener("click", this.close), document.removeEventListener("keydown", this.handleEscape);
  }
}
export {
  h as default
};
//# sourceMappingURL=ContextMenu-D9DecnVK.js.map
