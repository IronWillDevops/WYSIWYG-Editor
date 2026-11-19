import { D as n } from "./index-N4YkchP4.js";
const d = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/, c = /vimeo\.com\/(\d+)/;
class h {
  constructor(t) {
    this.editor = t, this.dialog = null;
  }
  openVideo() {
    const t = `
            <label class="ife-field">
                <span>YouTube / Vimeo URL, direct .mp4 URL, or raw iframe embed code</span>
                <input type="text" name="source" placeholder="https://www.youtube.com/watch?v=..." required>
            </label>
            <label class="ife-field">
                <span>Width</span>
                <input type="number" name="width" value="640">
            </label>
            <label class="ife-field">
                <span>Height</span>
                <input type="number" name="height" value="360">
            </label>
        `;
    this.editor.selection.save(), this.dialog = new n(this.editor.wrapper, {
      title: "Insert video",
      bodyHtml: t,
      confirmLabel: "Insert",
      onConfirm: (o) => {
        const i = new FormData(o);
        if (this.insertVideo(
          String(i.get("source")),
          Number(i.get("width")),
          Number(i.get("height"))
        ) === !1) return !1;
        this.dialog = null;
      }
    }), this.dialog.open();
  }
  insertVideo(t, o, i) {
    const e = String(t ?? "").trim();
    if (!e) return !1;
    const r = Number.isFinite(o) && o > 0 ? o : 640, l = Number.isFinite(i) && i > 0 ? i : 360;
    let s;
    if (/^<iframe/i.test(e))
      s = e;
    else if (d.test(e)) {
      const a = e.match(d)[1];
      s = `<iframe width="${r}" height="${l}" src="https://www.youtube.com/embed/${a}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else if (c.test(e)) {
      const a = e.match(c)[1];
      s = `<iframe width="${r}" height="${l}" src="https://player.vimeo.com/video/${a}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    } else
      s = `<video controls width="${r}" height="${l}"><source src="${e}"></video>`;
    return this.editor.commands.insertHTML(this.editor.sanitizer.sanitize(s)), !0;
  }
  openAudio() {
    const t = `
            <label class="ife-field">
                <span>Audio file URL</span>
                <input type="url" name="source" required>
            </label>
        `;
    this.editor.selection.save(), this.dialog = new n(this.editor.wrapper, {
      title: "Insert audio",
      bodyHtml: t,
      confirmLabel: "Insert",
      onConfirm: (o) => {
        const i = String(new FormData(o).get("source") ?? "").trim();
        if (!i) return !1;
        const e = `<audio controls><source src="${i}"></audio>`;
        this.editor.commands.insertHTML(this.editor.sanitizer.sanitize(e)), this.dialog = null;
      }
    }), this.dialog.open();
  }
  insertHorizontalRule() {
    this.editor.commands.insertHTML("<hr>");
  }
  destroy() {
    var t;
    (t = this.dialog) == null || t.close(), this.dialog = null;
  }
}
export {
  h as default
};
//# sourceMappingURL=MediaModule-Dc41aijn.js.map
