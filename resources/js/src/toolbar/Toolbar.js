import ToolbarConfig from './ToolbarConfig.js';
import Localization from '../i18n/Localization.js';

const DEFAULT_LAYOUT = [
    ['undo', 'redo'],
    ['blockFormat', 'fontFamily', 'fontSize'],
    ['bold', 'italic', 'underline', 'strike', 'superscript', 'subscript'],
    ['forecolor', 'backcolor', 'removeFormat'],
    ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'],
    ['bulletList', 'orderedList', 'checklist', 'indent', 'outdent'],
    ['link', 'unlink', 'image', 'video', 'audio', 'table', 'hr'],
    ['blockquote', 'codeInline', 'codeBlock', 'note'],
    ['emoji', 'specialChars'],
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
        const select = document.createElement('select');
        select.className = 'ife-toolbar__select';
        select.setAttribute('aria-label', def.label);
        def.options.forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        });

        select.addEventListener('mousedown', (event) => {
            event.stopPropagation();
            this.editor.selection.save();
        });
        select.addEventListener('change', () => {
            this.editor.selection.restore();
            def.onChange(this.editor, select.value);
            this.syncActiveStates();
        });

        this.buttons.set(id, select);
        return select;
    }

    buildColorPicker(id, def) {
        const wrapper = document.createElement('label');
        wrapper.className = 'ife-toolbar__color';
        wrapper.title = def.label;
        wrapper.innerHTML = def.icon;

        const input = document.createElement('input');
        input.type = 'color';
        input.setAttribute('aria-label', def.label);
        input.addEventListener('input', () => {
            this.editor.selection.restore();
            this.editor.commands.exec(def.command, input.value);
        });

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

        this._syncSelectValue('fontFamily', this._getComputedFontFamily());
        this._syncSelectValue('fontSize', this._getComputedFontSize());
        this._syncBlockFormat(block);
    }

    _syncBlockFormat(block) {
        const select = this.buttons.get('blockFormat');
        if (!(select instanceof HTMLSelectElement)) return;
        const tag = block ? block.tagName.toLowerCase() : 'p';
        for (const [value] of ToolbarConfig.blockFormat.options) {
            if (value === tag) {
                select.value = value;
                return;
            }
        }
        select.value = 'p';
    }

    _getStyleNode() {
        const sel = this.editor.selection.getNativeSelection();
        if (!sel || !sel.rangeCount) return null;
        const range = sel.getRangeAt(0);
        if (!this.editor.root.contains(range.commonAncestorContainer)) return null;
        let node = range.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        return node;
    }

    _getComputedFontFamily() {
        const node = this._getStyleNode();
        if (!node) return '';
        const ff = getComputedStyle(node).fontFamily;
        return ff ? ff.replace(/["']/g, '').split(',')[0].trim() : '';
    }

    _getComputedFontSize() {
        const node = this._getStyleNode();
        if (!node) return '';
        return getComputedStyle(node).fontSize;
    }

    _syncSelectValue(id, computedValue) {
        const select = this.buttons.get(id);
        if (!(select instanceof HTMLSelectElement)) return;

        const def = ToolbarConfig[id];
        if (!def || !def.options) return;

        for (const [optionValue] of def.options) {
            if (!optionValue) continue;
            if (id === 'fontFamily') {
                const optionName = optionValue.replace(/["']/g, '').split(',')[0].trim();
                if (computedValue.toLowerCase() === optionName.toLowerCase()) {
                    select.value = optionValue;
                    return;
                }
            } else if (id === 'fontSize') {
                const computedNum = parseFloat(computedValue);
                const optionNum = parseFloat(optionValue);
                if (!isNaN(computedNum) && !isNaN(optionNum) && Math.abs(computedNum - optionNum) < 0.5) {
                    select.value = optionValue;
                    return;
                }
            } else {
                if (computedValue === optionValue) {
                    select.value = optionValue;
                    return;
                }
            }
        }

        if (select.value !== '') select.value = '';
    }

    setEnabled(id, enabled) {
        const control = this.buttons.get(id);
        if (control instanceof HTMLButtonElement || control instanceof HTMLSelectElement) {
            control.disabled = !enabled;
        }
    }

    destroy() {
        this.el.remove();
    }
}
