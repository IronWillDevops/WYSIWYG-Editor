import { D as H } from "./index-XTqynit6.js";
class A {
  constructor(e) {
    this.editor = e, this.buildContextToolbar(), this.editor.root.addEventListener("click", () => this.syncContextToolbar()), this.editor.root.addEventListener("keyup", () => this.syncContextToolbar()), this.editor.on("selectionchange", () => this.syncContextToolbar()), this.adjustTableHeight = this.adjustTableHeight.bind(this), this.handleColumnResizeStart = this.handleColumnResizeStart.bind(this), window.addEventListener("resize", this.adjustTableHeight), this.editor.on("init", () => setTimeout(this.adjustTableHeight, 0)), this.editor.on("change", this.adjustTableHeight), setTimeout(this.adjustTableHeight, 0), this.editor.root.addEventListener("mousedown", (t) => this.handleColumnResizeStart(t)), this.editor.on("paste", () => this.addColumnResizeHandles());
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
    ].forEach(([i, c, a]) => {
      const d = document.createElement("button");
      d.type = "button", d.className = `ife-btn ife-btn--ghost ife-table-toolbar__btn${a ? " ife-table-toolbar__btn--danger" : ""}`, d.textContent = i, d.title = i, d.addEventListener("mousedown", (u) => u.preventDefault()), d.addEventListener("click", () => {
        this.editor.selection.restore(), c(), this.syncContextToolbar();
      }), this.contextToolbar.appendChild(d);
    });
    const t = document.createElement("label");
    t.className = "ife-table-toolbar__color", t.title = "Cell background color", t.textContent = "Bg";
    const o = document.createElement("input");
    o.type = "color", o.setAttribute("aria-label", "Cell background color"), o.addEventListener("mousedown", (i) => i.stopPropagation()), o.addEventListener("input", () => {
      this.editor.selection.restore(), this.setCellBackground(o.value);
    }), t.appendChild(o), this.contextToolbar.appendChild(t);
    const n = document.createElement("label");
    n.className = "ife-table-toolbar__color", n.title = "Cell border color", n.textContent = "Bd";
    const l = document.createElement("input");
    l.type = "color", l.setAttribute("aria-label", "Cell border color"), l.addEventListener("mousedown", (i) => i.stopPropagation()), l.addEventListener("input", () => {
      this.editor.selection.restore(), this.setCellBorderColor(l.value);
    }), n.appendChild(l), this.contextToolbar.appendChild(n);
    const s = document.createElement("select");
    s.className = "ife-toolbar__select", s.setAttribute("aria-label", "Cell border width"), [["", "Bd W"], ["1px", "1px"], ["2px", "2px"], ["3px", "3px"], ["4px", "4px"]].forEach(([i, c]) => {
      const a = document.createElement("option");
      a.value = i, a.textContent = c, s.appendChild(a);
    }), s.addEventListener("mousedown", (i) => i.stopPropagation()), s.addEventListener("change", () => {
      this.editor.selection.restore(), this.setCellBorderWidth(s.value);
    }), this.contextToolbar.appendChild(s);
    const r = document.createElement("select");
    r.className = "ife-toolbar__select", r.setAttribute("aria-label", "Table alignment"), [["left", "Align left"], ["center", "Align center"], ["right", "Align right"]].forEach(([i, c]) => {
      const a = document.createElement("option");
      a.value = i, a.textContent = c, r.appendChild(a);
    }), r.addEventListener("mousedown", (i) => i.stopPropagation()), r.addEventListener("change", () => {
      this.editor.selection.restore(), this.setTableAlignment(r.value);
    }), this.contextToolbar.appendChild(r);
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
    this.editor.selection.save(), new H(this.editor.wrapper, {
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
    this.editor.history.push(), this.editor.selection.restore();
    const n = document.createElement("table");
    if (n.className = "ife-table", o) {
      const c = n.createTHead().insertRow();
      for (let a = 0; a < t; a += 1) {
        const d = document.createElement("th");
        d.contentEditable = "true", d.innerHTML = "<br>", c.appendChild(d);
      }
    }
    const l = n.createTBody(), s = o ? e - 1 : e;
    for (let i = 0; i < Math.max(s, 1); i += 1) {
      const c = l.insertRow();
      for (let a = 0; a < t; a += 1) {
        const d = c.insertCell();
        d.innerHTML = "<br>";
      }
    }
    const r = this.editor.selection.getRange();
    r == null || r.deleteContents(), r == null || r.insertNode(n), this.editor.emitChange(), this.adjustTableHeight();
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
    [...n.children].forEach((l) => {
      l.innerHTML = "<br>";
    }), o.parentNode.insertBefore(n, e ? o : o.nextSibling), this.editor.selection.restore(), this.editor.selection.focus(), this.editor.emitChange();
  }
  deleteRow() {
    var l;
    const e = (l = this.getCurrentCell()) == null ? void 0 : l.closest("tr");
    if (!e) return;
    const t = e.closest("table"), o = e.nextElementSibling, n = e.previousElementSibling;
    if (this.editor.history.push(), e.remove(), t && t.isConnected) {
      const s = o || n;
      if (s) {
        const r = s.querySelector("td, th");
        if (r) {
          const i = document.createRange();
          i.setStart(r, 0), i.collapse(!0), this.editor.selection.setRange(i);
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
    let l = [...n.children].indexOf(o);
    l < 0 || (this.editor.selection.save(), this.editor.history.push(), t.querySelectorAll("tr").forEach((s) => {
      const r = s.children[l];
      if (!r) return;
      const i = document.createElement(r.tagName.toLowerCase() === "th" ? "th" : "td");
      i.innerHTML = "<br>", s.insertBefore(i, e ? r : r.nextSibling);
    }), this.editor.selection.restore(), this.editor.selection.focus(), this.editor.emitChange());
  }
  deleteColumn() {
    const e = this.getCurrentTable(), t = this.getCurrentCell();
    if (!e || !t) return;
    const o = t.parentNode;
    if (!o) return;
    const n = [...o.children].indexOf(t);
    if (!(n < 0)) {
      if (this.editor.history.push(), e.querySelectorAll("tr").forEach((l) => {
        var s;
        return (s = l.children[n]) == null ? void 0 : s.remove();
      }), e.isConnected) {
        const l = e.querySelector("tr");
        if (l) {
          const s = l.querySelector("td, th");
          if (s) {
            const r = document.createRange();
            r.setStart(s, 0), r.collapse(!0), this.editor.selection.setRange(r);
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
    const l = [...n.querySelectorAll("tr")], s = l.indexOf(o), r = [...o.children], i = r.indexOf(t);
    let c, a, d;
    if (e === "next")
      if (i < r.length - 1)
        d = i + 1, a = r, c = o;
      else if (s < l.length - 1)
        c = l[s + 1], a = [...c.children], d = Math.min(i, a.length - 1);
      else if (this.addRow(!1), c = o.nextElementSibling, c)
        a = [...c.children], d = 0;
      else return;
    else if (i > 0)
      d = i - 1, a = r, c = o;
    else if (s > 0)
      c = l[s - 1], a = [...c.children], d = a.length - 1;
    else return;
    if (!c || !a) return;
    const u = a[d];
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
    const n = e.clientX, l = parseInt(t.dataset.col, 10), s = t.dataset.startWidth ? parseFloat(t.dataset.startWidth) : 0, r = (c) => {
      const a = c.clientX - n, d = Math.max(20, s + a);
      o.querySelectorAll("tr").forEach((u) => {
        const h = u.children[l];
        h && (h.style.width = `${d}px`);
      });
    }, i = () => {
      document.removeEventListener("mousemove", r), document.removeEventListener("mouseup", i), this.addColumnResizeHandles(), this.editor.emitChange();
    };
    document.addEventListener("mousemove", r), document.addEventListener("mouseup", i);
  }
  addColumnResizeHandles() {
    this.editor.root.querySelectorAll(".ife-col-resize-handle").forEach((t) => t.remove()), this.editor.root.querySelectorAll("table.ife-table").forEach((t) => {
      const o = t.querySelector("tr");
      o && [...o.children].forEach((n, l) => {
        const s = document.createElement("div");
        s.className = "ife-col-resize-handle", s.dataset.col = l, s.dataset.startWidth = n.getBoundingClientRect().width, s.style.left = `${n.offsetLeft + n.offsetWidth - 3}px`;
        const r = o;
        r.style.position = "relative", s.style.top = "0", t.appendChild(s);
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
    if (!((g = this.editor.root) != null && g.isConnected)) return;
    const e = this.editor.wrapper, t = window.innerHeight, o = e.getBoundingClientRect(), n = e.querySelector(".ife-toolbar"), l = n ? n.offsetHeight : 0, r = ((f = this.contextToolbar) == null ? void 0 : f.style.display) !== "none" && ((C = this.contextToolbar) == null ? void 0 : C.offsetHeight) || 0, i = e.querySelector(".ife-statusbar"), c = i ? i.offsetHeight : 0, a = getComputedStyle(e), d = parseFloat(a.borderTopWidth) || 0, u = parseFloat(a.borderBottomWidth) || 0, h = t - o.top - d - l - r - c - u;
    this.editor.root.style.maxHeight = `${Math.max(200, Math.floor(h))}px`;
    const m = this.editor.root.querySelectorAll("table.ife-table");
    if (!m.length) return;
    const w = parseFloat(getComputedStyle(this.editor.root).paddingTop) || 16, v = parseFloat(getComputedStyle(this.editor.root).paddingBottom) || 16;
    m.forEach((p) => {
      let x = 0, b = p.previousElementSibling;
      for (; b; ) {
        const y = getComputedStyle(b);
        x += b.offsetHeight + (parseFloat(y.marginTop) || 0) + (parseFloat(y.marginBottom) || 0), b = b.previousElementSibling;
      }
      const T = getComputedStyle(p), E = parseFloat(T.marginTop) || 0, R = parseFloat(T.marginBottom) || 0, S = h - w - x - E - R - v;
      p.style.maxHeight = `${Math.max(200, Math.floor(S))}px`;
    });
  }
  destroy() {
    var e;
    window.removeEventListener("resize", this.adjustTableHeight), this.editor.root.style.maxHeight = "", (e = this.contextToolbar) == null || e.remove();
  }
}
export {
  A as default
};
//# sourceMappingURL=TableModule-DaIQZl8h.js.map
