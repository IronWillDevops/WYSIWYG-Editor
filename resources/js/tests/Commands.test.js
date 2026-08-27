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

        it('foreColor with value calls execCommand foreColor', () => {
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('foreColor', 'red');

            expect(document.execCommand).toHaveBeenCalledWith('foreColor', false, 'red');
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

        it('backColor with value calls execCommand hiliteColor', () => {
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('backColor', 'yellow');

            expect(document.execCommand).toHaveBeenCalledWith('hiliteColor', false, 'yellow');
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
            expect(document.execCommand).not.toHaveBeenCalledWith('foreColor', false, '#000000');
        });

        it('foreColor with a custom non-default color is applied', () => {
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('foreColor', '#00ff00');

            expect(document.execCommand).toHaveBeenCalledWith('foreColor', false, '#00ff00');
        });

        it('backColor with the default white background clears instead of applying it', () => {
            vi.spyOn(commands, 'clearColor');
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('backColor', '#ffffff');

            expect(commands.clearColor).toHaveBeenCalledWith('backgroundColor');
            expect(document.execCommand).not.toHaveBeenCalledWith('hiliteColor', false, '#ffffff');
        });

        it('backColor with a custom non-default background is applied', () => {
            const textNode = root.querySelector('p').firstChild;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            editor.selection.setRange(range);

            commands.exec('backColor', '#ffcc00');

            expect(document.execCommand).toHaveBeenCalledWith('hiliteColor', false, '#ffcc00');
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

        it('does nothing if block is the root', () => {
            root.innerHTML = 'plain text';
            const range = document.createRange();
            range.selectNodeContents(root.firstChild);
            editor.selection.setRange(range);

            commands.formatBlock('h1');

            expect(root.querySelector('h1')).toBeNull();
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
    });
});
