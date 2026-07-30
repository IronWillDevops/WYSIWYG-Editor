import { describe, it, expect, vi, beforeEach } from 'vitest';
import History from '../src/core/History.js';

describe('History', () => {
    /** @type {{ html: string }} */
    let state;
    /** @type {History} */
    let history;

    beforeEach(() => {
        state = { html: '<p>initial</p>' };
        history = new History({
            getContent: () => state.html,
            setContent: (html) => {
                state.html = html;
            },
            maxSteps: 5,
            debounceMs: 0,
        });
    });

    it('seeds the undo stack with the initial content', () => {
        expect(history.canUndo()).toBe(false);
    });

    it('pushes a new snapshot and allows undoing back to the previous one', () => {
        state.html = '<p>changed</p>';
        history.push();

        expect(history.canUndo()).toBe(true);

        history.undo();

        expect(state.html).toBe('<p>initial</p>');
    });

    it('supports redo after an undo', () => {
        state.html = '<p>changed</p>';
        history.push();
        history.undo();

        history.redo();

        expect(state.html).toBe('<p>changed</p>');
    });

    it('clears the redo stack once a new change is pushed', () => {
        state.html = '<p>v2</p>';
        history.push();
        history.undo();

        state.html = '<p>v3-branch</p>';
        history.push();

        expect(history.canRedo()).toBe(false);
    });

    it('does not push a duplicate snapshot when content is unchanged', () => {
        history.push();
        history.push();

        expect(history.undoStack).toHaveLength(1);
    });

    it('caps the undo stack at maxSteps', () => {
        for (let i = 0; i < 10; i += 1) {
            state.html = `<p>${i}</p>`;
            history.push();
        }

        expect(history.undoStack.length).toBeLessThanOrEqual(5);
    });

    it('batches rapid record() calls via debounce', () => {
        vi.useFakeTimers();
        state.html = '<p>a</p>';
        history.record();
        state.html = '<p>ab</p>';
        history.record();

        vi.runAllTimers();

        expect(history.undoStack.at(-1).html).toBe('<p>ab</p>');
        vi.useRealTimers();
    });

    describe('clear', () => {
        it('resets undo stack to only current content', () => {
            state.html = '<p>v1</p>';
            history.push();
            state.html = '<p>v2</p>';
            history.push();
            expect(history.undoStack.length).toBe(3);

            history.clear();

            expect(history.undoStack.length).toBe(1);
            expect(history.undoStack[0].html).toBe('<p>v2</p>');
            expect(history.canUndo()).toBe(false);
        });

        it('empties the redo stack', () => {
            state.html = '<p>v1</p>';
            history.push();
            history.undo();
            expect(history.canRedo()).toBe(true);

            history.clear();

            expect(history.canRedo()).toBe(false);
            expect(history.redoStack.length).toBe(0);
        });

        it('clears any pending debounce timer', () => {
            vi.useFakeTimers();
            history.record();
            history.clear();
            vi.runAllTimers();
            expect(history.undoStack.length).toBe(1);
            vi.useRealTimers();
        });
    });

    describe('destroy', () => {
        it('clears undo stack', () => {
            state.html = '<p>v1</p>';
            history.push();
            history.destroy();
            expect(history.undoStack.length).toBe(0);
        });

        it('clears redo stack', () => {
            state.html = '<p>v1</p>';
            history.push();
            history.undo();
            history.destroy();
            expect(history.redoStack.length).toBe(0);
        });

        it('clears any pending debounce timer', () => {
            vi.useFakeTimers();
            const timerSpy = vi.spyOn(globalThis, 'clearTimeout');
            history.record();
            expect(history.timer).not.toBeNull();
            history.destroy();
            expect(timerSpy).toHaveBeenCalled();
            vi.runAllTimers();
            expect(history.undoStack.length).toBe(0);
            vi.useRealTimers();
        });
    });
});
