import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Toolbar from '../src/toolbar/Toolbar.js';
import ToolbarConfig from '../src/toolbar/ToolbarConfig.js';
import Localization from '../src/i18n/Localization.js';
import Icons from '../src/icons/Icons.js';

function createMockEditor() {
    const root = document.createElement('div');
    root.contentEditable = 'true';

    const wrapper = document.createElement('div');
    wrapper.appendChild(root);

    const events = {
        handlers: {},
        on(event, handler) {
            if (!this.handlers[event]) this.handlers[event] = [];
            this.handlers[event].push(handler);
            return () => {
                this.handlers[event] = this.handlers[event].filter(h => h !== handler);
            };
        },
        emit(event, ...args) {
            (this.handlers[event] || []).forEach(h => h(...args));
        },
    };

    return {
        wrapper,
        root,
        options: { locale: 'en' },
        events,
        on: (...args) => events.on(...args),
        selection: {
            getBlockElement: vi.fn(() => null),
            closest: vi.fn(() => null),
            getRange: vi.fn(() => null),
            save: vi.fn(),
            restore: vi.fn(),
        },
        commands: {
            exec: vi.fn(),
            queryState: vi.fn(() => false),
        },
    };
}

describe('Toolbar', () => {
    let editor;

    beforeEach(() => {
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('creates toolbar element with correct class', () => {
        const toolbar = new Toolbar(editor);
        expect(toolbar.el.classList.contains('ife-toolbar')).toBe(true);
        expect(toolbar.el.getAttribute('role')).toBe('toolbar');
    });

    it('inserts toolbar before editor root', () => {
        const toolbar = new Toolbar(editor);
        expect(toolbar.el.nextSibling).toBe(editor.root);
    });

    it('renders buttons from default layout', () => {
        const toolbar = new Toolbar(editor);
        const buttons = toolbar.el.querySelectorAll('.ife-toolbar__btn');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('maps all button ids in buttons Map', () => {
        const toolbar = new Toolbar(editor);
        Object.keys(ToolbarConfig).forEach((id) => {
            const def = ToolbarConfig[id];
            if (def.type === 'select' || def.type === 'color') return;
            expect(toolbar.buttons.has(id)).toBe(true);
        });
    });

    it('calls syncActiveStates on construction', () => {
        const spy = vi.spyOn(Toolbar.prototype, 'syncActiveStates');
        const toolbar = new Toolbar(editor);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('calls syncActiveStates on selectionchange', () => {
        const toolbar = new Toolbar(editor);
        const spy = vi.spyOn(toolbar, 'syncActiveStates');
        editor.events.emit('selectionchange');
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('calls syncActiveStates on focus', () => {
        const toolbar = new Toolbar(editor);
        const spy = vi.spyOn(toolbar, 'syncActiveStates');
        editor.events.emit('focus');
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});

describe('Toolbar button shortcuts', () => {
    let editor;

    beforeEach(() => {
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    function getButtonTitle(id) {
        const toolbar = new Toolbar(editor);
        return toolbar.buttons.get(id)?.title;
    }

    function getButtonAriaLabel(id) {
        const toolbar = new Toolbar(editor);
        return toolbar.buttons.get(id)?.getAttribute('aria-label');
    }

    it('shows shortcut in title for bold button', () => {
        expect(getButtonTitle('bold')).toMatch(/^Bold \(Ctrl\+B\)$/);
    });

    it('shows shortcut in aria-label for bold button', () => {
        expect(getButtonAriaLabel('bold')).toMatch(/^Bold \(Ctrl\+B\)$/);
    });

    it('shows shortcut for italic button', () => {
        expect(getButtonTitle('italic')).toMatch(/^Italic \(Ctrl\+I\)$/);
    });

    it('shows shortcut for underline button', () => {
        expect(getButtonTitle('underline')).toMatch(/^Underline \(Ctrl\+U\)$/);
    });

    it('shows shortcut for undo button', () => {
        expect(getButtonTitle('undo')).toMatch(/^Undo \(Ctrl\+Z\)$/);
    });

    it('shows shortcut for redo button', () => {
        expect(getButtonTitle('redo')).toMatch(/^Redo \(Ctrl\+Y\)$/);
    });

    it('shows shortcut for link button', () => {
        expect(getButtonTitle('link')).toMatch(/^Insert\/edit link \(Ctrl\+K\)$/);
    });

    it('shows shortcut for find button', () => {
        expect(getButtonTitle('find')).toMatch(/^Find & Replace \(Ctrl\+F\)$/);
    });

    it('does not add shortcut parentheses for buttons without shortcut', () => {
        const title = getButtonTitle('strike');
        expect(title).toBe('Strikethrough');
        expect(title).not.toContain('(');
    });

    it('shows no shortcut for alignment buttons', () => {
        expect(getButtonTitle('alignLeft')).toBe('Align left');
        expect(getButtonTitle('alignCenter')).toBe('Align center');
        expect(getButtonTitle('alignRight')).toBe('Align right');
        expect(getButtonTitle('alignJustify')).toBe('Justify');
    });

    it('shows no shortcut for list buttons', () => {
        expect(getButtonTitle('bulletList')).toBe('Bulleted list');
        expect(getButtonTitle('orderedList')).toBe('Numbered list');
    });

    it('uses i18n translation when available with shortcut appended', () => {
        const title = getButtonTitle('bold');
        expect(title).toContain('Bold');
        expect(title).toContain('Ctrl+B');
    });
});

describe('Toolbar button commands', () => {
    let editor;

    beforeEach(() => {
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('clicking a command button calls editor.commands.exec', () => {
        const toolbar = new Toolbar(editor);
        const btn = toolbar.buttons.get('bold');
        btn.click();
        expect(editor.commands.exec).toHaveBeenCalledWith('bold');
    });

    it('clicking an action button calls def.action', () => {
        const def = ToolbarConfig.link;
        const actionSpy = vi.fn();
        const originalAction = def.action;
        def.action = actionSpy;

        const toolbar = new Toolbar(editor);
        const spy = vi.spyOn(toolbar, 'syncActiveStates');
        const btn = toolbar.buttons.get('link');
        btn.click();

        expect(actionSpy).toHaveBeenCalled();

        def.action = originalAction;
    });

    it('clicking a command button triggers syncActiveStates', () => {
        const toolbar = new Toolbar(editor);
        const spy = vi.spyOn(toolbar, 'syncActiveStates');
        const btn = toolbar.buttons.get('bold');
        btn.click();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});

describe('Toolbar alignment sync', () => {
    let editor;

    beforeEach(() => {
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    function createBlockWithAlignment(align) {
        const block = document.createElement('p');
        block.style.textAlign = align;
        block.textContent = 'test';
        editor.root.appendChild(block);
        editor.selection.getBlockElement.mockReturnValue(block);
        return block;
    }

    function getAlignmentState(toolbar) {
        return {
            alignLeft: toolbar.buttons.get('alignLeft').classList.contains('is-active'),
            alignCenter: toolbar.buttons.get('alignCenter').classList.contains('is-active'),
            alignRight: toolbar.buttons.get('alignRight').classList.contains('is-active'),
            alignJustify: toolbar.buttons.get('alignJustify').classList.contains('is-active'),
        };
    }

    it('highlights align left by default when no block element', () => {
        const toolbar = new Toolbar(editor);
        editor.selection.getBlockElement.mockReturnValue(null);
        toolbar.syncAlignment();
        const state = getAlignmentState(toolbar);
        expect(state.alignLeft).toBe(true);
        expect(state.alignCenter).toBe(false);
        expect(state.alignRight).toBe(false);
        expect(state.alignJustify).toBe(false);
    });

    it('highlights align left when block has text-align left', () => {
        const toolbar = new Toolbar(editor);
        createBlockWithAlignment('left');
        toolbar.syncAlignment();
        const state = getAlignmentState(toolbar);
        expect(state.alignLeft).toBe(true);
        expect(state.alignCenter).toBe(false);
    });

    it('highlights align center when block has text-align center', () => {
        const toolbar = new Toolbar(editor);
        createBlockWithAlignment('center');
        toolbar.syncAlignment();
        const state = getAlignmentState(toolbar);
        expect(state.alignCenter).toBe(true);
        expect(state.alignLeft).toBe(false);
    });

    it('highlights align right when block has text-align right', () => {
        const toolbar = new Toolbar(editor);
        createBlockWithAlignment('right');
        toolbar.syncAlignment();
        const state = getAlignmentState(toolbar);
        expect(state.alignRight).toBe(true);
        expect(state.alignLeft).toBe(false);
    });

    it('highlights justify when block has text-align justify', () => {
        const toolbar = new Toolbar(editor);
        createBlockWithAlignment('justify');
        toolbar.syncAlignment();
        const state = getAlignmentState(toolbar);
        expect(state.alignJustify).toBe(true);
        expect(state.alignLeft).toBe(false);
    });

    it('normalizes text-align start to left', () => {
        const toolbar = new Toolbar(editor);
        createBlockWithAlignment('start');
        toolbar.syncAlignment();
        const state = getAlignmentState(toolbar);
        expect(state.alignLeft).toBe(true);
    });

    it('normalizes text-align end to right', () => {
        const toolbar = new Toolbar(editor);
        createBlockWithAlignment('end');
        toolbar.syncAlignment();
        const state = getAlignmentState(toolbar);
        expect(state.alignRight).toBe(true);
    });

    it('only one alignment button is active at a time', () => {
        const toolbar = new Toolbar(editor);
        createBlockWithAlignment('center');
        toolbar.syncAlignment();
        const state = getAlignmentState(toolbar);
        const activeCount = Object.values(state).filter(Boolean).length;
        expect(activeCount).toBe(1);
    });
});

describe('Toolbar contextual sync', () => {
    let editor;

    beforeEach(() => {
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    function getButtonState(toolbar, id) {
        const btn = toolbar.buttons.get(id);
        return btn.classList.contains('is-active');
    }

    it('activates link and unlink buttons when inside an anchor', () => {
        const toolbar = new Toolbar(editor);
        editor.selection.closest.mockImplementation((sel) => {
            if (sel === 'a') return document.createElement('a');
            return null;
        });
        toolbar.syncContextual();
        expect(getButtonState(toolbar, 'link')).toBe(true);
        expect(getButtonState(toolbar, 'unlink')).toBe(true);
    });

    it('deactivates link buttons when not inside an anchor', () => {
        const toolbar = new Toolbar(editor);
        editor.selection.closest.mockReturnValue(null);
        toolbar.syncContextual();
        expect(getButtonState(toolbar, 'link')).toBe(false);
        expect(getButtonState(toolbar, 'unlink')).toBe(false);
    });

    it('activates image button when inside figure.ife-image', () => {
        const toolbar = new Toolbar(editor);
        editor.selection.closest.mockImplementation((sel) => {
            if (sel === 'figure.ife-image') return document.createElement('figure');
            return null;
        });
        toolbar.syncContextual();
        expect(getButtonState(toolbar, 'image')).toBe(true);
    });

    it('activates code button when inside code element', () => {
        const toolbar = new Toolbar(editor);
        editor.selection.closest.mockImplementation((sel) => {
            if (sel === 'code') return document.createElement('code');
            return null;
        });
        toolbar.syncContextual();
        expect(getButtonState(toolbar, 'codeInline')).toBe(true);
    });

    it('activates blockquote button when inside blockquote', () => {
        const toolbar = new Toolbar(editor);
        editor.selection.closest.mockImplementation((sel) => {
            if (sel === 'blockquote') return document.createElement('blockquote');
            return null;
        });
        toolbar.syncContextual();
        expect(getButtonState(toolbar, 'blockquote')).toBe(true);
    });
});

describe('Toolbar state sync', () => {
    let editor;

    beforeEach(() => {
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('toggles is-active on bold when queryCommandState returns true', () => {
        editor.commands.queryState.mockImplementation((cmd) => cmd === 'bold');
        const toolbar = new Toolbar(editor);
        toolbar.syncActiveStates();
        expect(toolbar.buttons.get('bold').classList.contains('is-active')).toBe(true);
        expect(toolbar.buttons.get('italic').classList.contains('is-active')).toBe(false);
    });

    it('toggles is-active on italic when queryCommandState returns true', () => {
        editor.commands.queryState.mockImplementation((cmd) => cmd === 'italic');
        const toolbar = new Toolbar(editor);
        toolbar.syncActiveStates();
        expect(toolbar.buttons.get('italic').classList.contains('is-active')).toBe(true);
        expect(toolbar.buttons.get('bold').classList.contains('is-active')).toBe(false);
    });

    it('toggles is-active on list buttons when queryCommandState returns true', () => {
        editor.commands.queryState.mockImplementation((cmd) => cmd === 'insertUnorderedList');
        const toolbar = new Toolbar(editor);
        toolbar.syncActiveStates();
        expect(toolbar.buttons.get('bulletList').classList.contains('is-active')).toBe(true);
        expect(toolbar.buttons.get('orderedList').classList.contains('is-active')).toBe(false);
    });

    it('clears all state buttons when queryCommandState returns false', () => {
        editor.commands.queryState.mockReturnValue(false);
        const toolbar = new Toolbar(editor);
        toolbar.syncActiveStates();
        ['bold', 'italic', 'underline', 'strike', 'bulletList', 'orderedList'].forEach((id) => {
            expect(toolbar.buttons.get(id).classList.contains('is-active')).toBe(false);
        });
    });
});

describe('Toolbar select controls', () => {
    let editor;

    beforeEach(() => {
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('builds select elements', () => {
        const toolbar = new Toolbar(editor);
        const selects = toolbar.el.querySelectorAll('.ife-toolbar__select');
        expect(selects.length).toBeGreaterThan(0);
    });

    it('select change calls def.onChange', () => {
        const toolbar = new Toolbar(editor);
        const select = toolbar.buttons.get('blockFormat');
        select.value = 'h1';
        select.dispatchEvent(new Event('change'));
        expect(editor.commands.exec).toHaveBeenCalledWith('blockFormat', 'h1');
    });
});

describe('Toolbar color picker', () => {
    let editor;

    beforeEach(() => {
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('builds color picker wrapper', () => {
        const toolbar = new Toolbar(editor);
        const wrapper = toolbar.buttons.get('forecolor');
        expect(wrapper.classList.contains('ife-toolbar__color')).toBe(true);
        const input = wrapper.querySelector('input[type="color"]');
        expect(input).toBeTruthy();
    });
});

describe('Toolbar setEnabled', () => {
    let editor;

    beforeEach(() => {
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('disables a button via setEnabled', () => {
        const toolbar = new Toolbar(editor);
        const btn = toolbar.buttons.get('bold');
        expect(btn.disabled).toBe(false);
        toolbar.setEnabled('bold', false);
        expect(btn.disabled).toBe(true);
    });

    it('re-enables a disabled button', () => {
        const toolbar = new Toolbar(editor);
        toolbar.setEnabled('bold', false);
        toolbar.setEnabled('bold', true);
        expect(toolbar.buttons.get('bold').disabled).toBe(false);
    });
});
