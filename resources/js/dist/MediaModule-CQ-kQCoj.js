import { D as a } from "./index-B3jrLqjz.js";
const n = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/, l = /vimeo\.com\/(\d+)/;
class m {
  constructor(i) {
    this.editor = i;
  }
  openVideo() {
    const i = `
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
    this.editor.selection.save(), new a(this.editor.wrapper, {
      title: "Insert video",
      bodyHtml: i,
      confirmLabel: "Insert",
      onConfirm: (o) => {
        const t = new FormData(o);
        this.insertVideo(String(t.get("source")), Number(t.get("width")), Number(t.get("height")));
      }
    }).open();
  }
  insertVideo(i, o, t) {
    const e = i.trim();
    let r;
    if (e.startsWith("<iframe"))
      r = e;
    else if (n.test(e)) {
      const s = e.match(n)[1];
      r = `<iframe width="${o}" height="${t}" src="https://www.youtube.com/embed/${s}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else if (l.test(e)) {
      const s = e.match(l)[1];
      r = `<iframe width="${o}" height="${t}" src="https://player.vimeo.com/video/${s}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    } else
      r = `<video controls width="${o}" height="${t}"><source src="${e}"></video>`;
    this.editor.commands.insertHTML(this.editor.sanitizer.sanitize(r));
  }
  openAudio() {
    const i = `
            <label class="ife-field">
                <span>Audio file URL</span>
                <input type="url" name="source" required>
            </label>
        `;
    this.editor.selection.save(), new a(this.editor.wrapper, {
      title: "Insert audio",
      bodyHtml: i,
      confirmLabel: "Insert",
      onConfirm: (o) => {
        const e = `<audio controls><source src="${String(new FormData(o).get("source"))}"></audio>`;
        this.editor.commands.insertHTML(this.editor.sanitizer.sanitize(e));
      }
    }).open();
  }
  insertHorizontalRule() {
    this.editor.commands.insertHTML("<hr>");
  }
  destroy() {
  }
}
export {
  m as default
};
//# sourceMappingURL=MediaModule-CQ-kQCoj.js.map
