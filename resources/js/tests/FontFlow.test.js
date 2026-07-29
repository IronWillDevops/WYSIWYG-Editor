import { describe, it, expect, vi, beforeEach } from 'vitest';
import Commands from '../src/core/Commands.js';
import Selection from '../src/core/Selection.js';
import EventBus from '../src/core/EventBus.js';

function createMockEditor(root) {
    const events = new EventBus();
    return {
        root,
        events,
        selection: new Selection(root),
        history: { push: () => {}, record: () => {} },
        emitChange: () => events.emit('change'),
        sanitizer: { sanitize: (h) => h },
    };
}

describe('Font flow — save → restore → exec → verify', () => {
    let root, editor, commands, sel;

    beforeEach(() => {
        document.body.innerHTML = '';
        root = document.createElement('div');
        root.contentEditable = 'true';
        root.innerHTML = '<p>hello world</p>';
        document.body.appendChild(root);
        editor = createMockEditor(root);
        commands = new Commands(editor);
        sel = editor.selection;
    });

    it('simulates full font-size flow: select text, save, restore, exec, verify', () => {
        const textNode = root.querySelector('p').firstChild;
        const range = document.createRange();
        range.setStart(textNode, 6);
        range.setEnd(textNode, 11);
        sel.setRange(range);

        expect(sel.getText()).toBe('world');

        sel.save();

        sel.setRange(document.createRange());

        sel.restore();
        commands.exec('fontSize', '24px');

        const span = root.querySelector('span');
        expect(span).not.toBeNull();
        expect(span.textContent).toBe('world');
        expect(span.style.fontSize).toBe('24px');
    });

    it('simulates full font-family flow: select text, save, restore, exec, verify', () => {
        const textNode = root.querySelector('p').firstChild;
        const range = document.createRange();
        range.setStart(textNode, 0);
        range.setEnd(textNode, 5);
        sel.setRange(range);

        expect(sel.getText()).toBe('hello');

        sel.save();
        sel.setRange(document.createRange());
        sel.restore();
        commands.exec('fontName', 'Arial, sans-serif');

        const span = root.querySelector('span');
        expect(span).not.toBeNull();
        expect(span.textContent).toBe('hello');
        expect(span.style.fontFamily).toBe('Arial, sans-serif');
    });

    it('font-size survives getHTML/sanitize round-trip', () => {
        const textNode = root.querySelector('p').firstChild;
        const range = document.createRange();
        range.setStart(textNode, 6);
        range.setEnd(textNode, 11);
        sel.setRange(range);
        sel.save();
        sel.restore();
        commands.exec('fontSize', '24px');

        const html = editor.sanitizer.sanitize(root.innerHTML);
        expect(html).toContain('font-size');
        expect(html).toContain('24px');
    });

    it('font-family survives getHTML/sanitize round-trip', () => {
        const textNode = root.querySelector('p').firstChild;
        const range = document.createRange();
        range.setStart(textNode, 6);
        range.setEnd(textNode, 11);
        sel.setRange(range);
        sel.save();
        sel.restore();
        commands.exec('fontName', 'Arial, sans-serif');

        const html = editor.sanitizer.sanitize(root.innerHTML);
        expect(html).toContain('font-family');
        expect(html).toContain('Arial');
    });

    it('multiple font-size changes on same text update the existing span', () => {
        const textNode = root.querySelector('p').firstChild;
        const range = document.createRange();
        range.setStart(textNode, 6);
        range.setEnd(textNode, 11);
        sel.setRange(range);
        sel.save();
        sel.restore();
        commands.exec('fontSize', '14px');

        let span = root.querySelector('span');
        expect(span.style.fontSize).toBe('14px');

        sel.save();
        sel.restore();
        commands.exec('fontSize', '24px');

        span = root.querySelector('span');
        expect(span.style.fontSize).toBe('24px');
    });

    it('exec with fontName then fontSize applies both styles', () => {
        const textNode = root.querySelector('p').firstChild;
        const range = document.createRange();
        range.setStart(textNode, 6);
        range.setEnd(textNode, 11);
        sel.setRange(range);
        sel.save();
        sel.restore();
        commands.exec('fontName', 'Arial, sans-serif');

        expect(sel.getText()).toBe('world');
        sel.save();
        sel.restore();
        commands.exec('fontSize', '24px');

        const spans = root.querySelectorAll('span');
        expect(spans.length).toBe(1);

        const html = root.innerHTML;
        expect(html).toContain('font-family');
        expect(html).toContain('font-size');
    });
});
