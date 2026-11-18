import { D as L } from "./index-WraihT7V.js";
class M {
  constructor(e) {
    this.editor = e, this.destroyed = !1, this.buildContextToolbar(), this.handleRootClick = () => this.syncContextToolbar(), this.handleRootKeyup = () => this.syncContextToolbar(), this.handleRootMousedown = (t) => this.handleColumnResizeStart(t), this.handleSelectionChange = () => this.syncContextToolbar(), this.handlePaste = () => this.addColumnResizeHandles(), this.handleInit = () => {
      clearTimeout(this._initTimer), this._initTimer = setTimeout(this.adjustTableHeight, 0);
    }, this.editor.root.addEventListener("click", this.handleRootClick), this.editor.root.addEventListener("keyup", this.handleRootKeyup), this._unsubSelectionChange = this.editor.on("selectionchange", this.handleSelectionChange), this.adjustTableHeight = this.adjustTableHeight.bind(this), this.handleColumnResizeStart = this.handleColumnResizeStart.bind(this), window.addEventListener("resize", this.adjustTableHeight), this._unsubInit = this.editor.on("init", this.handleInit), this._unsubChange = this.editor.on("change", this.adjustTableHeight), this._initTimer = setTimeout(this.adjustTableHeight, 0), this.editor.root.addEventListener("mousedown", this.handleRootMousedown), this._unsubPaste = this.editor.on("paste", this.handlePaste);
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
    ].forEach(([s, d, a]) => {
      const c = document.createElement("button");
      c.type = "button", c.className = `ife-btn ife-btn--ghost ife-table-toolbar__btn${a ? " ife-table-toolbar__btn--danger" : ""}`, c.textContent = s, c.title = s, c.addEventListener("mousedown", (u) => u.preventDefault()), c.addEventListener("click", () => {
        this.editor.selection.restore(), d(), this.syncContextToolbar();
      }), this.contextToolbar.appendChild(c);
    });
    const t = document.createElement("label");
    t.className = "ife-table-toolbar__color", t.title = "Cell background color", t.textContent = "Bg";
    const o = document.createElement("input");
    o.type = "color", o.setAttribute("aria-label", "Cell background color"), o.addEventListener("mousedown", (s) => s.stopPropagation()), o.addEventListener("input", () => {
      this.editor.selection.restore(), this.setCellBackground(o.value);
    }), t.appendChild(o), this.contextToolbar.appendChild(t);
    const n = document.createElement("label");
    n.className = "ife-table-toolbar__color", n.title = "Cell border color", n.textContent = "Bd";
    const r = document.createElement("input");
    r.type = "color", r.setAttribute("aria-label", "Cell border color"), r.addEventListener("mousedown", (s) => s.stopPropagation()), r.addEventListener("input", () => {
      this.editor.selection.restore(), this.setCellBorderColor(r.value);
    }), n.appendChild(r), this.contextToolbar.appendChild(n);
    const i = document.createElement("select");
    i.className = "ife-toolbar__select", i.setAttribute("aria-label", "Cell border width"), [["", "Bd W"], ["1px", "1px"], ["2px", "2px"], ["3px", "3px"], ["4px", "4px"]].forEach(([s, d]) => {
      const a = document.createElement("option");
      a.value = s, a.textContent = d, i.appendChild(a);
    }), i.addEventListener("mousedown", (s) => s.stopPropagation()), i.addEventListener("change", () => {
      this.editor.selection.restore(), this.setCellBorderWidth(i.value);
    }), this.contextToolbar.appendChild(i);
    const l = document.createElement("select");
    l.className = "ife-toolbar__select", l.setAttribute("aria-label", "Table alignment"), [["left", "Align left"], ["center", "Align center"], ["right", "Align right"]].forEach(([s, d]) => {
      const a = document.createElement("option");
      a.value = s, a.textContent = d, l.appendChild(a);
    }), l.addEventListener("mousedown", (s) => s.stopPropagation()), l.addEventListener("change", () => {
      this.editor.selection.restore(), this.setTableAlignment(l.value);
    }), this.contextToolbar.appendChild(l);
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
    this.editor.selection.save(), new L(this.editor.wrapper, {
      title: "Insert table",
      bodyHtml: e,
      confirmLabel: "Insert",
      onConfirm: (o) => {
        const n = new FormData(o);
        this.insertTable(Number(n.get("rows")), Number(n.get("cols")), !!n.get("header"));
      }
    }).open();
  }
  insertTable(e, t, o) {
    const n = Number.isFinite(e) && e >= 1 ? Math.min(Math.round(e), 50) : 1, r = Number.isFinite(t) && t >= 1 ? Math.min(Math.round(t), 20) : 1;
    this.editor.history.push(), this.editor.selection.restore();
    const i = document.createElement("table");
    if (i.className = "ife-table", o) {
      const c = i.createTHead().insertRow();
      for (let u = 0; u < r; u += 1) {
        const h = document.createElement("th");
        h.contentEditable = "true", h.innerHTML = "<br>", c.appendChild(h);
      }
    }
    const l = i.createTBody(), s = o ? n - 1 : n;
    for (let a = 0; a < s; a += 1) {
      const c = l.insertRow();
      for (let u = 0; u < r; u += 1) {
        const h = c.insertCell();
        h.innerHTML = "<br>";
      }
    }
    const d = this.editor.selection.getRange();
    d ? (d.deleteContents(), d.insertNode(i)) : this.editor.root.appendChild(i), this.editor.emitChange(), this.adjustTableHeight();
  }
  getCurrentCell() {
    return this.editor.selection.closest("td, th");
  }
  getCurrentTable() {
    return this.editor.selection.closest("table");
  }
  addRow(e = !1) {
    const t = this.getCurrentCell(), o = t == null ? void 0 : t.closest("tr");
    if (!o) return;
    this.editor.selection.save(), this.editor.history.push();
    const n = o.cloneNode(!0);
    [...n.children].forEach((r) => {
      r.innerHTML = "<br>";
    }), o.parentNode.insertBefore(n, e ? o : o.nextSibling), this.editor.selection.restore(), this.editor.selection.focus(), this.editor.emitChange();
  }
  deleteRow() {
    var r;
    const e = (r = this.getCurrentCell()) == null ? void 0 : r.closest("tr");
    if (!e) return;
    const t = e.closest("table"), o = e.nextElementSibling, n = e.previousElementSibling;
    if (this.editor.history.push(), e.remove(), t && t.isConnected)
      if (!t.querySelector("td, th"))
        t.remove();
      else {
        const i = o || n;
        if (i) {
          const l = i.querySelector("td, th");
          if (l) {
            const s = document.createRange();
            s.setStart(l, 0), s.collapse(!0), this.editor.selection.setRange(s);
          }
        }
      }
    this.editor.selection.focus(), this.editor.emitChange();
  }
  addColumn(e = !1) {
    const t = this.getCurrentTable(), o = this.getCurrentCell();
    if (!t || !o) return;
    const n = o.parentNode;
    if (!n) return;
    let r = [...n.children].indexOf(o);
    r < 0 || (this.editor.selection.save(), this.editor.history.push(), t.querySelectorAll("tr").forEach((i) => {
      const l = i.children[r];
      if (!l) return;
      const s = document.createElement(l.tagName.toLowerCase() === "th" ? "th" : "td");
      s.innerHTML = "<br>", i.insertBefore(s, e ? l : l.nextSibling);
    }), this.editor.selection.restore(), this.editor.selection.focus(), this.editor.emitChange());
  }
  deleteColumn() {
    const e = this.getCurrentTable(), t = this.getCurrentCell();
    if (!e || !t) return;
    const o = t.parentNode;
    if (!o) return;
    const n = [...o.children].indexOf(t);
    if (!(n < 0)) {
      if (this.editor.history.push(), e.querySelectorAll("tr").forEach((r) => {
        var i;
        return (i = r.children[n]) == null ? void 0 : i.remove();
      }), e.isConnected)
        if (!e.querySelector("td, th"))
          e.remove();
        else {
          const r = e.querySelector("tr");
          if (r) {
            const i = r.querySelector("td, th");
            if (i) {
              const l = document.createRange();
              l.setStart(i, 0), l.collapse(!0), this.editor.selection.setRange(l);
            }
          }
        }
      this.editor.selection.focus(), this.editor.emitChange();
    }
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
    const o = Number(e.getAttribute("colspan") ?? 1) + Number(t.getAttribute("colspan") ?? 1);
    e.setAttribute("colspan", String(o)), e.innerHTML += ` ${t.innerHTML}`, t.remove(), this.editor.emitChange();
  }
  /** Splits a previously merged cell back into two cells. */
  splitCell() {
    const e = this.getCurrentCell(), t = Number((e == null ? void 0 : e.getAttribute("colspan")) ?? 1);
    if (!e || t <= 1) return;
    this.editor.history.push(), e.setAttribute("colspan", String(t - 1));
    const o = document.createElement(e.tagName.toLowerCase());
    o.innerHTML = "<br>", e.after(o), this.editor.emitChange();
  }
  setCellBackground(e) {
    const t = this.getCurrentCell();
    t && (this.editor.history.push(), t.style.backgroundColor = e, this.editor.emitChange());
  }
  setCellBorderColor(e) {
    const t = this.getCurrentCell();
    t && (this.editor.history.push(), t.style.borderColor = e, this.editor.emitChange());
  }
  setCellBorderWidth(e) {
    if (!e) return;
    const t = this.getCurrentCell();
    t && (this.editor.history.push(), t.style.borderWidth = e, this.editor.emitChange());
  }
  /** @param {'next'|'prev'} direction */
  navigateToCell(e) {
    const t = this.getCurrentCell();
    if (!t) return;
    const o = t.closest("tr");
    if (!o) return;
    const n = o.closest("table");
    if (!n) return;
    const r = [...n.querySelectorAll("tr")], i = r.indexOf(o), l = [...o.children], s = l.indexOf(t);
    let d, a, c;
    if (e === "next")
      if (s < l.length - 1)
        c = s + 1, a = l, d = o;
      else if (i < r.length - 1)
        d = r[i + 1], a = [...d.children], c = Math.min(s, a.length - 1);
      else if (this.addRow(!1), d = o.nextElementSibling, d)
        a = [...d.children], c = 0;
      else return;
    else if (s > 0)
      c = s - 1, a = l, d = o;
    else if (i > 0)
      d = r[i - 1], a = [...d.children], c = a.length - 1;
    else return;
    if (!d || !a) return;
    const u = a[c];
    if (!u) return;
    const h = document.createRange();
    h.setStart(u, 0), h.collapse(!0), this.editor.selection.setRange(h), this.editor.selection.focus();
  }
  handleColumnResizeStart(e) {
    const t = e.target;
    if (!t.classList.contains("ife-col-resize-handle")) return;
    e.preventDefault(), e.stopPropagation();
    const o = t.closest("table");
    if (!o) return;
    const n = e.clientX, r = parseInt(t.dataset.col, 10), i = t.dataset.startWidth ? parseFloat(t.dataset.startWidth) : 0, l = (d) => {
      const a = d.clientX - n, c = Math.max(20, i + a);
      o.querySelectorAll("tr").forEach((u) => {
        const h = u.children[r];
        h && (h.style.width = `${c}px`);
      });
    }, s = () => {
      document.removeEventListener("mousemove", l), document.removeEventListener("mouseup", s), this.addColumnResizeHandles(), this.editor.emitChange();
    };
    document.addEventListener("mousemove", l), document.addEventListener("mouseup", s);
  }
  addColumnResizeHandles() {
    this.editor.root.querySelectorAll(".ife-col-resize-handle").forEach((t) => t.remove()), this.editor.root.querySelectorAll("table.ife-table").forEach((t) => {
      const o = t.querySelector("tr");
      o && [...o.children].forEach((n, r) => {
        const i = document.createElement("ife-col-resize-handle");
        i.className = "ife-col-resize-handle", i.dataset.col = r, i.dataset.startWidth = n.getBoundingClientRect().width, i.style.left = `${n.offsetLeft + n.offsetWidth - 3}px`;
        const l = o;
        l.style.position = "relative", i.style.top = "0", t.appendChild(i);
      });
    });
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
    var g, f, C;
    if (this.destroyed || !((g = this.editor.root) != null && g.isConnected)) return;
    const e = this.editor.wrapper, t = window.innerHeight, o = e.getBoundingClientRect(), n = e.querySelector(".ife-toolbar"), r = n ? n.offsetHeight : 0, l = ((f = this.contextToolbar) == null ? void 0 : f.style.display) !== "none" && ((C = this.contextToolbar) == null ? void 0 : C.offsetHeight) || 0, s = e.querySelector(".ife-statusbar"), d = s ? s.offsetHeight : 0, a = getComputedStyle(e), c = parseFloat(a.borderTopWidth) || 0, u = parseFloat(a.borderBottomWidth) || 0, h = t - o.top - c - r - l - d - u;
    this.editor.root.style.maxHeight = `${Math.max(200, Math.floor(h))}px`;
    const p = this.editor.root.querySelectorAll("table.ife-table");
    if (!p.length) return;
    const w = parseFloat(getComputedStyle(this.editor.root).paddingTop) || 16, v = parseFloat(getComputedStyle(this.editor.root).paddingBottom) || 16;
    p.forEach((m) => {
      let y = 0, b = m.previousElementSibling;
      for (; b; ) {
        const T = getComputedStyle(b);
        y += b.offsetHeight + (parseFloat(T.marginTop) || 0) + (parseFloat(T.marginBottom) || 0), b = b.previousElementSibling;
      }
      const x = getComputedStyle(m), E = parseFloat(x.marginTop) || 0, R = parseFloat(x.marginBottom) || 0, S = h - w - y - E - R - v;
      m.style.maxHeight = `${Math.max(200, Math.floor(S))}px`;
    });
  }
  destroy() {
    var e, t, o, n, r;
    this.destroyed || (this.destroyed = !0, clearTimeout(this._initTimer), window.removeEventListener("resize", this.adjustTableHeight), this.editor.root.removeEventListener("click", this.handleRootClick), this.editor.root.removeEventListener("keyup", this.handleRootKeyup), this.editor.root.removeEventListener("mousedown", this.handleRootMousedown), (e = this._unsubSelectionChange) == null || e.call(this), (t = this._unsubInit) == null || t.call(this), (o = this._unsubChange) == null || o.call(this), (n = this._unsubPaste) == null || n.call(this), this.editor.root.style.maxHeight = "", (r = this.contextToolbar) == null || r.remove());
  }
}
export {
  M as default
};
//# sourceMappingURL=TableModule-CA9zlyPf.js.map
