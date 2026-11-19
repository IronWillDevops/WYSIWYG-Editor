import { describe, it, expect, vi } from 'vitest';

const { capturedDialogs } = vi.hoisted(() => ({ capturedDialogs: [] }));

vi.mock('../src/utils/Dialog.js', () => ({
    default: class Dialog {
        constructor(container, options) {
            this.container = container;
            this.options = options;
            capturedDialogs.push(options);
        }

        open() {}

        close() {}
    },
}));

import ToolbarConfig from '../src/toolbar/ToolbarConfig.js';
import Icons from '../src/icons/Icons.js';
import Selection from '../src/core/Selection.js';

describe('ToolbarConfig', () => {
    it('defines all expected button IDs', () => {
        const ids = Object.keys(ToolbarConfig);
        expect(ids).toContain('undo');
        expect(ids).toContain('redo');
        expect(ids).toContain('bold');
        expect(ids).toContain('italic');
        expect(ids).toContain('underline');
        expect(ids).toContain('strike');
        expect(ids).toContain('alignLeft');
        expect(ids).toContain('alignCenter');
        expect(ids).toContain('alignRight');
        expect(ids).toContain('alignJustify');
        expect(ids).toContain('link');
        expect(ids).toContain('find');
        expect(ids).toContain('sourceCode');
        expect(ids).toContain('fullscreen');
    });

    it('every button has a non-empty label', () => {
        Object.entries(ToolbarConfig).forEach(([id, def]) => {
            expect(def.label, `Button "${id}" missing label`).toBeTruthy();
        });
    });

    it('every button has a valid type', () => {
        const validTypes = ['command', 'action', 'select', 'color'];
        Object.entries(ToolbarConfig).forEach(([id, def]) => {
            expect(validTypes, `Button "${id}" has invalid type "${def.type}"`).toContain(def.type);
        });
    });

    it('command buttons have a command property', () => {
        Object.entries(ToolbarConfig).forEach(([id, def]) => {
            if (def.type === 'command') {
                expect(def.command, `Command button "${id}" missing command`).toBeTruthy();
            }
        });
    });

    it('action buttons have an action function', () => {
        Object.entries(ToolbarConfig).forEach(([id, def]) => {
            if (def.type === 'action') {
                expect(typeof def.action, `Action button "${id}" missing action`).toBe('function');
            }
        });
    });

    it('select buttons have options and onChange', () => {
        Object.entries(ToolbarConfig).forEach(([id, def]) => {
            if (def.type === 'select') {
                expect(Array.isArray(def.options), `Select "${id}" missing options`).toBe(true);
                expect(typeof def.onChange, `Select "${id}" missing onChange`).toBe('function');
            }
        });
    });

    it('color buttons have a command', () => {
        Object.entries(ToolbarConfig).forEach(([id, def]) => {
            if (def.type === 'color') {
                expect(def.command, `Color button "${id}" missing command`).toBeTruthy();
            }
        });
    });

    it('buttons with shortcut have it defined as string', () => {
        Object.entries(ToolbarConfig).forEach(([id, def]) => {
            if (def.shortcut) {
                expect(typeof def.shortcut).toBe('string');
                expect(def.shortcut.length).toBeGreaterThan(0);
            }
        });
    });

    it('bold button has Ctrl+B shortcut', () => {
        expect(ToolbarConfig.bold.shortcut).toBe('Ctrl+B');
    });

    it('undo button has Ctrl+Z shortcut', () => {
        expect(ToolbarConfig.undo.shortcut).toBe('Ctrl+Z');
    });

    it('link button has Ctrl+K shortcut', () => {
        expect(ToolbarConfig.link.shortcut).toBe('Ctrl+K');
    });

    it('find button has Ctrl+F shortcut', () => {
        expect(ToolbarConfig.find.shortcut).toBe('Ctrl+F');
    });

    it('alignment buttons do not have shortcut', () => {
        expect(ToolbarConfig.alignLeft.shortcut).toBeUndefined();
        expect(ToolbarConfig.alignCenter.shortcut).toBeUndefined();
        expect(ToolbarConfig.alignRight.shortcut).toBeUndefined();
        expect(ToolbarConfig.alignJustify.shortcut).toBeUndefined();
    });
});

describe('Icons', () => {
    it('exports icon SVGs for all toolbar buttons', () => {
        expect(Icons.bold).toContain('<svg');
        expect(Icons.italic).toContain('<svg');
        expect(Icons.underline).toContain('<svg');
        expect(Icons.alignLeft).toContain('<svg');
        expect(Icons.alignCenter).toContain('<svg');
        expect(Icons.alignRight).toContain('<svg');
        expect(Icons.alignJustify).toContain('<svg');
        expect(Icons.undo).toContain('<svg');
        expect(Icons.redo).toContain('<svg');
        expect(Icons.link).toContain('<svg');
        expect(Icons.find).toContain('<svg');
    });

    it('all icons are strings containing svg', () => {
        Object.values(Icons).forEach((icon, index) => {
            const keys = Object.keys(Icons);
            expect(typeof icon, `Icon "${keys[index]}" is not a string`).toBe('string');
            expect(icon, `Icon "${keys[index]}" does not contain <svg`).toContain('<svg');
        });
    });
});

