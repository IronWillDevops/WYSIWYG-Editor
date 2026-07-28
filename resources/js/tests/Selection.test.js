import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Selection from '../src/core/Selection.js';

describe('Selection', () => {
    let root;
    let selection;

    beforeEach(() => {
        root = document.createElement('div');
        root.contentEditable = 'true';
        document.body.appendChild(root);
        selection = new Selection(root);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('getNativeSelection returns window selection', () => {
        const sel = selection.getNativeSelection();
        expect(sel).toBe(window.getSelection());
    });

    it('getRange returns null when there is no selection', () => {
        expect(selection.getRange()).toBeNull();
    });

    it('getRange returns null when selection is outside root', () => {
        const outside = document.createElement('div');
        document.body.appendChild(outside);
        const range = document.createRange();
        range.selectNodeContents(outside);
        selection.setRange(range);
        expect(selection.getRange()).toBeNull();
    });

    it('getRange returns a range when selection is inside root', () => {
        root.innerHTML = '<p>Hello</p>';
        const p = root.querySelector('p');
        const range = document.createRange();
        range.selectNodeContents(p);
        selection.setRange(range);
        const result = selection.getRange();
        expect(result).toBeTruthy();
        expect(result.commonAncestorContainer).toBe(p);
    });

    it('save and restore preserves the range', () => {
        root.innerHTML = '<p>Hello</p>';
        const p = root.querySelector('p');
        const range = document.createRange();
        range.selectNodeContents(p);
        selection.setRange(range);

        selection.save();
        const newRange = document.createRange();
        newRange.selectNodeContents(root);
        selection.setRange(newRange);

        selection.restore();
        const restored = selection.getRange();
        expect(restored.commonAncestorContainer).toBe(p);
    });

    it('isCollapsed returns true for collapsed selection', () => {
        root.innerHTML = '<p>Hello</p>';
        const p = root.querySelector('p');
        const range = document.createRange();
        range.setStart(p.firstChild, 0);
        range.collapse(true);
        selection.setRange(range);
        expect(selection.isCollapsed()).toBe(true);
    });

    it('getText returns selected text', () => {
        root.innerHTML = '<p>Hello World</p>';
        const p = root.querySelector('p');
        const range = document.createRange();
        range.selectNodeContents(p.firstChild);
        selection.setRange(range);
        expect(selection.getText()).toBe('Hello World');
    });

    it('collapseToEnd collapses to end of root', () => {
        root.innerHTML = '<p>Hello</p><p>World</p>';
        selection.collapseToEnd();
        const range = selection.getRange();
        expect(range.collapsed).toBe(true);
    });
});

describe('Selection getBlockElement', () => {
    let root;
    let selection;

    beforeEach(() => {
        root = document.createElement('div');
        root.contentEditable = 'true';
        document.body.appendChild(root);
        selection = new Selection(root);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    function selectNode(node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.setRange(range);
    }

    it('returns null when there is no selection', () => {
        expect(selection.getBlockElement()).toBeNull();
    });

    it('returns P element when caret is in a paragraph', () => {
        root.innerHTML = '<p>Hello</p>';
        selectNode(root.querySelector('p'));
        expect(selection.getBlockElement().tagName).toBe('P');
    });

    it('returns H1 element when caret is in heading', () => {
        root.innerHTML = '<h1>Title</h1>';
        selectNode(root.querySelector('h1'));
        expect(selection.getBlockElement().tagName).toBe('H1');
    });

    it('returns LI element when caret is in a list item', () => {
        root.innerHTML = '<ul><li>Item</li></ul>';
        selectNode(root.querySelector('li'));
        expect(selection.getBlockElement().tagName).toBe('LI');
    });

    it('returns innermost block (P) when caret is inside blockquote > p', () => {
        root.innerHTML = '<blockquote><p>Quote</p></blockquote>';
        selectNode(root.querySelector('p'));
        const block = selection.getBlockElement();
        expect(block.tagName).toBe('P');
    });

    it('returns DIV when caret is in a div', () => {
        root.innerHTML = '<div>Content</div>';
        selectNode(root.querySelector('div'));
        expect(selection.getBlockElement().tagName).toBe('DIV');
    });

    it('returns PRE when caret is in preformatted text', () => {
        root.innerHTML = '<pre>Code</pre>';
        selectNode(root.querySelector('pre'));
        expect(selection.getBlockElement().tagName).toBe('PRE');
    });

    it('returns null for inline-only content in root', () => {
        root.innerHTML = 'Just text';
        const range = document.createRange();
        range.selectNodeContents(root);
        selection.setRange(range);
        expect(selection.getBlockElement()).toBeNull();
    });

    it('returns block element for text node inside paragraph', () => {
        root.innerHTML = '<p>Hello</p>';
        const textNode = root.querySelector('p').firstChild;
        const range = document.createRange();
        range.selectNodeContents(textNode);
        selection.setRange(range);
        expect(selection.getBlockElement().tagName).toBe('P');
    });

    it('returns null when range is outside root', () => {
        const outside = document.createElement('div');
        outside.innerHTML = '<p>Outside</p>';
        document.body.appendChild(outside);
        const range = document.createRange();
        range.selectNodeContents(outside.querySelector('p'));
        selection.setRange(range);
        expect(selection.getBlockElement()).toBeNull();
    });
});

describe('Selection closest', () => {
    let root;
    let selection;

    beforeEach(() => {
        root = document.createElement('div');
        root.contentEditable = 'true';
        document.body.appendChild(root);
        selection = new Selection(root);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('returns null when there is no selection', () => {
        expect(selection.closest('a')).toBeNull();
    });

    it('finds an anchor ancestor', () => {
        root.innerHTML = '<a href="#"><span>Link</span></a>';
        const span = root.querySelector('span');
        const range = document.createRange();
        range.selectNodeContents(span);
        selection.setRange(range);
        const anchor = selection.closest('a');
        expect(anchor).toBeTruthy();
        expect(anchor.tagName).toBe('A');
    });

    it('finds blockquote ancestor', () => {
        root.innerHTML = '<blockquote><p>Quote</p></blockquote>';
        const p = root.querySelector('p');
        const range = document.createRange();
        range.selectNodeContents(p);
        selection.setRange(range);
        const bq = selection.closest('blockquote');
        expect(bq).toBeTruthy();
        expect(bq.tagName).toBe('BLOCKQUOTE');
    });

    it('returns null when no matching ancestor', () => {
        root.innerHTML = '<p>Text</p>';
        const p = root.querySelector('p');
        const range = document.createRange();
        range.selectNodeContents(p);
        selection.setRange(range);
        expect(selection.closest('a')).toBeNull();
    });
});

describe('Selection wrap', () => {
    let root;
    let selection;

    beforeEach(() => {
        root = document.createElement('div');
        root.contentEditable = 'true';
        document.body.appendChild(root);
        selection = new Selection(root);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('wraps text selection in a new element', () => {
        root.innerHTML = '<p>Hello</p>';
        const textNode = root.querySelector('p').firstChild;
        const range = document.createRange();
        range.setStart(textNode, 0);
        range.setEnd(textNode, 5);
        selection.setRange(range);

        const result = selection.wrap('code');
        expect(result.tagName).toBe('CODE');
        expect(root.innerHTML).toContain('<code>Hello</code>');
    });
});
