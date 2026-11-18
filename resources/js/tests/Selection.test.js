import { describe, it, expect, beforeEach } from 'vitest';
import Selection from '../src/core/Selection.js';

describe('Selection', () => {
    let root;
    let selection;

    beforeEach(() => {
        document.body.innerHTML = '';
        root = document.createElement('div');
        root.contentEditable = 'true';
        root.innerHTML = '<p>hello <strong>world</strong></p>';
        document.body.appendChild(root);
        selection = new Selection(root);
    });

    it('returns null getRange() when nothing is selected', () => {
        const range = selection.getRange();
        expect(range).toBeNull();
    });

    it('returns a range when text is selected inside the root', () => {
        const textNode = root.querySelector('strong').firstChild;
        const nativeRange = document.createRange();
        nativeRange.selectNodeContents(textNode);
        selection.setRange(nativeRange);

        const range = selection.getRange();
        expect(range).not.toBeNull();
    });

    it('returns null getRange() when selection is outside the root', () => {
        const outside = document.createElement('div');
        outside.textContent = 'outside';
        document.body.appendChild(outside);
        const nativeRange = document.createRange();
        nativeRange.selectNodeContents(outside);
        selection.setRange(nativeRange);

        const range = selection.getRange();
        expect(range).toBeNull();
    });

    it('save and restore preserves the range', () => {
        const textNode = root.querySelector('strong').firstChild;
        const nativeRange = document.createRange();
        nativeRange.selectNodeContents(textNode);
        selection.setRange(nativeRange);

        selection.save();
        selection.setRange(document.createRange());

        selection.restore();
        const restored = selection.getRange();
        expect(restored).not.toBeNull();
    });

    it('restore does not let the live range mutate the saved range', () => {
        const textNode = root.querySelector('strong').firstChild;
        const nativeRange = document.createRange();
        nativeRange.selectNodeContents(textNode);
        selection.setRange(nativeRange);
        selection.save();

        // Simulate a command (e.g. execCommand('foreColor')) collapsing the
        // active selection range. This must NOT corrupt the saved range,
        // otherwise the next restore() would restore an empty selection.
        selection.restore();
        const active = selection.getNativeSelection().getRangeAt(0);
        active.setStart(active.endContainer, active.endOffset);
        active.collapse(true);

        expect(selection.savedRange.toString()).toBe('world');

        selection.restore();
        expect(selection.getRange().toString()).toBe('world');
    });

    it('save stores offsets that survive DOM mutation re-targeting a live range', () => {
        // Select the middle of a text node, save, then split that text node the
        // way colouring does. A live Range is re-targeted/collapsed by the
        // browser on such a mutation; the offset snapshot must still restore the
        // same text.
        const p = root.querySelector('p');
        const textNode = p.firstChild; // "hello "
        const nativeRange = document.createRange();
        nativeRange.setStart(textNode, 0);
        nativeRange.setEnd(textNode, 5);
        selection.setRange(nativeRange);
        selection.save();

        // Mutate the DOM: split the boundary text node (like applyColor does).
        textNode.splitText(3);
        expect(selection.getSavedOffsets()).toEqual([0, 5]);

        selection.restore();
        expect(selection.getRange().toString()).toBe('hello');
    });

    it('save and restore keeps a caret in an element-only position at that position', () => {
        // Regression: an empty <li>/<p> owns no text, so its character offset
        // collapses onto the end of the preceding content. Restoring by
        // offsets alone put the caret back into the previous block's text,
        // and formatBlock then converted that block instead of the empty one.
        root.innerHTML = '<p>one</p><p><br></p>';
        const emptyP = root.querySelectorAll('p')[1];
        const nativeRange = document.createRange();
        nativeRange.setStart(emptyP, 0);
        nativeRange.collapse(true);
        selection.setRange(nativeRange);

        selection.save();
        selection.restore();

        const restored = selection.getRange();
        expect(restored.startContainer).toBe(emptyP);
        expect(restored.startOffset).toBe(0);
    });

    it('save and restore keeps a caret in an empty list item at that item', () => {
        root.innerHTML = '<ul><li>one</li><li><br></li></ul>';
        const emptyLi = root.querySelectorAll('li')[1];
        const nativeRange = document.createRange();
        nativeRange.setStart(emptyLi, 0);
        nativeRange.collapse(true);
        selection.setRange(nativeRange);

        selection.save();
        selection.restore();

        const restored = selection.getRange();
        expect(restored.startContainer).toBe(emptyLi);
        expect(restored.startOffset).toBe(0);
    });

    it('falls back to offsets when the saved point no longer fits its node', () => {
        // A text node split (the way colouring does) shortens the node, so the
        // stored offset is past its end: the character offsets win.
        const textNode = root.querySelector('p').firstChild; // "hello "
        const nativeRange = document.createRange();
        nativeRange.setStart(textNode, 5);
        nativeRange.collapse(true);
        selection.setRange(nativeRange);
        selection.save();

        textNode.splitText(3); // node is now "hel", saved point (text, 5) is stale

        selection.restore();
        const restored = selection.getRange();
        // Offset 5 in the text stream is two characters into "lo ".
        expect(restored.startContainer.textContent).toBe('lo ');
        expect(restored.startOffset).toBe(2);
    });

    it('falls back to offsets when content before the saved point changed', () => {
        const p = root.querySelector('p');
        const textNode = p.firstChild; // "hello "
        const nativeRange = document.createRange();
        nativeRange.setStart(textNode, 5);
        nativeRange.collapse(true);
        selection.setRange(nativeRange);
        selection.save();

        // Same node, but four characters now precede it: the stored point no
        // longer sits where the saved character offset says it did.
        p.insertBefore(document.createTextNode('abc '), textNode);

        selection.restore();
        const restored = selection.getRange();
        expect(restored.startContainer).toBe(textNode);
        expect(restored.startOffset).toBe(1);
    });

    it('restoreSavedOffsets keeps an element-only caret in place', () => {
        root.innerHTML = '<p>one</p><p><br></p>';
        const emptyP = root.querySelectorAll('p')[1];
        const nativeRange = document.createRange();
        nativeRange.setStart(emptyP, 0);
        nativeRange.collapse(true);
        selection.setRange(nativeRange);

        selection.save();
        selection.restoreSavedOffsets();

        const restored = selection.getRange();
        expect(restored.startContainer).toBe(emptyP);
        expect(restored.startOffset).toBe(0);
    });

    it('collapseToEnd moves caret to end of root', () => {
        const nativeRange = document.createRange();
        nativeRange.setStart(root.firstChild, 0);
        selection.setRange(nativeRange);

        selection.collapseToEnd();
        const range = selection.getRange();
        expect(range.collapsed).toBe(true);
    });

    it('isCollapsed returns true when no selection', () => {
        expect(selection.isCollapsed()).toBe(true);
    });

    it('closest finds ancestor matching selector', () => {
        const strong = root.querySelector('strong');
        const textNode = strong.firstChild;
        const nativeRange = document.createRange();
        nativeRange.selectNodeContents(textNode);
        selection.setRange(nativeRange);

        expect(selection.closest('strong')).toBe(strong);
        expect(selection.closest('p')).toBe(root.querySelector('p'));
    });

    it('closest returns null when no match', () => {
        const textNode = root.querySelector('strong').firstChild;
        const nativeRange = document.createRange();
        nativeRange.selectNodeContents(textNode);
        selection.setRange(nativeRange);

        expect(selection.closest('table')).toBeNull();
    });

    it('getBlockElement returns the block-level ancestor', () => {
        const textNode = root.querySelector('strong').firstChild;
        const nativeRange = document.createRange();
        nativeRange.selectNodeContents(textNode);
        selection.setRange(nativeRange);

        expect(selection.getBlockElement().tagName).toBe('P');
    });

    it('getBlockElement returns null for root-level selection', () => {
        const nativeRange = document.createRange();
        nativeRange.selectNodeContents(root);
        selection.setRange(nativeRange);

        expect(selection.getBlockElement()).toBeNull();
    });

    it('wrap surrounds the selection in a new element', () => {
        const textNode = root.querySelector('strong').firstChild;
        const nativeRange = document.createRange();
        nativeRange.selectNodeContents(textNode);
        selection.setRange(nativeRange);

        const wrapper = selection.wrap('u');
        expect(wrapper.tagName).toBe('U');
        expect(wrapper.textContent).toBe('world');
    });

    it('getText returns selected text', () => {
        const textNode = root.querySelector('strong').firstChild;
        const nativeRange = document.createRange();
        nativeRange.selectNodeContents(textNode);
        selection.setRange(nativeRange);

        expect(selection.getText()).toBe('world');
    });
});
