import Icons from '../icons/Icons.js';

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

    link: { icon: Icons.link, label: 'Insert/edit link', type: 'action', action: (e) => e.module('link').open() },
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
        action: (e) => e.module('emoji').open(),
    },
    specialChars: {
        icon: Icons.specialChars,
        label: 'Special characters',
        type: 'action',
        action: (e) => e.commands.insertHTML('&amp;copy;'),
    },

    find: { icon: Icons.find, label: 'Find & Replace', type: 'action', action: (e) => e.module('find').open() },
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
};

export default ToolbarConfig;
