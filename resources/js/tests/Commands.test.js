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

    describe('exec — formatting commands', () => {
        beforeEach(() => {
            document.execCommand = vi.fn();
        });

        it('superscript toggles styleWithCSS off, calls execCommand, then restores it', () => {
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('superscript');

            expect(document.execCommand).toHaveBeenCalledWith('styleWithCSS', false, false);
            expect(document.execCommand).toHaveBeenCalledWith('superscript', false, undefined);
            expect(document.execCommand).toHaveBeenCalledWith('styleWithCSS', false, true);
        });

        it('subscript toggles styleWithCSS off, calls execCommand, then restores it', () => {
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('subscript');

            expect(document.execCommand).toHaveBeenCalledWith('styleWithCSS', false, false);
            expect(document.execCommand).toHaveBeenCalledWith('subscript', false, undefined);
            expect(document.execCommand).toHaveBeenCalledWith('styleWithCSS', false, true);
        });

        it('foreColor with value applies the color via the DOM', () => {
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('foreColor', 'red');

            const span = root.querySelector('p span');
            expect(span).not.toBeNull();
            expect(span.style.color).toBe('red');
            expect(span.textContent).toBe('hello world');
        });

        it('foreColor without value calls clearColor', () => {
            vi.spyOn(commands, 'clearColor');
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('foreColor', null);

            expect(commands.clearColor).toHaveBeenCalledWith('color');
        });

        it('backColor with value applies the background via the DOM', () => {
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('backColor', 'yellow');

            const span = root.querySelector('p span');
            expect(span).not.toBeNull();
            expect(span.style.backgroundColor).toBe('yellow');
            expect(span.textContent).toBe('hello world');
        });

        it('backColor without value calls clearColor', () => {
            vi.spyOn(commands, 'clearColor');
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('backColor', null);

            expect(commands.clearColor).toHaveBeenCalledWith('backgroundColor');
        });

        it('foreColor with the default black color clears instead of applying it', () => {
            vi.spyOn(commands, 'clearColor');
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('foreColor', '#000000');

            expect(commands.clearColor).toHaveBeenCalledWith('color');
            expect(root.querySelector('p span')).toBeNull();
        });

        it('foreColor with a custom non-default color is applied', () => {
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('foreColor', '#00ff00');

            expect(root.querySelector('p span').style.color).toBe('rgb(0, 255, 0)');
        });

        it('backColor with the default white background clears instead of applying it', () => {
            vi.spyOn(commands, 'clearColor');
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('backColor', '#ffffff');

            expect(commands.clearColor).toHaveBeenCalledWith('backgroundColor');
            expect(root.querySelector('p span')).toBeNull();
        });

        it('backColor with a custom non-default background is applied', () => {
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('backColor', '#ffcc00');

            expect(root.querySelector('p span').style.backgroundColor).toBe('rgb(255, 204, 0)');
        });

        it('removeFormat calls execCommand removeFormat and clearInlineStyles', () => {
            vi.spyOn(commands, 'clearInlineStyles');
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('removeFormat');

            expect(document.execCommand).toHaveBeenCalledWith('removeFormat', false);
            expect(commands.clearInlineStyles).toHaveBeenCalled();
        });
    });

    describe('exec — lineHeight', () => {
        it('sets line-height on the current block', () => {
            const p = root.querySelector('p');
            const range = document.createRange();
            range.selectNodeContents(p.firstChild);
            editor.selection.setRange(range);

            commands.exec('lineHeight', '2');

            expect(p.style.lineHeight).toBe('2');
        });
    });

    describe('applyColor', () => {
        it('colours a whole block selection', () => {
            root.innerHTML = '<p>The quick brown fox</p>';
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.setStart(textNode, 0);
            range.setEnd(textNode, textNode.textContent.length);
            editor.selection.setRange(range);

            commands.exec('foreColor', '#ff0000');

            const span = root.querySelector('p span');
            expect(span).not.toBeNull();
            expect(span.textContent).toBe('The quick brown fox');
            // The browser may normalise shorthand but jsdom keeps the exact value set.
            expect(span.style.color).toBe('rgb(255, 0, 0)');
        });

        it('colors only the selected portion of a text node', () => {
            root.innerHTML = '<p>The quick brown fox</p>';
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.setStart(textNode, 4);   // "quick"
            range.setEnd(textNode, 15);    // "brown"
            editor.selection.setRange(range);

            commands.exec('foreColor', '#0000ff');

            expect(root.innerHTML).toBe(
                '<p>The <span style="color: rgb(0, 0, 255);">quick brown</span> fox</p>'
            );
        });

        it('is idempotent: re-applying the same color does not nest spans', () => {
            root.innerHTML = '<p>The quick brown fox</p>';
            const textNode = root.querySelector('p').firstChild;
            const select = (from, to) => {
                const range = document.createRange();
                range.setStart(textNode, from);
                range.setEnd(textNode, to);
                editor.selection.setRange(range);
            };

            select(0, textNode.textContent.length);
            commands.exec('foreColor', '#ff0000');
            const afterFirst = root.innerHTML;
            // reapply over the same (now wrapped) content
            const span = root.querySelector('p span');
            select(0, span.firstChild.textContent.length);
            commands.exec('foreColor', '#ff0000');

            expect(root.innerHTML).toBe(afterFirst);
            expect(root.querySelectorAll('span').length).toBe(1);
        });

        it('re-applying a different color over the same selection switches the color (real-time picker)', () => {
            // Regression: a previous applyColor wrapped and moved the selection's
            // boundary text node, which collapses the live selection in real
            // browsers, so the next color change silently no-oped. Re-applying a
            // different color must re-target the same text and switch it.
            root.innerHTML = '<p>The quick brown fox</p>';
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.setStart(textNode, 4);
            range.setEnd(textNode, 15);
            editor.selection.setRange(range);

            commands.exec('foreColor', '#ff0000');
            commands.exec('foreColor', '#00ff00');
            commands.exec('foreColor', '#0000ff');

            expect(root.innerHTML).toBe(
                '<p>The <span style="color: rgb(0, 0, 255);">quick brown</span> fox</p>'
            );
        });

        it('re-applying a different background color over the same selection switches it', () => {
            root.innerHTML = '<p>The quick brown fox</p>';
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.setStart(textNode, 0);
            range.setEnd(textNode, textNode.textContent.length);
            editor.selection.setRange(range);

            commands.exec('backColor', '#ff0000');
            commands.exec('backColor', '#0000ff');

            const span = root.querySelector('p span');
            expect(span).not.toBeNull();
            expect(span.style.backgroundColor).toBe('rgb(0, 0, 255)');
        });

        it('re-colouring a subset of a larger coloured span does not re-colour its neighbours', () => {
            root.innerHTML = '<p><span style="color: rgb(255, 0, 0);">quick brown</span> fox</p>';
            const span = root.querySelector('p span');
            const textNode = span.firstChild;
            const range = document.createRange();
            range.setStart(textNode, 0);
            range.setEnd(textNode, 5);
            editor.selection.setRange(range);

            commands.exec('foreColor', '#0000ff');

            expect(root.innerHTML).toBe(
                '<p><span style="color: rgb(0, 0, 255);">quick</span><span style="color: rgb(255, 0, 0);"> brown</span> fox</p>'
            );
        });

        it('leaves the native selection intact after applying', () => {
            root.innerHTML = '<p>The quick brown fox</p>';
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.setStart(textNode, 4);
            range.setEnd(textNode, 9);
            editor.selection.setRange(range);

            commands.exec('foreColor', '#00ff00');

            const sel = window.getSelection();
            expect(sel.rangeCount).toBe(1);
            expect(sel.toString()).toBe('quick');
            expect(sel.isCollapsed).toBe(false);
        });
    });

    describe('clearColor', () => {
        it('removes color style from elements in range', () => {
            root.innerHTML = '<p><span style="color: red;">red</span> normal</p>';
            const span = root.querySelector('span');
            const range = document.createRange();
            range.selectNodeContents(span.firstChild);
            editor.selection.setRange(range);

            commands.clearColor('color');

            expect(span.style.color).toBe('');
        });

        it('removes empty span after clearing style', () => {
            root.innerHTML = '<p><span style="color: red;">text</span></p>';
            const span = root.querySelector('span');
            const range = document.createRange();
            range.selectNodeContents(span.firstChild);
            editor.selection.setRange(range);

            commands.clearColor('color');

            expect(root.querySelector('span')).toBeNull();
        });
    });

    describe('clearInlineStyles', () => {
        it('removes all style attributes from elements in range', () => {
            root.innerHTML = '<p><span style="color: red; font-size: 20px;">text</span></p>';
            const span = root.querySelector('span');
            const range = document.createRange();
            range.selectNodeContents(span.firstChild);
            editor.selection.setRange(range);

            commands.clearInlineStyles();

            expect(span.hasAttribute('style')).toBe(false);
        });
    });

    describe('formatBlock', () => {
        it('converts paragraph to heading', () => {
            root.innerHTML = '<p>hello</p>';
            const p = root.querySelector('p');
            const range = document.createRange();
            range.selectNodeContents(p.firstChild);
            editor.selection.setRange(range);

            commands.formatBlock('h1');

            expect(root.querySelector('h1')).not.toBeNull();
            expect(root.querySelector('p')).toBeNull();
            expect(root.querySelector('h1').textContent).toBe('hello');
        });

        it('converts heading back to paragraph', () => {
            root.innerHTML = '<h2>title</h2>';
            const h2 = root.querySelector('h2');
            const range = document.createRange();
            range.selectNodeContents(h2.firstChild);
            editor.selection.setRange(range);

            commands.formatBlock('p');

            expect(root.querySelector('p')).not.toBeNull();
            expect(root.querySelector('h2')).toBeNull();
            expect(root.querySelector('p').textContent).toBe('title');
        });

        it('does nothing if block is already the target tag', () => {
            root.innerHTML = '<h3>title</h3>';
            const h3 = root.querySelector('h3');
            const range = document.createRange();
            range.selectNodeContents(h3.firstChild);
            editor.selection.setRange(range);

            commands.formatBlock('h3');

            expect(root.querySelector('h3')).not.toBeNull();
            expect(root.querySelector('h3').textContent).toBe('title');
        });

        it('wraps plain root-level text into the target block', () => {
            root.innerHTML = 'plain text';
            const range = document.createRange();
            range.selectNodeContents(root.firstChild);
            editor.selection.setRange(range);

            commands.formatBlock('h1');

            expect(root.querySelector('h1')).not.toBeNull();
            expect(root.querySelector('h1').textContent).toBe('plain text');
            expect(root.children.length).toBe(1);
        });

        it('wraps a whole caret line of plain root text into a heading', () => {
            root.innerHTML = 'line one';
            const text = root.firstChild;
            const range = document.createRange();
            range.setStart(text, 2);
            range.collapse(true);
            editor.selection.setRange(range);

            commands.formatBlock('h1');

            expect(root.querySelector('h1')).not.toBeNull();
            expect(root.querySelector('h1').textContent).toBe('line one');
        });

        it('wraps only the line containing a caret in <br>-separated plain text', () => {
            root.innerHTML = 'intro<br>the heading<br>outro';
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            walker.nextNode(); // intro
            const headingText = walker.nextNode(); // "the heading"
            const range = document.createRange();
            range.setStart(headingText, 4);
            range.collapse(true);
            editor.selection.setRange(range);

            commands.formatBlock('h2');

            const h2 = root.querySelector('h2');
            expect(h2).not.toBeNull();
            expect(h2.textContent).toBe('the heading');
            expect(root.querySelectorAll('br').length).toBe(2);
        });

        it('wraps a selected run of plain root text into the target block', () => {
            root.innerHTML = 'select me';
            const text = root.firstChild;
            const range = document.createRange();
            range.setStart(text, 0);
            range.setEnd(text, 6); // "select"
            editor.selection.setRange(range);

            commands.formatBlock('h1');

            expect(root.querySelector('h1')).not.toBeNull();
            expect(root.querySelector('h1').textContent).toBe('select');
        });

        it('converts a nested block to the target tag preserving the wrapper', () => {
            root.innerHTML = '<div><p>heading content</p></div>';
            const text = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.setStart(text, 1);
            range.collapse(true);
            editor.selection.setRange(range);

            commands.formatBlock('h1');

            const h1 = root.querySelector('h1');
            expect(h1).not.toBeNull();
            expect(h1.textContent).toBe('heading content');
            expect(root.querySelector('div')).not.toBeNull();
            expect(root.querySelector('p')).toBeNull();
        });

        it('supports all heading levels h1-h6', () => {
            for (let i = 1; i <= 6; i++) {
                root.innerHTML = '<p>text</p>';
                const p = root.querySelector('p');
                const range = document.createRange();
                range.selectNodeContents(p.firstChild);
                editor.selection.setRange(range);

                commands.formatBlock(`h${i}`);

                expect(root.querySelector(`h${i}`)).not.toBeNull();
                expect(root.querySelector('p')).toBeNull();
            }
        });

        it('preserves inline formatting inside the heading', () => {
            root.innerHTML = '<p><strong>bold</strong> text</p>';
            const p = root.querySelector('p');
            const range = document.createRange();
            range.selectNodeContents(p.firstChild);
            editor.selection.setRange(range);

            commands.formatBlock('h1');

            const h1 = root.querySelector('h1');
            expect(h1).not.toBeNull();
            expect(h1.querySelector('strong')).not.toBeNull();
            expect(h1.querySelector('strong').textContent).toBe('bold');
        });

        it('converts every block touched by a multi-block selection', () => {
            root.innerHTML = '<p>one</p><p>two</p><p>three</p>';
            const ps = root.querySelectorAll('p');
            const range = document.createRange();
            range.setStart(ps[0].firstChild, 0);
            range.setEnd(ps[2].firstChild, 5);
            editor.selection.setRange(range);

            commands.formatBlock('h2');

            expect(root.querySelectorAll('h2').length).toBe(3);
            expect(root.querySelectorAll('p').length).toBe(0);
            expect([...root.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['one', 'two', 'three']);
        });

        it('converts all blocks when the range common ancestor is the root (Select All)', () => {
            root.innerHTML = '<p>first</p><p>second</p><p>third</p>';
            const range = document.createRange();
            range.selectNodeContents(root);
            editor.selection.setRange(range);

            commands.formatBlock('h1');

            expect(root.querySelectorAll('h1').length).toBe(3);
            expect(root.querySelectorAll('p').length).toBe(0);
        });

        it('only converts blocks that differ from the target tag', () => {
            root.innerHTML = '<h1>one</h1><p>two</p>';
            const h1 = root.querySelector('h1');
            const p = root.querySelector('p');
            const range = document.createRange();
            range.setStart(h1.firstChild, 0);
            range.setEnd(p.firstChild, 3);
            editor.selection.setRange(range);

            commands.formatBlock('h1');

            expect(root.querySelectorAll('h1').length).toBe(2);
            expect(root.querySelectorAll('p').length).toBe(0);
        });
    });
});
