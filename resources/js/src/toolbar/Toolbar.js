import ToolbarConfig from './ToolbarConfig.js';
import Localization from '../i18n/Localization.js';

const DEFAULT_LAYOUT = [
    ['undo', 'redo'],
    ['blockFormat'],
    ['bold', 'italic', 'underline', 'strike', 'superscript', 'subscript'],
    ['forecolor', 'backcolor', 'removeFormat'],
    ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'],
    ['ltr', 'rtl'],
    ['bulletList', 'orderedList', 'checklist', 'indent', 'outdent', 'listProps'],
    ['link', 'unlink', 'image', 'video', 'audio', 'table', 'hr'],
    ['blockquote', 'codeInline', 'codeBlock', 'note'],
    ['emoji', 'specialChars'],
    ['date', 'time', 'anchor', 'templates'],
    ['markdown'],
    ['find', 'sourceCode', 'fullscreen'],
];

/** Builds a configurable, accessible toolbar and wires clicks to editor commands. */
export default class Toolbar {
    /**
     * @param {import('../core/Editor').default} editor
     * @param {Array<string[]>|null} [layout]
     */
    constructor(editor, layout = null) {
        this.editor = editor;
        this.layout = layout ?? DEFAULT_LAYOUT;
        this.buttons = new Map();

        this.el = document.createElement('div');
        this.el.className = 'ife-toolbar';
        this.el.setAttribute('role', 'toolbar');
        this.el.setAttribute('aria-label', 'Text formatting');

        this.render();
        this.editor.wrapper.insertBefore(this.el, this.editor.root);

        this.editor.on('selectionchange', () => this.syncActiveStates());
        this.editor.on('focus', () => this.syncActiveStates());

        // Live recolouring: while the user picks a color the toolbar remembers it
        // as "pending"; as they then drag a selection handle to expand the
        // selection, every selectionchange re-applies that color to the growing
        // text (idempotently, without collapsing the live selection) so the new
        // portion is tinted as it is selected.
        this._liveColor = null;
        this._liveTimer = null;
        this._liveIdleTimer = null;
        this._liveLastSelection = '';
        // Color inputs whose native dialog is open. While a dialog is open the
        // browser owns `input.value`: writing to it programmatically (e.g. in
        // syncActiveStates) forces the dialog to commit the current pick and
        // stop emitting live `input` events, so only the final `change` on close
        // would apply. These are guarded against any `.value` write while open.
        this._openColorPickers = new Set();
        this._handleLiveSelection = () => {
            if (!this._liveColor) return;
            const sel = this.editor.selection.getNativeSelection();
            if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
            const range = sel.getRangeAt(0);
            if (!this.editor.root.contains(range.commonAncestorContainer)) return;
            const text = sel.toString();
            if (!text.trim()) return;
            if (text !== this._liveLastSelection) {
                clearTimeout(this._liveTimer);
                this._liveTimer = setTimeout(() => {
                    this._liveLastSelection = text;
                    const { command, value } = this._liveColor;
                    // Re-save the grown selection before exec: exec() restores
                    // the saved selection, so without this it would clobber the
                    // grown text back to the original pick and never colour it.
                    this.editor.selection.save();
                    this.editor.commands.exec(command, value);
                }, 40);
            }
            // Stop live recolouring shortly after the drag settles so a later,
            // unrelated selection isn't tinted automatically.
            clearTimeout(this._liveIdleTimer);
            this._liveIdleTimer = setTimeout(() => this.disarmLiveColor(), 1500);
        };
        document.addEventListener('selectionchange', this._handleLiveSelection);
        document.addEventListener('mouseup', this._handleLiveSelection);

        // Capture the selection at the toolbar level (capture phase, before any
        // child control's default behavior) so that interacting with native
        // controls that steal focus — the block-format <select>, color inputs,
        // etc. — never loses the user's text selection before the command runs.
        this.el.addEventListener('mousedown', () => {
            this.editor.selection.save();
        }, true);
    }

    render() {
        this.layout.forEach((group) => {
            const groupEl = document.createElement('div');
            groupEl.className = 'ife-toolbar__group';

            group.forEach((id) => {
                const def = ToolbarConfig[id];
                if (!def) return;
                const control = this.buildControl(id, def);
                if (control) groupEl.appendChild(control);
            });

            if (groupEl.children.length) this.el.appendChild(groupEl);
        });

    }

    buildControl(id, def) {
        if (def.type === 'select') return this.buildSelect(id, def);
        if (def.type === 'color') return this.buildColorPicker(id, def);
        return this.buildButton(id, def);
    }