describe('ToolbarConfig resilience', () => {
    /** Editor double: no plugin modules are loaded (disabledPlugins/race). */
    function createEditorMock() {
        return {
            module: () => undefined,
            commands: { insertHTML: vi.fn(), exec: vi.fn() },
            selection: {
                closest: () => null,
                getBlockElement: () => null,
                getRange: () => null,
                wrap: () => false,
                save: vi.fn(),
            },
            history: { push: vi.fn() },
            emitChange: vi.fn(),
            undo: vi.fn(),
            redo: vi.fn(),
            root: document.createElement('div'),
            wrapper: document.createElement('div'),
            options: {},
        };
    }

    it('module-backed actions do not throw when the module is not loaded', () => {
        const editor = createEditorMock();
        const ids = [
            'link', 'unlink', 'image', 'video', 'audio', 'table', 'hr',
            'note', 'emoji', 'find', 'sourceCode', 'fullscreen', 'templates',
            'markdown',
        ];
        ids.forEach((id) => {
            const def = ToolbarConfig[id];
            expect(
                () => def.action(editor, document.createElement('button')),
                `action "${id}" threw without its module`
            ).not.toThrow();
        });
    });

    it('actions without modules run against the editor API alone', () => {
        const editor = createEditorMock();
        const ids = [
            'checklist', 'blockquote', 'codeInline', 'codeBlock',
            'date', 'time', 'ltr', 'rtl', 'undo', 'redo',
        ];
        ids.forEach((id) => {
            const def = ToolbarConfig[id];
            expect(
                () => def.action(editor),
                `action "${id}" threw without a module`
            ).not.toThrow();
        });
    });

    it('special characters insert a real © entity, not the literal text "&copy;"', () => {
        const insertHTML = vi.fn();
        const editor = { commands: { insertHTML } };

        ToolbarConfig.specialChars.action(editor);

        expect(insertHTML).toHaveBeenCalledWith('&copy;');
        expect(insertHTML).not.toHaveBeenCalledWith('&amp;copy;');
    });

    it('blockquote wraps the current line after a toolbar save/restore round-trip', () => {
        // Toolbar flow: mousedown saves the caret, click restores it before
        // running the action. The restored caret must stay on the current
        // line, not slide into the previous one.
        const root = document.createElement('div');
        root.contentEditable = 'true';
        root.innerHTML = '<p>line1</p><p>line2</p>';
        document.body.appendChild(root);
        const selection = new Selection(root);
        const editor = {
            root,
            selection,
            history: { push: vi.fn() },
            emitChange: vi.fn(),
        };
        const p2 = root.querySelectorAll('p')[1];
        const range = document.createRange();
        range.setStart(p2.firstChild, 0);
        range.collapse(true);
        selection.setRange(range);

        selection.save();
        selection.restore();
        ToolbarConfig.blockquote.action(editor);

        expect(root.innerHTML).toBe('<p>line1</p><blockquote><p>line2</p></blockquote>');
        document.body.removeChild(root);
    });

    it('blockquote wraps an empty current line, not the previous line', () => {
        const root = document.createElement('div');
        root.contentEditable = 'true';
        root.innerHTML = '<p>line1</p><p><br></p>';
        document.body.appendChild(root);
        const selection = new Selection(root);
        const editor = {
            root,
            selection,
            history: { push: vi.fn() },
            emitChange: vi.fn(),
        };
        const emptyP = root.querySelectorAll('p')[1];
        const range = document.createRange();
        range.setStart(emptyP, 0);
        range.collapse(true);
        selection.setRange(range);

        selection.save();
        selection.restore();
        ToolbarConfig.blockquote.action(editor);

        expect(root.innerHTML).toBe('<p>line1</p><blockquote><p><br></p></blockquote>');
        document.body.removeChild(root);
    });

    it('escapes the list start attribute in the list properties dialog body', () => {
        const payload = '"><img src=x onerror=alert(1)>';
        const list = document.createElement('ol');
        list.setAttribute('start', payload);
        const li = document.createElement('li');
        list.appendChild(li);

        const editor = {
            wrapper: document.createElement('div'),
            selection: { closest: () => li, save: vi.fn() },
        };
        capturedDialogs.length = 0;

        ToolbarConfig.listProps.action(editor);

        expect(capturedDialogs).toHaveLength(1);
        const { bodyHtml } = capturedDialogs[0];
        expect(bodyHtml).not.toContain(payload);
        expect(bodyHtml).toContain('value="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"');
    });
});
