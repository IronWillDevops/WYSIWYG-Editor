import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Editor from '../src/core/Editor.js';

describe('Editor', () => {
    /** @type {HTMLTextAreaElement} */
    let textarea;

    beforeEach(() => {
        document.body.innerHTML = '<textarea></textarea>';
        textarea = document.querySelector('textarea');
        vi.spyOn(document, 'addEventListener');
        vi.spyOn(document, 'removeEventListener');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('removes keydown listener on destroy with the same function reference', () => {
        const editor = new Editor(textarea);

        const addCall = document.addEventListener.mock.calls.find(
            ([event]) => event === 'keydown'
        );
        expect(addCall).toBeDefined();
        const handler = addCall[1];

        editor.destroy();

        const removeCall = document.removeEventListener.mock.calls.find(
            ([event]) => event === 'keydown'
        );
        expect(removeCall).toBeDefined();
        expect(removeCall[1]).toBe(handler);
    });

    it('calls removeEventListener with the exact function passed to addEventListener', () => {
        const editor = new Editor(textarea);

        const keydownAdds = document.addEventListener.mock.calls.filter(
            ([event]) => event === 'keydown'
        );
        expect(keydownAdds).toHaveLength(1);

        editor.destroy();

        const keydownRemoves = document.removeEventListener.mock.calls.filter(
            ([event]) => event === 'keydown'
        );
        expect(keydownRemoves).toHaveLength(1);
        expect(keydownRemoves[0][1]).toBe(keydownAdds[0][1]);
    });
});
