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

    it('insertHTML records no history step when there is no selection inside the editor', () => {
        window.getSelection()?.removeAllRanges();
        editor.history.push = vi.fn();

        commands.insertHTML('<strong>nothing</strong>');

        expect(editor.history.push).not.toHaveBeenCalled();
        expect(root.innerHTML).toBe('<p>hello world</p>');
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

        it('applying a foreground colour to text inside a background span folds, not nests', () => {
            // Regression: applying a text colour to text that already carries a
            // background colour used to wrap a fresh nested span every time,
            // growing the markup. It must fold the colour into the existing span.
            root.innerHTML = '<p><span style="background-color: rgb(0, 0, 255);">hello</span></p>';
            const span = root.querySelector('p span');
            const textNode = span.firstChild;
            const range = document.createRange();
            range.setStart(textNode, 0);
            range.setEnd(textNode, textNode.textContent.length);
            editor.selection.setRange(range);

            commands.exec('foreColor', '#ff0000');

            const result = root.querySelector('p > span');
            expect(root.querySelectorAll('span').length).toBe(1);
            expect(result).not.toBeNull();
            expect(result.style.color).toBe('rgb(255, 0, 0)');
            expect(result.style.backgroundColor).toBe('rgb(0, 0, 255)');
        });

        it('re-colouring text keeps an existing background colour on the span', () => {
            // Regression: re-applying a foreground colour to text that also
            // carries a background colour used to drop the background (the split
            // re-wrap carried only the new foreground). The other inline styles
            // must survive.
            root.innerHTML = '<p><span style="background-color: rgb(0, 0, 255);">hello</span></p>';
            const span = root.querySelector('p span');
            const textNode = span.firstChild;
            const select = (from, to) => {
                const range = document.createRange();
                range.setStart(textNode, from);
                range.setEnd(textNode, to);
                editor.selection.setRange(range);
            };

            select(0, textNode.textContent.length);
            commands.exec('foreColor', '#ff0000');
            expect(root.innerHTML).toBe(
                '<p><span style="background-color: rgb(0, 0, 255); color: rgb(255, 0, 0);">hello</span></p>'
            );

            const spanAfter = root.querySelector('p span');
            select(0, spanAfter.firstChild.textContent.length);
            commands.exec('foreColor', '#00ff00');

            const result = root.querySelector('p > span');
            expect(result.style.color).toBe('rgb(0, 255, 0)');
            expect(result.style.backgroundColor).toBe('rgb(0, 0, 255)');
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

        it('preserves the selection by re-selecting the cleared range by offsets', () => {
            root.innerHTML = '<p><span style="color: red;">red text</span> normal</p>';
            const span = root.querySelector('span');
            const range = document.createRange();
            range.selectNodeContents(span.firstChild);
            editor.selection.setRange(range);
            const spy = vi.spyOn(editor.selection, 'setRangeByOffsets');

            commands.clearColor('color');

            expect(spy).toHaveBeenCalled();
            expect(span.style.color).toBe('');
            const sel = editor.selection.getRange();
            expect(sel.toString()).toBe('red text');
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

        it('splits the list instead of putting a heading inside it', () => {
            // Regression: formatBlock replaced the <li> in place, producing
            // <ul><h1>…</h1></ul> — invalid markup the browser kept treating
            // as part of the list, so typing never left the list.
            root.innerHTML = '<ul><li>one</li><li>two</li></ul>';
            const li = root.querySelectorAll('li')[1];
            const range = document.createRange();
            range.selectNodeContents(li.firstChild);
            editor.selection.setRange(range);

            commands.formatBlock('h1');

            expect(root.querySelector('ul > h1')).toBeNull();
            expect(root.querySelector('h1').textContent).toBe('two');
            expect(root.querySelector('h1').previousElementSibling.tagName).toBe('UL');
            expect(root.querySelectorAll('li').length).toBe(1);
            expect(root.querySelector('li').textContent).toBe('one');
        });

        it('puts the heading before the list when the first item is converted', () => {
            root.innerHTML = '<ul><li>one</li><li>two</li></ul>';
            const li = root.querySelector('li');
            const range = document.createRange();
            range.selectNodeContents(li.firstChild);
            editor.selection.setRange(range);

            commands.formatBlock('h1');

            expect(root.querySelector('h1').textContent).toBe('one');
            expect(root.querySelector('h1').nextElementSibling.tagName).toBe('UL');
            expect(root.querySelector('li').textContent).toBe('two');
        });

        it('drops the list shell when its only item becomes a block', () => {
            root.innerHTML = '<ul><li>only</li></ul>';
            const li = root.querySelector('li');
            const range = document.createRange();
            range.selectNodeContents(li.firstChild);
            editor.selection.setRange(range);

            commands.formatBlock('h1');

            expect(root.innerHTML).toBe('<h1>only</h1>');
        });

        it('converts a list item back into a paragraph', () => {
            root.innerHTML = '<ul><li>item</li></ul>';
            const li = root.querySelector('li');
            const range = document.createRange();
            range.selectNodeContents(li.firstChild);
            editor.selection.setRange(range);

            commands.formatBlock('p');

            expect(root.innerHTML).toBe('<p>item</p>');
        });

        it('keeps the list type of the remaining items when converting a middle item', () => {
            root.innerHTML = '<ol><li>a</li><li>b</li><li>c</li></ol>';
            const li = root.querySelectorAll('li')[1];
            const range = document.createRange();
            range.selectNodeContents(li.firstChild);
            editor.selection.setRange(range);

            commands.formatBlock('h2');

            const heading = root.querySelector('h2');
            expect(heading.textContent).toBe('b');
            const lists = root.querySelectorAll('ol');
            expect(lists.length).toBe(2);
            expect(lists[0].textContent).toBe('a');
            expect(lists[1].textContent).toBe('c');
        });

        it('keeps a nested list valid when its item becomes a heading', () => {
            root.innerHTML = '<ul><li>outer<ul><li>inner</li></ul></li></ul>';
            const inner = root.querySelectorAll('li')[1];
            const range = document.createRange();
            range.selectNodeContents(inner.firstChild);
            editor.selection.setRange(range);

            commands.formatBlock('h2');

            expect(root.querySelector('h2').textContent).toBe('inner');
            expect(root.querySelector('ul > h2')).toBeNull();
            expect(root.querySelector('li').textContent).toContain('outer');
        });

        it('converts every item of a fully selected list into headings', () => {
            // Regression: selecting the whole <ul> made formatBlock copy the
            // <li> children into the heading (<h1><li>…</li></h1>).
            root.innerHTML = '<ul><li>one</li><li>two</li></ul>';
            const range = document.createRange();
            range.selectNodeContents(root.querySelector('ul'));
            editor.selection.setRange(range);

            commands.formatBlock('h2');

            expect(root.querySelector('ul')).toBeNull();
            expect(root.querySelectorAll('h2').length).toBe(2);
            expect([...root.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['one', 'two']);
        });

        describe('after a list, through a toolbar save/restore round-trip', () => {
            // The toolbar blurs the editor on mousedown (selection.save()) and
            // the command runs after the selection is restored — the exact
            // flow in which an element-only caret (an empty line) used to be
            // restored into the previous block's text.
            const caretInElement = (el) => {
                const range = document.createRange();
                range.setStart(el, 0);
                range.collapse(true);
                editor.selection.setRange(range);
                editor.selection.save();
                editor.selection.restore();
            };

            const appendEmptyItem = (list) => {
                const empty = document.createElement('li');
                empty.innerHTML = '<br>';
                list.appendChild(empty);
                return empty;
            };

            it('creates a separate heading for an empty line after a bullet list, keeping every item', () => {
                root.innerHTML = '<ul><li>one</li><li>two</li><li>three</li></ul>';
                caretInElement(appendEmptyItem(root.querySelector('ul')));

                commands.formatBlock('h1');

                expect(root.innerHTML).toBe('<ul><li>one</li><li>two</li><li>three</li></ul><h1><br></h1>');
            });

            it('creates a separate heading for an empty line after an ordered list, keeping every item', () => {
                root.innerHTML = '<ol><li>one</li><li>two</li></ol>';
                caretInElement(appendEmptyItem(root.querySelector('ol')));

                commands.formatBlock('h3');

                expect(root.innerHTML).toBe('<ol><li>one</li><li>two</li></ol><h3><br></h3>');
            });

            it('supports every heading level h1-h6 after a list without duplicating the last item', () => {
                for (let i = 1; i <= 6; i++) {
                    root.innerHTML = '<ul><li>one</li><li>two</li><li>three</li></ul>';
                    caretInElement(appendEmptyItem(root.querySelector('ul')));

                    commands.formatBlock(`h${i}`);

                    expect(root.innerHTML).toBe(`<ul><li>one</li><li>two</li><li>three</li></ul><h${i}><br></h${i}>`);
                    expect(root.textContent).toBe('onetwothree');
                    expect(root.querySelectorAll('li').length).toBe(3);
                }
            });

            it('converts an empty paragraph after a list into a heading', () => {
                root.innerHTML = '<ul><li>item</li></ul><p><br></p>';
                caretInElement(root.querySelector('p'));

                commands.formatBlock('h2');

                expect(root.innerHTML).toBe('<ul><li>item</li></ul><h2><br></h2>');
            });

            it('splits the list around an empty item in the middle when it becomes a heading', () => {
                root.innerHTML = '<ul><li>one</li><li><br></li><li>two</li></ul>';
                caretInElement(root.querySelectorAll('li')[1]);

                commands.formatBlock('h6');

                const heading = root.querySelector('h6');
                expect(heading).not.toBeNull();
                expect(heading.textContent).toBe('');
                expect(root.querySelector('ul > h6')).toBeNull();
                const lists = root.querySelectorAll('ul');
                expect(lists.length).toBe(2);
                expect([...lists[0].querySelectorAll('li')].map((li) => li.textContent)).toEqual(['one']);
                expect([...lists[1].querySelectorAll('li')].map((li) => li.textContent)).toEqual(['two']);
            });

            it('keeps the last item text in the list, not in the heading', () => {
                // Regression: the caret restored into the last <li>'s text, so
                // formatBlock moved "three" into the new heading and dropped
                // the empty line the user was on.
                root.innerHTML = '<ul><li>one</li><li>two</li><li>three</li></ul>';
                caretInElement(appendEmptyItem(root.querySelector('ul')));

                commands.formatBlock('h1');

                expect(root.querySelector('h1').textContent).toBe('');
                expect([...root.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['one', 'two', 'three']);
            });

            it('converts an empty line after a paragraph into a heading', () => {
                root.innerHTML = '<p>para</p><p><br></p>';
                caretInElement(root.querySelectorAll('p')[1]);

                commands.formatBlock('h1');

                expect(root.innerHTML).toBe('<p>para</p><h1><br></h1>');
            });
        });
    });

    describe('list editing', () => {
        const selectContents = (el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            editor.selection.setRange(range);
        };

        const caretIn = (node, offset = 0) => {
            const range = document.createRange();
            range.setStart(node, offset);
            range.collapse(true);
            editor.selection.setRange(range);
        };

        describe('toggleList over existing list items', () => {
            it('exits the list when toggling the current item with the same type', () => {
                root.innerHTML = '<ul><li>item</li></ul>';
                caretIn(root.querySelector('li').firstChild, 4);

                commands.toggleList('ul');

                expect(root.querySelector('ul')).toBeNull();
                expect(root.querySelector('p').textContent).toBe('item');
            });

            it('converts the list when toggling the current item with another type', () => {
                root.innerHTML = '<ul><li>item</li></ul>';
                caretIn(root.querySelector('li').firstChild, 4);

                commands.toggleList('ol');

                expect(root.querySelector('ol')).not.toBeNull();
                expect(root.querySelector('ul')).toBeNull();
            });

            it('converts every list a multi-item selection touches', () => {
                root.innerHTML = '<ul><li>one</li><li>two</li></ul>';
                const lis = root.querySelectorAll('li');
                const range = document.createRange();
                range.setStart(lis[0].firstChild, 0);
                range.setEnd(lis[1].firstChild, 3);
                editor.selection.setRange(range);

                commands.toggleList('ol');

                expect(root.querySelector('ul')).toBeNull();
                expect(root.querySelector('ol')).not.toBeNull();
                expect(root.querySelectorAll('li').length).toBe(2);
            });

            it('unwraps every list a multi-item selection touches when they all match', () => {
                root.innerHTML = '<ul><li>one</li><li>two</li></ul>';
                const lis = root.querySelectorAll('li');
                const range = document.createRange();
                range.setStart(lis[0].firstChild, 0);
                range.setEnd(lis[1].firstChild, 3);
                editor.selection.setRange(range);

                commands.toggleList('ul');

                expect(root.querySelector('ul')).toBeNull();
                expect(root.querySelectorAll('p').length).toBe(2);
            });

            it('toggles a whole selected list instead of nesting it', () => {
                root.innerHTML = '<ul><li>one</li><li>two</li></ul>';
                selectContents(root.querySelector('ul'));

                commands.toggleList('ol');

                expect(root.querySelector('ul')).toBeNull();
                expect(root.querySelectorAll('ol li').length).toBe(2);
            });

            it('never nests lists or items when the selection spans several lists', () => {
                root.innerHTML = '<ul><li>a</li></ul><p>text</p><ol><li>b</li></ol>';
                const range = document.createRange();
                range.setStart(root.querySelector('li').firstChild, 0);
                range.setEnd(root.querySelector('ol li').firstChild, 1);
                editor.selection.setRange(range);

                commands.toggleList('ol');

                // Both lists end up as <ol>; no <ul><ol> or <li><li> structures.
                expect(root.querySelector('ul')).toBeNull();
                expect(root.querySelectorAll('li li').length).toBe(0);
                expect(root.querySelectorAll('ol').length).toBe(2);
            });
        });

        describe('unwrapList', () => {
            it('flattens nested lists into sibling paragraphs', () => {
                // Regression: the nested <ul> used to end up inside the
                // generated <p>, producing <p><ul>…</ul></p>.
                root.innerHTML = '<ul><li>outer<ul><li>inner</li></ul></li><li>second</li></ul>';

                commands.unwrapList(root.querySelector('ul'));

                expect(root.querySelector('ul')).toBeNull();
                expect(root.querySelector('p ul')).toBeNull();
                expect([...root.querySelectorAll('p')].map((p) => p.textContent))
                    .toEqual(['outer', 'inner', 'second']);
            });

            it('keeps an empty item as an empty paragraph', () => {
                root.innerHTML = '<ul><li>one</li><li><br></li></ul>';

                commands.unwrapList(root.querySelector('ul'));

                expect(root.querySelectorAll('p').length).toBe(2);
                expect(root.querySelectorAll('p')[1].innerHTML).toBe('<br>');
            });
        });

        describe('indent / outdent', () => {
            it('nests the item into the previous one', () => {
                root.innerHTML = '<ul><li>one</li><li>two</li></ul>';
                const li = root.querySelectorAll('li')[1];

                commands.indentListItem(li);

                expect(root.innerHTML).toBe('<ul><li>one<ul><li>two</li></ul></li></ul>');
            });

            it('does nothing for the first item', () => {
                root.innerHTML = '<ul><li>one</li><li>two</li></ul>';
                const li = root.querySelector('li');

                commands.indentListItem(li);

                expect(root.innerHTML).toBe('<ul><li>one</li><li>two</li></ul>');
            });

            it('moves the item out of its nested list', () => {
                root.innerHTML = '<ul><li>one<ul><li>two</li></ul></li></ul>';
                const li = root.querySelectorAll('li')[1];

                commands.outdentListItem(li);

                expect(root.innerHTML).toBe('<ul><li>one</li><li>two</li></ul>');
            });

            it('does nothing at the top level', () => {
                root.innerHTML = '<ul><li>one</li></ul>';
                const li = root.querySelector('li');

                commands.outdentListItem(li);

                expect(root.innerHTML).toBe('<ul><li>one</li></ul>');
            });

            it('exec indent routes through the DOM nesting inside a list', () => {
                document.execCommand = vi.fn();
                root.innerHTML = '<ul><li>one</li><li>two</li></ul>';
                const li = root.querySelectorAll('li')[1];
                const range = document.createRange();
                range.selectNodeContents(li.firstChild);
                editor.selection.setRange(range);

                commands.exec('indent');

                expect(root.innerHTML).toBe('<ul><li>one<ul><li>two</li></ul></li></ul>');
                expect(document.execCommand).not.toHaveBeenCalledWith('indent', false, undefined);
            });

            it('exec indent still uses execCommand outside a list', () => {
                document.execCommand = vi.fn();
                root.innerHTML = '<p>hello</p>';
                const range = document.createRange();
                range.selectNodeContents(root.querySelector('p').firstChild);
                editor.selection.setRange(range);

                commands.exec('indent');

                expect(document.execCommand).toHaveBeenCalledWith('indent', false, undefined);
            });
        });

        describe('isListItemEmpty', () => {
            it('reports a plain empty item as empty', () => {
                root.innerHTML = '<ul><li><br></li></ul>';
                expect(commands.isListItemEmpty(root.querySelector('li'))).toBe(true);
            });

            it('reports an item with text as non-empty', () => {
                root.innerHTML = '<ul><li>text</li></ul>';
                expect(commands.isListItemEmpty(root.querySelector('li'))).toBe(false);
            });

            it('reports an item with embedded content as non-empty', () => {
                root.innerHTML = '<ul><li><input type="checkbox"> Task</li></ul>';
                expect(commands.isListItemEmpty(root.querySelector('li'))).toBe(false);
            });

            it('reports an item with a nested list as non-empty', () => {
                root.innerHTML = '<ul><li><ul><li>x</li></ul></li></ul>';
                expect(commands.isListItemEmpty(root.querySelector('li'))).toBe(false);
            });
        });

        describe('exitList', () => {
            it('replaces an exhausted list with a paragraph', () => {
                root.innerHTML = '<ul><li>only</li></ul>';

                commands.exitList(root.querySelector('li'));

                expect(root.innerHTML).toBe('<p><br></p>');
            });

            it('inserts a paragraph after the list when other items remain', () => {
                root.innerHTML = '<ul><li>one</li><li><br></li></ul>';

                commands.exitList(root.querySelectorAll('li')[1]);

                expect(root.innerHTML).toBe('<ul><li>one</li></ul><p><br></p>');
            });

            it('puts the caret into the new paragraph', () => {
                root.innerHTML = '<ul><li><br></li></ul>';

                commands.exitList(root.querySelector('li'));

                const range = editor.selection.getRange();
                expect(range.startContainer.tagName).toBe('P');
                expect(range.collapsed).toBe(true);
            });
        });

        describe('removeListItem', () => {
            it('drops the empty item and keeps the list', () => {
                root.innerHTML = '<ul><li>one</li><li><br></li></ul>';

                commands.removeListItem(root.querySelectorAll('li')[1]);

                expect(root.innerHTML).toBe('<ul><li>one</li></ul>');
            });

            it('collapses an emptied list into a paragraph', () => {
                root.innerHTML = '<ul><li><br></li></ul>';

                commands.removeListItem(root.querySelector('li'));

                expect(root.innerHTML).toBe('<p><br></p>');
            });
        });

        it('keeps the checklist class when converting the list type', () => {
            root.innerHTML = '<ul class="ife-checklist"><li><input type="checkbox"> a</li></ul>';
            caretIn(root.querySelector('li'), 0);

            commands.toggleList('ol');

            expect(root.querySelector('ol').className).toBe('ife-checklist');
        });

        it('supports leaving a list and applying a heading afterwards', () => {
            // The full user flow: finish a list, press Enter on the empty
            // item, then pick a heading from the block-format dropdown.
            root.innerHTML = '<ul><li>item</li><li><br></li></ul>';

            commands.exitList(root.querySelectorAll('li')[1]);
            commands.formatBlock('h1');

            expect(root.innerHTML).toBe('<ul><li>item</li></ul><h1><br></h1>');
        });
    });

    describe('removeListItem direction', () => {
        it('forward deletion lands at the start of the next item', () => {
            root.innerHTML = '<ul><li><br></li><li>two</li></ul>';
            const two = root.querySelectorAll('li')[1];

            commands.removeListItem(root.querySelector('li'), 'forward');

            expect(root.innerHTML).toBe('<ul><li>two</li></ul>');
            const range = editor.selection.getRange();
            expect(range.startContainer).toBe(two);
            expect(range.startOffset).toBe(0);
        });

        it('backward deletion lands at the end of the previous item', () => {
            root.innerHTML = '<ul><li>one</li><li><br></li></ul>';
            const one = root.querySelector('li');

            commands.removeListItem(root.querySelectorAll('li')[1], 'backward');

            expect(root.innerHTML).toBe('<ul><li>one</li></ul>');
            // placeCaretAtEnd collapses onto the element's end boundary.
            const range = editor.selection.getRange();
            expect(range.startContainer).toBe(one);
            expect(range.startOffset).toBe(1);
            expect(range.collapsed).toBe(true);
        });
    });

    describe('range and emptiness helpers', () => {
        it('getBlocksInRange returns only the blocks the range touches when the common ancestor is the root', () => {
            root.innerHTML = '<p>one</p><p>two</p><p>three</p>';
            const ps = root.querySelectorAll('p');
            const range = document.createRange();
            // Spans from the root start into the first paragraph only —
            // commonAncestorContainer resolves to the root itself, which
            // used to return every top-level block (converting the whole
            // document instead of the selection).
            range.setStart(root, 0);
            range.setEnd(ps[0].firstChild, 3);

            const blocks = commands.getBlocksInRange(range);

            expect(blocks).toHaveLength(1);
            expect(blocks[0]).toBe(ps[0]);
        });

        it('getBlocksInRange still collects every top-level block for a select-all range', () => {
            root.innerHTML = '<p>one</p><p>two</p>';
            const range = document.createRange();
            range.selectNodeContents(root);

            expect(commands.getBlocksInRange(range)).toHaveLength(2);
        });

        it('isBlockEmpty keeps media-only blocks non-empty', () => {
            root.innerHTML = '<p><img src="x.png" alt=""></p>';
            expect(commands.isBlockEmpty(root.querySelector('p'))).toBe(false);
        });

        it('isBlockEmpty treats an hr as empty so Backspace can delete it', () => {
            root.innerHTML = '<hr>';
            expect(commands.isBlockEmpty(root.querySelector('hr'))).toBe(true);
        });

        it('isBlockEmpty distinguishes a br-only block from one with text', () => {
            root.innerHTML = '<p><br></p>';
            expect(commands.isBlockEmpty(root.querySelector('p'))).toBe(true);

            root.innerHTML = '<p>text</p>';
            expect(commands.isBlockEmpty(root.querySelector('p'))).toBe(false);
        });
    });
});
