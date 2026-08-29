/**
 * In-page colour picker used for the toolbar's text / background colour
 * controls.
 *
 * Unlike the native `<input type="color">`, which opens an OS-level dialog
 * that steals focus from the editor (dropping the visible selection and
 * preventing live recolouring — the page can't hold its selection while a
 * top-level/OS modal is focused), this popover lives inside the page DOM and
 * never moves focus. The editor's contenteditable keeps focus and its
 * selection highlight, so every hue/saturation/lightness drag, preset swatch
 * click and hex entry recolours the selected text immediately and the user
 * sees it change live on every OS and browser.
 */

/**
 * @typedef {object} ColorPickerOptions
 * @property {string} id control id (e.g. 'forecolor'/'backcolor')
 * @property {string} cssProp 'color' or 'backgroundColor'
 * @property {string} label accessible label
 * @property {(hex: string) => void} onChange called live with a '#rrggbb' colour
 * @property {() => void} onClear called when the user clears the colour
 */

const PRESETS = [
    '#000000', '#444444', '#777777', '#aaaaaa', '#cccccc', '#eeeeee', '#ffffff',
    '#b71c1c', '#e53935', '#ff7043', '#fdd835', '#fbc02d', '#ffea00',
    '#1b5e20', '#43a047', '#8bc34a', '#00695c', '#26a69a', '#4dd0e1',
    '#0d47a1', '#1e88e5', '#64b5f6', '#4a148c', '#7b1fa2', '#ba68c8',
    '#880e4f', '#d81b60', '#f06292', '#4e342e', '#795548', '#a1887f',
];

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/** @returns {[number, number, number]} [h, s, l] in [0,360),[0,100],[0,100] from '#rrggbb' */
function hexToHsl(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return [0, 100, 50];
    const r = parseInt(m[1].slice(0, 2), 16) / 255;
    const g = parseInt(m[1].slice(2, 4), 16) / 255;
    const b = parseInt(m[1].slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, Math.round(l * 100)];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d) + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
}

