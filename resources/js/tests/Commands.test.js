import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Commands from '../src/core/Commands.js';

function createMockEditor() {
    const root = document.createElement('div');
    root.contentEditable = 'true';

    return {
        root,
        selection: {
            save: vi.fn(),
            restore: vi.fn(),
            getRange: vi.fn(() => {
                const range = document.createRange();
                range.selectNodeContents(root);
                return range;
            }),
            closest: vi.fn(() => null),
            getBlockElement: vi.fn(() => document.createElement('p')),
            focus: vi.fn(),
            setRange: vi.fn(),
            wrap: vi.fn(() => {
                const span = document.createElement('span');
                return span;
            }),
        },
        sanitizer: {
            sanitize: (html) => html,
        },
        events: {
            emit: vi.fn(),
        },
        history: {
            push: vi.fn(),
        },
        emitChange: vi.fn(),
    };
}

describe('Commands', () => {
    let editor;
    let commands;

    beforeEach(() => {
        document.execCommand = vi.fn();
        document.queryCommandState = vi.fn(() => false);
        editor = createMockEditor();
        document.body.appendChild(editor.root);
        commands = new Commands(editor);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    describe('alignment commands', () => {
        it('executes justifyLeft via execCommand', () => {
            commands.exec('justifyLeft');
            expect(document.execCommand).toHaveBeenCalledWith('justifyLeft', false, undefined);
        });

        it('executes justifyCenter via execCommand', () => {
            commands.exec('justifyCenter');
            expect(document.execCommand).toHaveBeenCalledWith('justifyCenter', false, undefined);
        });

        it('executes justifyRight via execCommand', () => {
            commands.exec('justifyRight');
            expect(document.execCommand).toHaveBeenCalledWith('justifyRight', false, undefined);
        });

        it('executes justifyFull via execCommand', () => {
            commands.exec('justifyFull');
            expect(document.execCommand).toHaveBeenCalledWith('justifyFull', false, undefined);
        });
    });

    describe('inline formatting commands', () => {
        it('executes bold via execCommand', () => {
            commands.exec('bold');
            expect(document.execCommand).toHaveBeenCalledWith('bold', false, undefined);
        });

        it('executes italic via execCommand', () => {
            commands.exec('italic');
            expect(document.execCommand).toHaveBeenCalledWith('italic', false, undefined);
        });

        it('executes underline via execCommand', () => {
            commands.exec('underline');
            expect(document.execCommand).toHaveBeenCalledWith('underline', false, undefined);
        });

        it('executes strikeThrough via execCommand', () => {
            commands.exec('strikeThrough');
            expect(document.execCommand).toHaveBeenCalledWith('strikeThrough', false, undefined);
        });

        it('executes superscript via execCommand', () => {
            commands.exec('superscript');
            expect(document.execCommand).toHaveBeenCalledWith('superscript', false, undefined);
        });

        it('executes subscript via execCommand', () => {
            commands.exec('subscript');
            expect(document.execCommand).toHaveBeenCalledWith('subscript', false, undefined);
        });
    });

    describe('list commands', () => {
        it('insertUnorderedList calls toggleList with ul', () => {
            const spy = vi.spyOn(commands, 'toggleList');
            commands.exec('insertUnorderedList');
            expect(spy).toHaveBeenCalledWith('ul');
            spy.mockRestore();
        });

        it('insertOrderedList calls toggleList with ol', () => {
            const spy = vi.spyOn(commands, 'toggleList');
            commands.exec('insertOrderedList');
            expect(spy).toHaveBeenCalledWith('ol');
            spy.mockRestore();
        });
    });

    describe('indent/outdent commands', () => {
        it('executes indent via execCommand', () => {
            commands.exec('indent');
            expect(document.execCommand).toHaveBeenCalledWith('indent', false, undefined);
        });

        it('executes outdent via execCommand', () => {
            commands.exec('outdent');
            expect(document.execCommand).toHaveBeenCalledWith('outdent', false, undefined);
        });
    });

    describe('color commands', () => {
        it('executes foreColor with value', () => {
            commands.exec('foreColor', '#ff0000');
            expect(document.execCommand).toHaveBeenCalledWith('foreColor', false, '#ff0000');
        });

        it('executes foreColor with empty value calls clearColor', () => {
            const spy = vi.spyOn(commands, 'clearColor');
            commands.exec('foreColor', '');
            expect(spy).toHaveBeenCalledWith('color');
            spy.mockRestore();
        });

        it('executes backColor with value', () => {
            commands.exec('backColor', '#00ff00');
            expect(document.execCommand).toHaveBeenCalledWith('hiliteColor', false, '#00ff00');
        });
    });

    describe('block and style commands', () => {
        it('blockFormat calls setBlockFormat with value', () => {
            const spy = vi.spyOn(commands, 'setBlockFormat');
            commands.exec('blockFormat', 'h1');
            expect(spy).toHaveBeenCalledWith('h1');
            spy.mockRestore();
        });

        it('fontName calls setInlineStyle with fontFamily', () => {
            const spy = vi.spyOn(commands, 'setInlineStyle');
            commands.exec('fontName', 'Arial');
            expect(spy).toHaveBeenCalledWith('fontFamily', 'Arial');
            spy.mockRestore();
        });

        it('fontSize calls setInlineStyle with fontSize', () => {
            const spy = vi.spyOn(commands, 'setInlineStyle');
            commands.exec('fontSize', '18px');
            expect(spy).toHaveBeenCalledWith('fontSize', '18px');
            spy.mockRestore();
        });

        it('lineHeight calls setInlineStyle with lineHeight on block', () => {
            const spy = vi.spyOn(commands, 'setInlineStyle');
            commands.exec('lineHeight', '2');
            expect(spy).toHaveBeenCalledWith('lineHeight', '2', true);
            spy.mockRestore();
        });
    });

    describe('removeFormat', () => {
        it('executes removeFormat via execCommand and clears inline styles', () => {
            const spy = vi.spyOn(commands, 'clearInlineStyles');
            commands.exec('removeFormat');
            expect(document.execCommand).toHaveBeenCalledWith('removeFormat', false);
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });
    });

    describe('queryState', () => {
        it('calls document.queryCommandState', () => {
            commands.queryState('bold');
            expect(document.queryCommandState).toHaveBeenCalledWith('bold');
        });

        it('returns false when queryCommandState throws', () => {
            document.queryCommandState = vi.fn(() => { throw new Error('fail'); });
            expect(commands.queryState('bold')).toBe(false);
        });
    });

    describe('insertHTML', () => {
        it('inserts HTML fragment at cursor', () => {
            editor.root.innerHTML = '<p>Hello</p>';
            commands.insertHTML('<strong>World</strong>');
            expect(editor.root.innerHTML).toContain('<strong>World</strong>');
            expect(editor.emitChange).toHaveBeenCalled();
        });
    });

    describe('setBlockFormat', () => {
        it('creates a heading element via formatBlock when no block found', () => {
            editor.selection.getBlockElement.mockReturnValue(null);
            commands.setBlockFormat('h1');
            expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<h1>');
        });

        it('replaces block element with new tag when block exists', () => {
            const p = document.createElement('p');
            p.innerHTML = 'Hello';
            editor.root.appendChild(p);
            editor.selection.getBlockElement.mockReturnValue(p);
            commands.setBlockFormat('h1');
            expect(editor.root.querySelector('h1')).toBeTruthy();
            expect(editor.root.querySelector('h1').innerHTML).toBe('Hello');
        });
    });

    describe('toggleList', () => {
        it('creates a list from existing blocks', () => {
            editor.root.innerHTML = '<p>Item 1</p><p>Item 2</p>';
            const blocks = editor.root.querySelectorAll('p');
            editor.selection.getBlockElement.mockReturnValue(blocks[0]);
            editor.selection.getRange.mockReturnValue({
                commonAncestorContainer: editor.root,
                startContainer: blocks[0],
                endContainer: blocks[1],
            });
            editor.selection.closest.mockReturnValue(null);
            commands.toggleList('ul');
            const ul = editor.root.querySelector('ul');
            expect(ul).toBeTruthy();
            expect(ul.children.length).toBe(2);
        });
    });
});
