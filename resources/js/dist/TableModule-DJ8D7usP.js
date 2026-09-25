import { D as b } from "./index-CtGzUKRq.js";
class g {
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
    ].forEach(([s, c, a]) => {
      const d = document.createElement("button");
      d.type = "button", d.className = `ife-btn ife-btn--ghost ife-table-toolbar__btn${a ? " ife-table-toolbar__btn--danger" : ""}`, d.textContent = s, d.title = s, d.addEventListener("mousedown", (h) => h.preventDefault()), d.addEventListener("click", () => {
        this.editor.selection.restore(), c(), this.syncContextToolbar();
      }), this.contextToolbar.appendChild(d);
    });
    const t = document.createElement("label");
    t.className = "ife-table-toolbar__color", t.title = "Cell background color", t.textContent = "Bg";
    const o = document.createElement("input");
    o.type = "color", o.setAttribute("aria-label", "Cell background color"), o.addEventListener("mousedown", (s) => s.stopPropagation()), o.addEventListener("input", () => {
      this.editor.selection.restore(), this.setCellBackground(o.value);
    }), t.appendChild(o), this.contextToolbar.appendChild(t);
    const i = document.createElement("label");
    i.className = "ife-table-toolbar__color", i.title = "Cell border color", i.textContent = "Bd";
    const l = document.createElement("input");
    l.type = "color", l.setAttribute("aria-label", "Cell border color"), l.addEventListener("mousedown", (s) => s.stopPropagation()), l.addEventListener("input", () => {
      this.editor.selection.restore(), this.setCellBorderColor(l.value);
    }), i.appendChild(l), this.contextToolbar.appendChild(i);
    const r = document.createElement("select");
    r.className = "ife-toolbar__select", r.setAttribute("aria-label", "Cell border width"), [["", "Bd W"], ["1px", "1px"], ["2px", "2px"], ["3px", "3px"], ["4px", "4px"]].forEach(([s, c]) => {
      const a = document.createElement("option");
      a.value = s, a.textContent = c, r.appendChild(a);
    }), r.addEventListener("mousedown", (s) => s.stopPropagation()), r.addEventListener("change", () => {
      this.editor.selection.restore(), this.setCellBorderWidth(r.value);
    }), this.contextToolbar.appendChild(r);
    const n = document.createElement("select");
    n.className = "ife-toolbar__select", n.setAttribute("aria-label", "Table alignment"), [["left", "Align left"], ["center", "Align center"], ["right", "Align right"]].forEach(([s, c]) => {
      const a = document.createElement("option");
      a.value = s, a.textContent = c, n.appendChild(a);
    }), n.addEventListener("mousedown", (s) => s.stopPropagation()), n.addEventListener("change", () => {
      this.editor.selection.restore(), this.setTableAlignment(n.value);
    }), this.contextToolbar.appendChild(n);
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
    this.editor.selection.save(), new b(this.editor.wrapper, {
      title: "Insert table",
      bodyHtml: e,
      confirmLabel: "Insert",
      onConfirm: (o) => {
        const i = new FormData(o);
        this.insertTable(Number(i.get("rows")), Number(i.get("cols")), !!i.get("header"));
      }
    }).open();
  }
  insertTable(e, t, o) {
    this.editor.history.push(), this.editor.selection.restore();
    const i = document.createElement("table");
    if (i.className = "ife-table", o) {
      const c = i.createTHead().insertRow();
      for (let a = 0; a < t; a += 1) {
        const d = document.createElement("th");
        d.contentEditable = "true", d.innerHTML = "<br>", c.appendChild(d);
      }
    }
    const l = i.createTBody(), r = o ? e - 1 : e;
    for (let s = 0; s < Math.max(r, 1); s += 1) {
      const c = l.insertRow();
      for (let a = 0; a < t; a += 1) {
        const d = c.insertCell();
        d.innerHTML = "<br>";
      }
    }
    const n = this.editor.selection.getRange();
    n == null || n.deleteContents(), n == null || n.insertNode(i), this.editor.emitChange(), this.adjustTableHeight();
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
    const i = o.cloneNode(!0);
    [...i.children].forEach((l) => {
      l.innerHTML = "<br>";
    }), o.parentNode.insertBefore(i, e ? o : o.nextSibling), this.editor.selection.restore(), this.editor.selection.focus(), this.editor.emitChange();
  }
  deleteRow() {
    var l;
    const e = (l = this.getCurrentCell()) == null ? void 0 : l.closest("tr");
    if (!e) return;
    const t = e.closest("table"), o = e.nextElementSibling, i = e.previousElementSibling;
    if (this.editor.history.push(), e.remove(), t && t.isConnected) {
      const r = o || i;
      if (r) {
        const n = r.querySelector("td, th");
        if (n) {
          const s = document.createRange();
          s.setStart(n, 0), s.collapse(!0), this.editor.selection.setRange(s);
        }
      }
    }
    this.editor.selection.focus(), this.editor.emitChange();
  }
  addColumn(e = !1) {
    const t = this.getCurrentTable(), o = this.getCurrentCell();
    if (!t || !o) return;
    const i = o.parentNode;
    if (!i) return;
    let l = [...i.children].indexOf(o);
    l < 0 || (this.editor.selection.save(), this.editor.history.push(), t.querySelectorAll("tr").forEach((r) => {
      const n = r.children[l];
      if (!n) return;
      const s = document.createElement(n.tagName.toLowerCase() === "th" ? "th" : "td");
      s.innerHTML = "<br>", r.insertBefore(s, e ? n : n.nextSibling);
    }), this.editor.selection.restore(), this.editor.selection.focus(), this.editor.emitChange());
  }
  deleteColumn() {
    const e = this.getCurrentTable(), t = this.getCurrentCell();
    if (!e || !t) return;
    const o = t.parentNode;
    if (!o) return;
    const i = [...o.children].indexOf(t);
    if (!(i < 0)) {
      if (this.editor.history.push(), e.querySelectorAll("tr").forEach((l) => {
        var r;
        return (r = l.children[i]) == null ? void 0 : r.remove();
      }), e.isConnected) {
        const l = e.querySelector("tr");
        if (l) {
          const r = l.querySelector("td, th");
          if (r) {
            const n = document.createRange();
            n.setStart(r, 0), n.collapse(!0), this.editor.selection.setRange(n);
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
    const i = o.closest("table");
    if (!i) return;
    const l = [...i.querySelectorAll("tr")], r = l.indexOf(o), n = [...o.children], s = n.indexOf(t);
    let c, a, d;
    if (e === "next")
      if (s < n.length - 1)
        d = s + 1, a = n, c = o;
      else if (r < l.length - 1)
        c = l[r + 1], a = [...c.children], d = Math.min(s, a.length - 1);
      else if (this.addRow(!1), c = o.nextElementSibling, c)
        a = [...c.children], d = 0;
      else return;
    else if (s > 0)
      d = s - 1, a = n, c = o;
    else if (r > 0)
      c = l[r - 1], a = [...c.children], d = a.length - 1;
    else return;
    if (!c || !a) return;
    const h = a[d];
    if (!h) return;
    const u = document.createRange();
    u.setStart(h, 0), u.collapse(!0), this.editor.selection.setRange(u), this.editor.selection.focus();
  }
  handleColumnResizeStart(e) {
    const t = e.target;
    if (!t.classList.contains("ife-col-resize-handle")) return;
    e.preventDefault(), e.stopPropagation();
    const o = t.closest("table");
    if (!o) return;
    const i = e.clientX, l = parseInt(t.dataset.col, 10), r = t.dataset.startWidth ? parseFloat(t.dataset.startWidth) : 0, n = (c) => {
      const a = c.clientX - i, d = Math.max(20, r + a);
      o.querySelectorAll("tr").forEach((h) => {
        const u = h.children[l];
        u && (u.style.width = `${d}px`);
      });
    }, s = () => {
      document.removeEventListener("mousemove", n), document.removeEventListener("mouseup", s), this.addColumnResizeHandles(), this.editor.emitChange();
    };
    document.addEventListener("mousemove", n), document.addEventListener("mouseup", s);
  }
  addColumnResizeHandles() {
    this.editor.root.querySelectorAll(".ife-col-resize-handle").forEach((t) => t.remove()), this.editor.root.querySelectorAll("table.ife-table").forEach((t) => {
      const o = t.querySelector("tr");
      o && [...o.children].forEach((i, l) => {
        const r = document.createElement("div");
        r.className = "ife-col-resize-handle", r.dataset.col = l, r.dataset.startWidth = i.getBoundingClientRect().width, r.style.left = `${i.offsetLeft + i.offsetWidth - 3}px`;
        const n = o;
        n.style.position = "relative", r.style.top = "0", t.appendChild(r);
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
  /**
   * Caps oversized tables to the content box they live in, so a long table
   * scrolls together with the surrounding content instead of stretching the
   * editor.
   *
   * The editor's own content height belongs to `Editor.buildDom` (the
   * `height` option) and is deliberately left untouched here: sizing it from
   * viewport geometry (the wrapper's position plus `window.innerHeight`) made
   * the editor resize itself on every scroll/paste/selection change, which
   * broke the pinned toolbar/status-bar layout and hid the inner scrollbar.
   */
  adjustTableHeight() {
    var i;
    if (!((i = this.editor.root) != null && i.isConnected)) return;
    const e = this.editor.root.querySelectorAll("table.ife-table");
    if (!e.length) return;
    const t = getComputedStyle(this.editor.root), o = this.editor.root.clientHeight - (parseFloat(t.paddingTop) || 0) - (parseFloat(t.paddingBottom) || 0);
    o <= 0 || e.forEach((l) => {
      let r = 0, n = l.previousElementSibling;
      for (; n; ) {
        const h = getComputedStyle(n);
        r += n.offsetHeight + (parseFloat(h.marginTop) || 0) + (parseFloat(h.marginBottom) || 0), n = n.previousElementSibling;
      }
      const s = getComputedStyle(l), c = parseFloat(s.marginTop) || 0, a = parseFloat(s.marginBottom) || 0, d = o - r - c - a;
      l.style.maxHeight = `${Math.max(200, Math.floor(d))}px`;
    });
  }
  destroy() {
    var e, t;
    window.removeEventListener("resize", this.adjustTableHeight), (e = this.editor.root) == null || e.querySelectorAll("table.ife-table").forEach((o) => {
      o.style.maxHeight = "";
    }), (t = this.contextToolbar) == null || t.remove();
  }
}
export {
  g as default
};
//# sourceMappingURL=TableModule-DJ8D7usP.js.map
