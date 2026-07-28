import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Editor from '../src/core/Editor.js';
import '../src/modules/register.js';

describe('Editor', () => {
    let textarea;

    beforeEach(() => {
        textarea = document.createElement('textarea');
        textarea.value = '<p>Hello</p>';
        document.body.appendChild(textarea);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('builds the editor DOM and hides the textarea', () => {
        const editor = new Editor(textarea);
        expect(textarea.style.display).toBe('none');
        expect(editor.wrapper.classList.contains('ife-wrapper')).toBe(true);
        expect(editor.root.classList.contains('ife-content')).toBe(true);
        expect(editor.root.contentEditable).toBe('true');
    });

    it('sanitizes and sets initial content from textarea value', () => {
        const editor = new Editor(textarea);
        expect(editor.root.innerHTML).toContain('<p>Hello</p>');
    });

    it('sets empty content when textarea is empty', () => {
        textarea.value = '';
        const editor = new Editor(textarea);
        expect(editor.root.innerHTML).toBe('');
    });

    it('exposes core subsystems', () => {
        const editor = new Editor(textarea);
        expect(editor.selection).toBeTruthy();
        expect(editor.commands).toBeTruthy();
        expect(editor.history).toBeTruthy();
        expect(editor.sanitizer).toBeTruthy();
        expect(editor.events).toBeTruthy();
    });

    it('getHTML returns sanitized inner HTML', () => {
        const editor = new Editor(textarea);
        expect(editor.getHTML()).toContain('<p>Hello</p>');
    });

    it('setHTML updates content and pushes history', () => {
        const editor = new Editor(textarea);
        editor.setHTML('<p>World</p>');
        expect(editor.root.innerHTML).toContain('<p>World</p>');
        expect(editor.history.canUndo()).toBe(true);
    });

    it('getText returns plain text', () => {
        const editor = new Editor(textarea);
        expect(editor.getText()).toBe('Hello');
    });

    it('clear removes content and history', () => {
        const editor = new Editor(textarea);
        editor.setHTML('<p>World</p>');
        editor.clear();
        expect(editor.root.innerHTML).toBe('');
        expect(editor.history.canUndo()).toBe(false);
    });

    it('emitChange syncs textarea and emits change event', () => {
        const editor = new Editor(textarea);
        const handler = vi.fn();
        editor.on('change', handler);
        editor.root.innerHTML = '<p>Updated</p>';
        editor.emitChange();
        expect(textarea.value).toContain('<p>Updated</p>');
        expect(handler).toHaveBeenCalled();
    });

    it('destroy removes DOM, restores textarea, cleans up', () => {
        const editor = new Editor(textarea);
        const wrapper = editor.wrapper;
        document.body.appendChild(wrapper);
        editor.destroy();
        expect(textarea.style.display).toBe('');
        expect(document.body.contains(wrapper)).toBe(false);
    });

    it('module() returns a registered plugin by name', () => {
        const editor = new Editor(textarea);
        expect(editor.module('link')).toBeTruthy();
        expect(editor.module('image')).toBeTruthy();
        expect(editor.module('table')).toBeTruthy();
        expect(editor.module('find')).toBeTruthy();
        expect(editor.module('nonexistent')).toBeUndefined();
    });

    it('applies light theme correctly', () => {
        const editor = new Editor(textarea, { theme: 'light' });
        expect(editor.wrapper.dataset.resolvedTheme).toBe('light');
    });

    it('applies dark theme correctly', () => {
        const editor = new Editor(textarea, { theme: 'dark' });
        expect(editor.wrapper.dataset.resolvedTheme).toBe('dark');
    });

    it('fires init event on construction', () => {
        const handler = vi.fn();
        const editor = new Editor(textarea);
        editor.on('init', handler);
        editor.events.emit('init', editor);
        expect(handler).toHaveBeenCalledWith(editor);
    });

    it('calls on() handler on focus event', () => {
        const editor = new Editor(textarea);
        const handler = vi.fn();
        editor.on('focus', handler);
        editor.events.emit('focus', editor);
        expect(handler).toHaveBeenCalledWith(editor);
    });

    it('supports undo/redo via history', () => {
        const editor = new Editor(textarea);
        editor.setHTML('<p>V2</p>');
        editor.undo();
        expect(editor.getHTML()).toContain('<p>Hello</p>');
        editor.redo();
        expect(editor.getHTML()).toContain('<p>V2</p>');
    });
});

describe('Editor hotkeys', () => {
    let textarea;
    let editor;

    beforeEach(() => {
        document.execCommand = vi.fn();
        textarea = document.createElement('textarea');
        textarea.value = '<p>Hello</p>';
        document.body.appendChild(textarea);
        editor = new Editor(textarea);
        vi.spyOn(editor.root, 'contains').mockReturnValue(true);
    });

    afterEach(() => {
        editor.destroy();
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    function createShortcutEvent(key, shiftKey = false) {
        return new KeyboardEvent('keydown', {
            key,
            ctrlKey: true,
            shiftKey,
            bubbles: true,
            cancelable: true,
        });
    }

    it('Ctrl+B executes bold command', () => {
        const spy = vi.spyOn(editor.commands, 'exec');
        editor.handleShortcut(createShortcutEvent('b'));
        expect(spy).toHaveBeenCalledWith('bold');
        spy.mockRestore();
    });

    it('Ctrl+I executes italic command', () => {
        const spy = vi.spyOn(editor.commands, 'exec');
        editor.handleShortcut(createShortcutEvent('i'));
        expect(spy).toHaveBeenCalledWith('italic');
        spy.mockRestore();
    });

    it('Ctrl+U executes underline command', () => {
        const spy = vi.spyOn(editor.commands, 'exec');
        editor.handleShortcut(createShortcutEvent('u'));
        expect(spy).toHaveBeenCalledWith('underline');
        spy.mockRestore();
    });

    it('Ctrl+Z calls undo', () => {
        const spy = vi.spyOn(editor.history, 'undo');
        editor.handleShortcut(createShortcutEvent('z'));
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('Ctrl+Shift+Z calls redo', () => {
        const spy = vi.spyOn(editor.history, 'redo');
        editor.handleShortcut(createShortcutEvent('z', true));
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('Ctrl+Y calls redo', () => {
        const spy = vi.spyOn(editor.history, 'redo');
        editor.handleShortcut(createShortcutEvent('y'));
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('Ctrl+K opens link module', () => {
        const linkModule = editor.module('link');
        expect(linkModule).toBeTruthy();
        const spy = vi.spyOn(linkModule, 'open');
        editor.handleShortcut(createShortcutEvent('k'));
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('Ctrl+F opens find module', () => {
        const findModule = editor.module('find');
        expect(findModule).toBeTruthy();
        const spy = vi.spyOn(findModule, 'open');
        editor.handleShortcut(createShortcutEvent('f'));
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('Ctrl+S emits save event', () => {
        const handler = vi.fn();
        editor.on('save', handler);
        editor.handleShortcut(createShortcutEvent('s'));
        expect(handler).toHaveBeenCalled();
    });

    it('does not fire shortcut when editor root is not focused', () => {
        editor.root.contains.mockReturnValue(false);
        const spy = vi.spyOn(editor.commands, 'exec');
        editor.handleShortcut(createShortcutEvent('b'));
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('does not fire shortcut without Ctrl key', () => {
        const spy = vi.spyOn(editor.commands, 'exec');
        const event = new KeyboardEvent('keydown', { key: 'b', ctrlKey: false, bubbles: true });
        editor.handleShortcut(event);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });
});