/** @returns {string} '#rrggbb' from hue/saturation/lightness */
function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0; let g = 0; let b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default class ColorPickerModule {
    /**
     * @param {import('../core/Editor').default} editor
     * @param {HTMLElement} triggerEl toolbar button that opens this picker
     * @param {ColorPickerOptions} options
     */
    constructor(editor, triggerEl, options) {
        this.editor = editor;
        this.triggerEl = triggerEl;
        this.id = options.id;
        this.cssProp = options.cssProp;
        this.label = options.label;
        this.onChange = options.onChange;
        this.onClear = options.onClear;

        this.picker = null;
        this.hue = 0;
        this.sat = 100;
        this.lum = 50;

        this._squareDrag = false;
        this._hueDrag = false;
        this._boundOnResize = null;
        this._boundOnScroll = null;
        this._boundOnClickOutside = null;
        this._boundKeydown = null;
        this._boundPointerMove = null;
        this._boundPointerUp = null;
    }

    toggle() {
        if (this.picker) this.close();
        else this.open();
    }

    open() {
        if (this.picker) return;
        this.editor.selection.save();

        const current = this.getCurrentColor();
        const [h, s, l] = current ? hexToHsl(current) : [0, 0, 0];
        this.hue = h; this.sat = s; this.lum = l;

        this.picker = document.createElement('div');
        this.picker.className = 'ife-color-picker';
        this.picker.setAttribute('role', 'dialog');
        this.picker.setAttribute('aria-label', this.label);

        this.buildPickerBody();

        // Inherit the editor's theme CSS variables so the popover matches.
        const wrapper = this.editor.wrapper;
        ['--ife-bg', '--ife-text', '--ife-border', '--ife-btn-hover', '--ife-btn-active'].forEach((name) => {
            this.picker.style.setProperty(name, getComputedStyle(wrapper).getPropertyValue(name));
        });

        document.body.appendChild(this.picker);
        this.positionPicker();

        this._boundOnResize = () => this.positionPicker();
        this._boundOnScroll = () => { if (this.picker) this.positionPicker(); };
        this._boundOnClickOutside = (e) => {
            if (!this.picker) return;
            if (this.picker.contains(e.target)) return;
            if (this.triggerEl && this.triggerEl.contains(e.target)) return;
            this.close();
        };
        this._boundKeydown = (e) => {
            if (e.key === 'Escape') this.close();
        };
        window.addEventListener('resize', this._boundOnResize);
        window.addEventListener('scroll', this._boundOnScroll, { passive: true });
        document.addEventListener('click', this._boundOnClickOutside);
        document.addEventListener('keydown', this._boundKeydown);

        this.render();
    }

    buildPickerBody() {
        const hueHolder = document.createElement('div');
        hueHolder.className = 'ife-color-picker__hue';
        hueHolder.setAttribute('aria-label', 'Hue');

        const squareHolder = document.createElement('div');
        squareHolder.className = 'ife-color-picker__square';
        squareHolder.setAttribute('aria-label', 'Saturation and brightness');

        const controls = document.createElement('div');
        controls.className = 'ife-color-picker__controls';

        const field = document.createElement('div');
        field.className = 'ife-color-picker__field';

        const fieldLabel = document.createElement('span');
        fieldLabel.className = 'ife-color-picker__field-label';
        fieldLabel.textContent = this.label;

        const hex = document.createElement('input');
        hex.type = 'text';
        hex.className = 'ife-color-picker__hex';
        hex.value = hslToHex(this.hue, this.sat, this.lum);
        hex.setAttribute('aria-label', `${this.label} hex`);
        hex.addEventListener('input', () => {
            const m = /^#?([0-9a-f]{6})$/i.exec(hex.value.trim());
            if (!m) return;
            const [hh, ss, ll] = hexToHsl(`#${m[1]}`);
            this.hue = hh; this.sat = ss; this.lum = ll;
            this.render();
            this.emit();
        });
        hex.addEventListener('mousedown', (e) => e.stopPropagation());

        const preview = document.createElement('span');
        preview.className = 'ife-color-picker__preview';
        preview.setAttribute('aria-hidden', 'true');

        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'ife-color-picker__clear';
        clear.textContent = '✕';
        clear.title = 'Clear colour';
        clear.setAttribute('aria-label', 'Clear colour');
        clear.addEventListener('mousedown', (e) => e.preventDefault());
        clear.addEventListener('click', () => {
            if (this.onClear) this.onClear();
            this.close();
        });

        field.appendChild(fieldLabel);
        field.appendChild(hex);
        field.appendChild(preview);
        field.appendChild(clear);

        const swatchGrid = document.createElement('div');
        swatchGrid.className = 'ife-color-picker__swatches';
        swatchGrid.setAttribute('role', 'group');
        swatchGrid.setAttribute('aria-label', 'Preset colours');
        PRESETS.forEach((color) => {
            const sw = document.createElement('button');
            sw.type = 'button';
            sw.className = 'ife-color-picker__swatch';
            sw.style.backgroundColor = color;
            sw.title = color;
            sw.setAttribute('aria-label', color);
            sw.setAttribute('data-color', color);
            sw.addEventListener('mousedown', (e) => e.preventDefault());
            sw.addEventListener('click', () => {
                const [hh, ss, ll] = hexToHsl(color);
                this.hue = hh; this.sat = ss; this.lum = ll;
                // Presets apply their EXACT colour (a preset hex may not survive a
                // round-trip through hue/sat/lum unscathed), while the drag handles
                // still move to the preset's position.
                this.render();
                this.emit(color);
            });
            swatchGrid.appendChild(sw);
        });

        controls.appendChild(hueHolder);
        controls.appendChild(squareHolder);
        controls.appendChild(field);
        controls.appendChild(swatchGrid);
        this.picker.appendChild(controls);

        this.square = squareHolder;
        this.hueEl = hueHolder;
        this.hexEl = hex;
        this.previewEl = preview;

        this.square.addEventListener('pointerdown', (e) => this.onSquareDown(e));
        this.hueEl.addEventListener('pointerdown', (e) => this.onHueDown(e));
        this._boundPointerMove = (e) => this.onPointerMove(e);
        this._boundPointerUp = () => {
            this._squareDrag = false;
            this._hueDrag = false;
        };
        document.addEventListener('pointermove', this._boundPointerMove);
        document.addEventListener('pointerup', this._boundPointerUp);

        // Keep the contenteditable selection from collapsing if the user drags
        // out of the square/hue.
        this.picker.addEventListener('mousedown', (e) => {
            if (!e.target.closest('input')) e.preventDefault();
        });
    }

    render() {
        if (!this.picker) return;
        const hex = hslToHex(this.hue, this.sat, this.lum);

        // Square background: left = white (sat 0), right = saturated hue,
        // bottom = black (lum 0), top = full (lum 100).
        this.square.style.background =
            `linear-gradient(to top, #000, transparent), ` +
            `linear-gradient(to left, #fff, hsl(${this.hue}, 100%, 50%))`;

        const squareHandle = this.square.querySelector('.ife-color-picker__square-handle')
            || (() => {
                const h = document.createElement('span');
                h.className = 'ife-color-picker__square-handle';
                this.square.appendChild(h);
                return h;
            })();
        squareHandle.style.left = `${this.sat}%`;
        squareHandle.style.top = `${100 - this.lum}%`;

        this.hueEl.style.background =
            'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)';
        const hueHandle = this.hueEl.querySelector('.ife-color-picker__hue-handle')
            || (() => {
                const h = document.createElement('span');
                h.className = 'ife-color-picker__hue-handle';
                this.hueEl.appendChild(h);
                return h;
            })();
        hueHandle.style.left = `${(this.hue / 360) * 100}%`;

        this.hexEl.value = hex;
        this.previewEl.style.backgroundColor = hex;
    }

    emit(hexOverride) {
        const hex = hexOverride || hslToHex(this.hue, this.sat, this.lum);
        this.hexEl.value = hex;
        this.previewEl.style.backgroundColor = hex;
        if (this.onChange) this.onChange(hex);
    }

    onSquareDown(e) {
        e.preventDefault();
        this._squareDrag = true;
        this._squareFromPointer(e);
    }

    onHueDown(e) {
        e.preventDefault();
        this._hueDrag = true;
        this._hueFromPointer(e);
    }

    onPointerMove(e) {
        if (this._squareDrag) this._squareFromPointer(e);
        if (this._hueDrag) this._hueFromPointer(e);
    }

    _squareFromPointer(e) {
        const rect = this.square.getBoundingClientRect();
        const x = clamp((e.clientX - rect.left) / rect.width, 0, 1) * 100;
        const y = clamp((e.clientY - rect.top) / rect.height, 0, 1) * 100;
        this.sat = Math.round(x);
        this.lum = Math.round(100 - y);
        this.render();
        this.emit();
    }

    _hueFromPointer(e) {
        const rect = this.hueEl.getBoundingClientRect();
        const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        this.hue = Math.round(x * 360);
        this.render();
        this.emit();
    }

    getCurrentColor() {
        const range = this.editor.selection.getRange();
        if (!range) return '';
        let node = range.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        let el = node instanceof HTMLElement ? node : null;
        while (el && el !== this.editor.root) {
            if (el.style?.[this.cssProp]) {
                const value = el.style[this.cssProp];
                const m = /^#([0-9a-f]{6})$/i.exec(value);
                if (m) return `#${m[1].toLowerCase()}`;
                const rgb = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
                if (rgb) {
                    const t = (n) => parseInt(n, 10).toString(16).padStart(2, '0');
                    return `#${t(rgb[1])}${t(rgb[2])}${t(rgb[3])}`;
                }
            }
            el = el.parentElement;
        }
        return '';
    }

    positionPicker() {
        if (!this.triggerEl || !this.picker) return;
        const rect = this.triggerEl.getBoundingClientRect();
        const width = this.picker.offsetWidth;
        const height = this.picker.offsetHeight;
        let top = rect.bottom + 4;
        let left = rect.left;
        if (top + height > window.innerHeight && rect.top - height - 4 > 0) {
            top = rect.top - height - 4;
        }
        if (left + width > window.innerWidth) left = Math.max(8, window.innerWidth - width - 8);
        if (left < 0) left = 8;
        const wrapperZ = parseFloat(getComputedStyle(this.editor.wrapper).zIndex);
        if (!isNaN(wrapperZ)) this.picker.style.zIndex = wrapperZ + 1;
        this.picker.style.top = `${top}px`;
        this.picker.style.left = `${left}px`;
    }

    close() {
        if (this.picker) {
            this.picker.remove();
            this.picker = null;
        }
        if (this._boundOnResize) window.removeEventListener('resize', this._boundOnResize);
        if (this._boundOnScroll) window.removeEventListener('scroll', this._boundOnScroll);
        if (this._boundOnClickOutside) document.removeEventListener('click', this._boundOnClickOutside);
        if (this._boundKeydown) document.removeEventListener('keydown', this._boundKeydown);
        if (this._boundPointerMove) document.removeEventListener('pointermove', this._boundPointerMove);
        if (this._boundPointerUp) document.removeEventListener('pointerup', this._boundPointerUp);
        this._boundOnResize = null;
        this._boundOnScroll = null;
        this._boundOnClickOutside = null;
        this._boundKeydown = null;
        this._boundPointerMove = null;
        this._boundPointerUp = null;
    }

    destroy() {
        this.close();
    }
}