    buildButton(id, def) {
        const locale = this.editor.options.locale ?? 'en';
        let label = Localization.t(locale, id) !== id ? Localization.t(locale, id) : def.label;

        if (def.shortcut) {
            const macShortcut = def.shortcut.replace(/Ctrl/g, '⌘');
            label += ` (${def.shortcut} / ${macShortcut})`;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ife-toolbar__btn';
        button.dataset.command = id;
        button.title = label;
        button.setAttribute('aria-label', label);
        button.innerHTML = def.icon ?? '';

        button.addEventListener('mousedown', (event) => event.preventDefault()); // keep editor selection
        button.addEventListener('click', () => {
            this.editor.selection.restore();
            if (def.type === 'command') {
                this.editor.commands.exec(def.command);
            } else {
                def.action?.(this.editor, button);
            }
            if (def.toggle) button.classList.toggle('is-active');
            this.syncActiveStates();
        });

        this.buttons.set(id, button);
        return button;
    }

    buildSelect(id, def) {
        const locale = this.editor.options.locale ?? 'en';
        const select = document.createElement('select');
        select.className = 'ife-toolbar__select';
        select.setAttribute('aria-label', Localization.t(locale, id) !== id ? Localization.t(locale, id) : def.label);
        def.options.forEach(([value, text]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            select.appendChild(option);
        });

        select.addEventListener('pointerdown', () => {
            this.editor.selection.save();
        });
        select.addEventListener('mousedown', () => {
            this.editor.selection.save();
        });
        select.addEventListener('change', () => {
            // Capture the user's chosen value *before* restore(). Restoring the
            // text selection fires a selectionchange that re-runs
            // syncActiveStates(), which rewrites this select to the current
            // block tag. Reading select.value after restore() would therefore
            // apply the stale block tag instead of the format the user picked.
            const value = select.value;
            this.editor.selection.restore();
            def.onChange(this.editor, value);
            this.syncActiveStates();
        });

        this.buttons.set(id, select);
        return select;
    }

    buildColorPicker(id, def) {
        const locale = this.editor.options.locale ?? 'en';
        const label = Localization.t(locale, id) !== id ? Localization.t(locale, id) : def.label;
        const wrapper = document.createElement('label');
        wrapper.className = 'ife-toolbar__color';
        wrapper.title = label;
        wrapper.innerHTML = def.icon;

        const input = document.createElement('input');
        input.type = 'color';
        input.setAttribute('aria-label', label);
        // Save the current editor selection before the native color dialog can
        // steal focus (pointerdown + mousedown, mirroring the block-format
        // select) so the chosen color is applied back to the original text
        // selection rather than to a lost/empty one.
        const cssProp = def.command === 'backColor' ? 'backgroundColor' : 'color';
        const syncValue = () => {
            if (this._openColorPickers.has(input)) return;
            const color = this.getCurrentColor(cssProp);
            if (color) input.value = color;
        };
        input.addEventListener('pointerdown', () => {
            this.editor.selection.save();
            syncValue();
            // Mark the dialog as open AFTER syncing, so the very first sync (the
            // one that opens the dialog at the current color) still runs, but any
            // later selectionchange-driven sync cannot overwrite the value while
            // the browser is dragging.
            this._openColorPickers.add(input);
        });
        input.addEventListener('mousedown', () => {
            this.editor.selection.save();
            syncValue();
            this._openColorPickers.add(input);
        });
        input.addEventListener('input', () => {
            // Apply the chosen color to the saved selection WITHOUT calling the
            // focusing `selection.restore()`: `.focus()` while the native color
            // dialog is open dismisses it, so only one color could ever be
            // picked. Restoring by character offsets (robust to the DOM splits
            // colouring performs) keeps the dialog open so the color updates in
            // real time as the user drags in the picker.
            this.editor.selection.restoreSavedOffsets();
            this.editor.commands.exec(def.command, input.value);
            // Arm live recolouring. If the user now drags a selection handle to
            // select more text, each newly selected portion is automatically
            // tinted with the colour they just chose (idempotently, without
            // collapsing the live selection).
            this.armLiveColor({ command: def.command, value: input.value });
        });
        input.addEventListener('change', () => {
            // The native dialog closed with an accepted color. Apply it here as
            // a safety net for browsers that fire only one (or coalesced) `input`
            // events, then release the dialog so syncActiveStates can resume
            // syncing input.value again.
            this.editor.selection.restoreSavedOffsets();
            this.editor.commands.exec(def.command, input.value);
            this.armLiveColor({ command: def.command, value: input.value });
            this._openColorPickers.delete(input);
        });
        input.addEventListener('blur', () => this._openColorPickers.delete(input));

        wrapper.appendChild(input);
        this.buttons.set(id, wrapper);
        return wrapper;
    }

    /** Reflects current formatting state (bold/italic/... active) on toolbar buttons. */
    syncActiveStates() {
        const stateMap = {
            bold: 'bold',
            italic: 'italic',
            underline: 'underline',
            strike: 'strikeThrough',
            superscript: 'superscript',
            subscript: 'subscript',
            bulletList: 'insertUnorderedList',
            orderedList: 'insertOrderedList',
        };

        Object.entries(stateMap).forEach(([id, command]) => {
            const button = this.buttons.get(id);
            if (button instanceof HTMLElement) {
                button.classList.toggle('is-active', this.editor.commands.queryState(command));
            }
        });

        const block = this.editor.selection.getBlockElement();
        let activeAlign = '';
        if (block) {
            let el = block;
            while (el && el !== this.editor.root) {
                if (el.style.textAlign) {
                    activeAlign = el.style.textAlign;
                    break;
                }
                el = el.parentElement;
            }
        }

        ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'].forEach((id) => {
            const button = this.buttons.get(id);
            if (button instanceof HTMLElement) {
                button.classList.toggle('is-active', activeAlign === id.replace('align', '').toLowerCase());
            }
        });

