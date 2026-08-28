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
