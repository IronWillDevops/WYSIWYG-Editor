import { D as s } from "./index-Cq8Mug0c.js";
const i = {
  blank: {
    label: "Blank page",
    html: "<p></p>"
  },
  article: {
    label: "Article",
    html: "<h1>Title</h1><p>Start writing your article here. This is a great place to introduce your topic and grab the reader's attention.</p><h2>Section heading</h2><p>Add your content here. Use headings to organize your thoughts and make your writing more scannable.</p>"
  },
  twoColumns: {
    label: "Two columns",
    html: '<table class="ife-table" style="width:100%"><tr><td style="width:50%"><h3>Column 1</h3><p>Content for the left column.</p></td><td style="width:50%"><h3>Column 2</h3><p>Content for the right column.</p></td></tr></table>'
  },
  checklist: {
    label: "Checklist",
    html: '<h3>Checklist</h3><ul class="ife-checklist"><li><input type="checkbox"> Task 1</li><li><input type="checkbox"> Task 2</li><li><input type="checkbox"> Task 3</li></ul>'
  },
  contactForm: {
    label: "Contact info",
    html: "<h3>Contact</h3><p><strong>Email:</strong> email@example.com</p><p><strong>Phone:</strong> +1 (555) 123-4567</p><p><strong>Address:</strong> 123 Main Street, City</p>"
  }
};
class h {
  constructor(t) {
    this.editor = t;
  }
  open() {
    const e = `
            <label class="ife-field">
                <span>Template</span>
                <select name="template">${Object.entries(i).map(
      ([o, l]) => `<option value="${o}">${l.label}</option>`
    ).join("")}</select>
            </label>
        `;
    this.dialog = new s(this.editor.wrapper, {
      title: "Insert template",
      bodyHtml: e,
      confirmLabel: "Insert",
      onConfirm: (o) => {
        const l = new FormData(o), n = String(l.get("template"));
        this.insert(n);
      }
    }), this.editor.selection.save(), this.dialog.open();
  }
  insert(t) {
    const e = i[t];
    e && (this.editor.history.push(), this.editor.selection.restore(), this.editor.commands.insertHTML(e.html));
  }
  destroy() {
    var t;
    (t = this.dialog) == null || t.close();
  }
}
export {
  h as default
};
//# sourceMappingURL=TemplateModule-C1-_VjOW.js.map