        const dirBtnLtr = this.buttons.get('ltr');
        const dirBtnRtl = this.buttons.get('rtl');
        if (dirBtnLtr instanceof HTMLElement && dirBtnRtl instanceof HTMLElement) {
            let activeDir = '';
            if (block) {
                let el = block;
                while (el && el !== this.editor.root) {
                    if (el.dir) {
                        activeDir = el.dir;
                        break;
                    }
                    el = el.parentElement;
                }
            }
            dirBtnLtr.classList.toggle('is-active', activeDir === 'ltr');
            dirBtnRtl.classList.toggle('is-active', activeDir === 'rtl');
        }

        const markdownBtn = this.buttons.get('markdown');
        if (markdownBtn instanceof HTMLElement) {
            markdownBtn.classList.toggle('is-active', this.editor.root.dataset.markdownMode === 'true');
        }

        const blockquoteBtn = this.buttons.get('blockquote');
        if (blockquoteBtn instanceof HTMLElement) {
            let isBlockquote = false;
            if (block) {
                let el = block;
                while (el && el !== this.editor.root) {
                    if (el.tagName === 'BLOCKQUOTE') {
                        isBlockquote = true;
                        break;
                    }
                    el = el.parentElement;
                }
            }
            blockquoteBtn.classList.toggle('is-active', isBlockquote);
        }

        const blockFormatSelect = this.buttons.get('blockFormat');
        if (blockFormatSelect instanceof HTMLSelectElement && block) {
            const tagName = block.tagName.toLowerCase();
            const validValues = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
            blockFormatSelect.value = validValues.includes(tagName) ? tagName : 'p';
        }

        // Keep the native color inputs in step with the current selection so the
        // picker opens on the color that is actually applied (instead of always
        // defaulting to black/white). Without this, the first interaction reports
        // the stale default (#000000), which the command layer treats as "no
        // color" and wrongly clears the selection instead of applying the color.
        // While a color dialog is open this sync is skipped so the browser's
        // ownership of `input.value` during the drag is never disturbed (which
        // would stop live `input` events and apply only on close).
        ['forecolor', 'backcolor'].forEach((id) => {
            const def = ToolbarConfig[id];
            const wrapper = this.buttons.get(id);
            if (!def || !(wrapper instanceof HTMLInputElement || wrapper instanceof HTMLLabelElement)) return;
            const input = wrapper.querySelector('input[type="color"]');
            if (!input || this._openColorPickers.has(input)) return;
            const cssProp = def.command === 'backColor' ? 'backgroundColor' : 'color';
            const color = this.getCurrentColor(cssProp);
            if (color) input.value = color;
        });
    }

    /**
     * Returns the effective inline color of the current selection for the given
     * CSS property (e.g. 'color' or 'backgroundColor'), walking up from the
     * caret to the nearest element that sets it, normalized to '#rrggbb' so it
     * can be assigned to a native <input type="color"> value.
     * @param {string} cssProp camelCase CSS property name
     * @returns {string} normalized hex color, or '' when none is set
     */
    getCurrentColor(cssProp) {
        const range = this.editor.selection.getRange();
        if (!range) return '';
        let node = range.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        let el = node instanceof HTMLElement ? node : null;
        while (el && el !== this.editor.root) {
            if (el.style?.[cssProp]) {
                return this.normalizeColorValue(el.style[cssProp]);
            }
            el = el.parentElement;
        }
        return '';
    }

    /** Normalizes a CSS color ('#ff0000', 'rgb(255, 0, 0)', ...) to '#rrggbb'. */
    normalizeColorValue(value) {
        if (!value) return '';
        const trimmed = String(value).trim();
        const match = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (match) {
            const toHex = (n) => parseInt(n, 10).toString(16).padStart(2, '0');
            return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
        }
        return trimmed;
    }

    setEnabled(id, enabled) {
        const control = this.buttons.get(id);
        if (control instanceof HTMLButtonElement || control instanceof HTMLSelectElement) {
            control.disabled = !enabled;
        }
    }

    /**
     * Remembers the colour so dragging a selection handle recolours
     * newly-selected text with it (see the document selectionchange hook).
     * @param {{command: string, value: string}} live
     */
    armLiveColor(live) {
        this._liveColor = live;
        this._liveLastSelection = '';
    }

    /** Stops automatic recolouring on selection changes. */
    disarmLiveColor() {
        this._liveColor = null;
        this._liveLastSelection = '';
        clearTimeout(this._liveTimer);
        clearTimeout(this._liveIdleTimer);
    }

    destroy() {
        this.disarmLiveColor();
        document.removeEventListener('selectionchange', this._handleLiveSelection);
        document.removeEventListener('mouseup', this._handleLiveSelection);
        this.el.remove();
    }
}
