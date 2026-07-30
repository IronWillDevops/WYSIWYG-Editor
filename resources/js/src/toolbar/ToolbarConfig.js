import Icons from '../icons/Icons.js';
import Dialog from '../utils/Dialog.js';

/**
 * Declarative button registry. `command` buttons call editor.commands.exec()
 * directly; `action` buttons call a resolver function that may open a module
 * dialog or run custom logic (table/link/image/find/fullscreen/...).
 *
 * @typedef {object} ButtonDef
 * @property {string} icon
 * @property {string} label
 * @property {'command'|'action'|'select'|'color'} type
 * @property {string} [command]
 * @property {any} [value]
 * @property {(editor: import('../core/Editor').default) => void} [action]
 */

/** @type {Record<string, ButtonDef>} */
const ToolbarConfig = {
    undo: { icon: Icons.undo, label: 'Undo', shortcut: 'Ctrl+Z', type: 'action', action: (e) => e.undo() },
    redo: { icon: Icons.redo, label: 'Redo', shortcut: 'Ctrl+Y', type: 'action', action: (e) => e.redo() },

    blockFormat: {
        label: 'Paragraph style',
        type: 'select',
        options: [
            ['p', 'Paragraph'],
            ['h1', 'Heading 1'],
            ['h2', 'Heading 2'],
            ['h3', 'Heading 3'],
            ['h4', 'Heading 4'],
            ['h5', 'Heading 5'],
            ['h6', 'Heading 6'],
            ['blockquote', 'Blockquote'],
            ['pre', 'Preformatted'],
        ],
        onChange: (editor, value) => editor.commands.exec('blockFormat', value),
    },

    fontFamily: {
        label: 'Font family',
        type: 'select',
        options: [
            ['', 'Default'],
            ['Arial, sans-serif', 'Arial'],
            ['Georgia, serif', 'Georgia'],
            ['"Courier New", monospace', 'Courier New'],
            ['"Times New Roman", serif', 'Times New Roman'],
            ['Verdana, sans-serif', 'Verdana'],
        ],
        onChange: (editor, value) => editor.commands.exec('fontName', value),
    },

    fontSize: {
        label: 'Font size',
        type: 'select',
        options: [
            ['12px', '12'], ['14px', '14'], ['16px', '16'], ['18px', '18'],
            ['24px', '24'], ['32px', '32'], ['48px', '48'],
        ],
        onChange: (editor, value) => editor.commands.exec('fontSize', value),
    },

    bold: { icon: Icons.bold, label: 'Bold', shortcut: 'Ctrl+B', type: 'command', command: 'bold' },
    italic: { icon: Icons.italic, label: 'Italic', shortcut: 'Ctrl+I', type: 'command', command: 'italic' },
    underline: { icon: Icons.underline, label: 'Underline', shortcut: 'Ctrl+U', type: 'command', command: 'underline' },
    strike: { icon: Icons.strikeThrough, label: 'Strikethrough', type: 'command', command: 'strikeThrough' },
    superscript: { icon: Icons.superscript, label: 'Superscript', type: 'command', command: 'superscript' },
    subscript: { icon: Icons.subscript, label: 'Subscript', type: 'command', command: 'subscript' },

    forecolor: { icon: Icons.formatColorText, label: 'Text color', type: 'color', command: 'foreColor' },
    backcolor: { icon: Icons.formatColorFill, label: 'Background color', type: 'color', command: 'backColor' },
    removeFormat: {
        icon: Icons.clearFormat,
        label: 'Clear formatting',
        type: 'command',
        command: 'removeFormat',
    },

    alignLeft: { icon: Icons.alignLeft, label: 'Align left', type: 'command', command: 'justifyLeft' },
    alignCenter: { icon: Icons.alignCenter, label: 'Align center', type: 'command', command: 'justifyCenter' },
    alignRight: { icon: Icons.alignRight, label: 'Align right', type: 'command', command: 'justifyRight' },
    alignJustify: { icon: Icons.alignJustify, label: 'Justify', type: 'command', command: 'justifyFull' },

    bulletList: { icon: Icons.listBulleted, label: 'Bulleted list', type: 'command', command: 'insertUnorderedList' },
    orderedList: { icon: Icons.listNumbered, label: 'Numbered list', type: 'command', command: 'insertOrderedList' },
    checklist: {
        icon: Icons.checklist,
        label: 'Checklist',
        type: 'action',
        action: (e) => e.commands.insertHTML('<ul class="ife-checklist"><li><input type="checkbox"> Item</li></ul>'),
    },
    indent: { icon: Icons.indent, label: 'Increase indent', type: 'command', command: 'indent' },
    outdent: { icon: Icons.outdent, label: 'Decrease indent', type: 'command', command: 'outdent' },

    link: { icon: Icons.link, label: 'Insert/edit link', shortcut: 'Ctrl+K', type: 'action', action: (e) => e.module('link').open() },
    unlink: {
        icon: Icons.unlink,
        label: 'Remove link',
        type: 'action',
        action: (e) => {
            const anchor = e.selection.closest('a');
            if (anchor) e.module('link').remove(anchor);
        },
    },

    image: { icon: Icons.image, label: 'Insert image', type: 'action', action: (e) => e.module('image').open() },
    video: { icon: Icons.videocam, label: 'Insert video', type: 'action', action: (e) => e.module('media').openVideo() },
    audio: { icon: Icons.audiotrack, label: 'Insert audio', type: 'action', action: (e) => e.module('media').openAudio() },
    table: { icon: Icons.table, label: 'Insert table', type: 'action', action: (e) => e.module('table').openInsertDialog() },
    hr: { icon: Icons.hr, label: 'Horizontal rule', type: 'action', action: (e) => e.module('media').insertHorizontalRule() },

    blockquote: { icon: Icons.blockquote, label: 'Blockquote', type: 'action', action: (e) => e.commands.exec('blockFormat', 'blockquote') },
    codeInline: {
        icon: Icons.code,
        label: 'Inline code',
        type: 'action',
        action: (e) => e.selection.wrap('code') && e.emitChange(),
    },
    codeBlock: { icon: Icons.codeBlock, label: 'Code block', type: 'action', action: (e) => e.commands.exec('blockFormat', 'pre') },
    note: { icon: Icons.note, label: 'Insert note', type: 'action', action: (e) => e.module('note').open() },

    emoji: {
        icon: Icons.emoji,
        label: 'Emoji',
        type: 'action',
        action: (e, btn) => e.module('emoji').open(btn),
    },
    specialChars: {
        icon: Icons.specialChars,
        label: 'Special characters',
        type: 'action',
        action: (e) => e.commands.insertHTML('&amp;copy;'),
    },

    find: { icon: Icons.find, label: 'Find & Replace', shortcut: 'Ctrl+F', type: 'action', action: (e) => e.module('find').open() },
    sourceCode: {
        icon: Icons.sourceCode,
        label: 'Source code',
        type: 'action',
        toggle: true,
        action: (e) => e.module('codeView').toggle(),
    },
    fullscreen: {
        icon: Icons.fullscreen,
        label: 'Fullscreen',
        type: 'action',
        toggle: true,
        action: (e) => e.module('fullscreen').toggle(),
    },

    ltr: {
        icon: Icons.ltr,
        label: 'Left-to-right',
        type: 'action',
        toggle: true,
        action: (e) => e.commands.exec('direction', 'ltr'),
    },
    rtl: {
        icon: Icons.rtl,
        label: 'Right-to-left',
        type: 'action',
        toggle: true,
        action: (e) => e.commands.exec('direction', 'rtl'),
    },

    markdown: {
        icon: Icons.markdown,
        label: 'Markdown',
        type: 'action',
        toggle: true,
        action: (e) => {
            const md = e.module('markdown');
            if (!md) return;
            if (e.root.dataset.markdownMode === 'true') {
                e.root.dataset.markdownMode = 'false';
                const currentHtml = e.getHTML();
                const freshMd = md.htmlToMarkdown(currentHtml);
                e.setHTML(md.markdownToHtml(freshMd));
            } else {
                e._mdSource = md.export();
                md.import(e._mdSource);
                e.root.dataset.markdownMode = 'true';
            }
        },
    },

    date: {
        icon: Icons.date,
        label: 'Insert date',
        type: 'action',
        action: (e) => {
            const now = new Date();
            const formatted = now.toLocaleDateString(e.options.locale ?? 'en', { year: 'numeric', month: 'long', day: 'numeric' });
            e.commands.insertHTML(formatted);
        },
    },
    time: {
        icon: Icons.time,
        label: 'Insert time',
        type: 'action',
        action: (e) => {
            const now = new Date();
            const formatted = now.toLocaleTimeString(e.options.locale ?? 'en', { hour: '2-digit', minute: '2-digit' });
            e.commands.insertHTML(formatted);
        },
    },

    anchor: {
        icon: Icons.anchor,
        label: 'Insert anchor',
        type: 'action',
        action: (e) => {
            const name = prompt('Anchor name:');
            if (!name) return;
            e.history.push();
            const a = document.createElement('a');
            a.name = name.trim();
            const range = e.selection.getRange();
            if (range) {
                range.deleteContents();
                range.insertNode(a);
            }
            e.emitChange();
        },
    },

    templates: {
        icon: Icons.template,
        label: 'Content templates',
        type: 'action',
        action: (e) => e.module('templates')?.open(),
    },

    listProps: {
        icon: Icons.listProps,
        label: 'List properties',
        type: 'action',
        action: (e) => {
            const li = e.selection.closest('li');
            const list = li?.closest('ol, ul');
            if (!list || list.tagName !== 'OL') return;
            const currentStart = list.getAttribute('start') || '';
            const currentType = list.style.listStyleType || '';
            const body = `
                <label class="ife-field">
                    <span>Start number</span>
                    <input type="number" name="start" min="1" value="${currentStart || '1'}">
                </label>
                <label class="ife-field">
                    <span>List style type</span>
                    <select name="type">
                        <option value="" ${!currentType ? 'selected' : ''}>Default (decimal)</option>
                        <option value="decimal" ${currentType === 'decimal' ? 'selected' : ''}>Decimal</option>
                        <option value="lower-alpha" ${currentType === 'lower-alpha' ? 'selected' : ''}>Lower alpha</option>
                        <option value="upper-alpha" ${currentType === 'upper-alpha' ? 'selected' : ''}>Upper alpha</option>
                        <option value="lower-roman" ${currentType === 'lower-roman' ? 'selected' : ''}>Lower roman</option>
                        <option value="upper-roman" ${currentType === 'upper-roman' ? 'selected' : ''}>Upper roman</option>
                    </select>
                </label>
            `;
            const dialog = new Dialog(e.wrapper, {
                title: 'List properties',
                bodyHtml: body,
                confirmLabel: 'Apply',
                onConfirm: (form) => {
                    const data = new FormData(form);
                    const start = data.get('start');
                    const type = data.get('type');
                    e.history.push();
                    if (start) list.setAttribute('start', String(start));
                    else list.removeAttribute('start');
                    if (type) list.style.listStyleType = type;
                    else list.style.listStyleType = '';
                    e.emitChange();
                },
            });
            e.selection.save();
            dialog.open();
        },
    },
};

export default ToolbarConfig;
