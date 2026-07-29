import { describe, it, expect, beforeEach, vi } from 'vitest';
import Commands from '../src/core/Commands.js';
import Selection from '../src/core/Selection.js';
import EventBus from '../src/core/EventBus.js';

function createMockEditor(root) {
    const events = new EventBus();
    return {
        root,
        events,
        selection: new Selection(root),
        history: {
            push: () => {},
            record: () => {},
        },
        emitChange: () => events.emit('change'),
        sanitizer: { sanitize: (h) => h },
    };
}

describe('Commands', () => {
    let root;
    let editor;
    let commands;

    beforeEach(() => {
        document.body.innerHTML = '';
        root = document.createElement('div');
        root.contentEditable = 'true';
        root.innerHTML = '<p>hello world</p>';
        document.body.appendChild(root);
        editor = createMockEditor(root);
        commands = new Commands(editor);
    });

    it('getBlocksInRange returns block elements within range', () => {
        root.innerHTML = '<p>one</p><p>two</p><p>three</p>';
        const paragraphs = root.querySelectorAll('p');
        const range = document.createRange();
        range.setStart(paragraphs[0].firstChild, 0);
        range.setEnd(paragraphs[2].firstChild, 5);
        const blocks = commands.getBlocksInRange(range);
        expect(blocks.length).toBe(3);
        expect(blocks[0].tagName).toBe('P');
        expect(blocks[1].tagName).toBe('P');
        expect(blocks[2].tagName).toBe('P');
    });

    it('getBlocksInRange returns empty array for uncontained range', () => {
        const outside = document.createElement('div');
        outside.id = 'outside';
        document.body.appendChild(outside);
        const range = document.createRange();
        range.selectNodeContents(outside);
        const blocks = commands.getBlocksInRange(range);
        expect(blocks).toEqual([]);
    });

    it('setBlockFormat replaces current block with new tag', () => {
        const p = root.querySelector('p');
        const range = document.createRange();
        range.selectNodeContents(p.firstChild);
        editor.selection.setRange(range);

        commands.setBlockFormat('h2');
        expect(root.querySelector('h2')).not.toBeNull();
        expect(root.querySelector('h2').textContent).toBe('hello world');
    });

    it('setBlockFormat applies blockquote', () => {
        const p = root.querySelector('p');
        const range = document.createRange();
        range.selectNodeContents(p.firstChild);
        editor.selection.setRange(range);

        commands.setBlockFormat('blockquote');
        expect(root.querySelector('blockquote')).not.toBeNull();
        expect(root.querySelector('blockquote').textContent).toBe('hello world');
    });

    it('setBlockFormat toggles blockquote back to paragraph', () => {
        root.innerHTML = '<blockquote>quoted text</blockquote>';
        const bq = root.querySelector('blockquote');
        const range = document.createRange();
        range.selectNodeContents(bq.firstChild);
        editor.selection.setRange(range);

        commands.setBlockFormat('blockquote');
        expect(root.querySelector('blockquote')).toBeNull();
        const p = root.querySelector('p');
        expect(p).not.toBeNull();
        expect(p.textContent).toBe('quoted text');
    });

    it('setBlockFormat uses formatBlock when no block element found', () => {
        document.execCommand = vi.fn();
        root.innerHTML = 'plain text';
        const range = document.createRange();
        range.selectNodeContents(root.firstChild);
        editor.selection.setRange(range);

        commands.setBlockFormat('h3');
        expect(document.execCommand).toHaveBeenCalledWith('formatBlock', false, '<h3>');
    });

    it('setInlineStyle applies style via wrapping span', () => {
        const textNode = root.querySelector('p').firstChild;
        const range = document.createRange();
        range.selectNodeContents(textNode);
        editor.selection.setRange(range);

        commands.setInlineStyle('color', 'red');
        const span = root.querySelector('span');
        expect(span).not.toBeNull();
        expect(span.style.color).toBe('red');
    });

    it('setInlineStyle with onBlock applies style to the block', () => {
        const p = root.querySelector('p');
        const range = document.createRange();
        range.selectNodeContents(p.firstChild);
        editor.selection.setRange(range);

        commands.setInlineStyle('textAlign', 'center', true);
        expect(p.style.textAlign).toBe('center');
    });

    it('insertHTML inserts at caret position', () => {
        root.innerHTML = '<p>hello</p>';
        const p = root.querySelector('p');
        const range = document.createRange();
        range.setStart(p.firstChild, 3);
        range.collapse(true);
        editor.selection.setRange(range);

        commands.insertHTML('<strong> world</strong>');
        expect(root.innerHTML).toContain('<strong> world</strong>');
    });

    it('queryState returns false for unknown command', () => {
        expect(commands.queryState('nonexistent')).toBe(false);
    });

    it('getBlocksInRange returns single block for same start/end', () => {
        root.innerHTML = '<p>one</p><p>two</p><p>three</p>';
        const p = root.querySelector('p');
        const range = document.createRange();
        range.selectNodeContents(p.firstChild);
        const blocks = commands.getBlocksInRange(range);
        expect(blocks.length).toBe(1);
        expect(blocks[0]).toBe(p);
    });

    it('toggleList creates ul from paragraph blocks', () => {
        root.innerHTML = '<p>one</p><p>two</p>';
        const paragraphs = root.querySelectorAll('p');
        const range = document.createRange();
        range.setStart(paragraphs[0].firstChild, 0);
        range.setEnd(paragraphs[1].firstChild, 3);
        editor.selection.setRange(range);

        commands.toggleList('ul');
        expect(root.querySelector('ul')).not.toBeNull();
        expect(root.querySelectorAll('li').length).toBe(2);
    });

    it('convertList changes ul to ol', () => {
        root.innerHTML = '<ul><li>one</li><li>two</li></ul>';
        const li = root.querySelector('li');
        const range = document.createRange();
        range.selectNodeContents(li.firstChild);
        editor.selection.setRange(range);

        commands.toggleList('ol');
        expect(root.querySelector('ol')).not.toBeNull();
        expect(root.querySelector('ul')).toBeNull();
    });
});
