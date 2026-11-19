import { describe, it, expect, beforeEach, vi } from 'vitest';
import Dialog from '../src/utils/Dialog.js';

describe('Dialog', () => {
    let container;
    let dialog;

    beforeEach(() => {
        document.body.innerHTML = '';
        container = document.createElement('div');
        container.id = 'editor-wrapper';
        document.body.appendChild(container);
    });

    it('opens and appends overlay to document.body', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<p>body</p>',
            onConfirm: () => {},
        });
        dialog.open();

        expect(document.body.querySelector('.ife-dialog-overlay')).not.toBeNull();
        expect(document.body.querySelector('.ife-dialog')).not.toBeNull();
    });

    it('closes and removes overlay from DOM', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<p>body</p>',
            onConfirm: () => {},
        });
        dialog.open();
        dialog.close();

        expect(document.body.querySelector('.ife-dialog-overlay')).toBeNull();
    });

    it('calls onConfirm with form data on submit', () => {
        const onConfirm = vi.fn();
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<input name="val" value="hello">',
            onConfirm,
        });
        dialog.open();

        const form = document.body.querySelector('form');
        form.dispatchEvent(new Event('submit', { cancelable: true }));

        expect(onConfirm).toHaveBeenCalled();
    });

    it('closes on escape key', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<p>body</p>',
            onConfirm: () => {},
        });
        dialog.open();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(document.body.querySelector('.ife-dialog-overlay')).toBeNull();
    });

    it('closes when clicking the overlay backdrop', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<p>body</p>',
            onConfirm: () => {},
        });
        dialog.open();

        const overlay = document.body.querySelector('.ife-dialog-overlay');
        overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(document.body.querySelector('.ife-dialog-overlay')).toBeNull();
    });

    it('closes when clicking the close button', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<p>body</p>',
            onConfirm: () => {},
        });
        dialog.open();

        const closeBtn = document.body.querySelector('.ife-dialog__close');
        closeBtn.click();

        expect(document.body.querySelector('.ife-dialog-overlay')).toBeNull();
    });

    it('closes when clicking the cancel button', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<p>body</p>',
            onConfirm: () => {},
        });
        dialog.open();

        const cancelBtn = document.body.querySelector('[data-action="cancel"]');
        cancelBtn.click();

        expect(document.body.querySelector('.ife-dialog-overlay')).toBeNull();
    });

    it('auto-focuses the first input on open', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<input name="val" type="text">',
            onConfirm: () => {},
        });
        dialog.open();

        const input = document.body.querySelector('input');
        expect(document.activeElement).toBe(input);
    });

    it('does not prevent mousedown default on input elements', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<input name="val" type="text">',
            onConfirm: () => {},
        });
        dialog.open();

        const input = document.body.querySelector('input');
        const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        input.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
    });

    it('prevents button from receiving focus on mousedown', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<p>body</p>',
            onConfirm: () => {},
        });
        dialog.open();

        const confirmBtn = document.body.querySelector('[data-action="confirm"]');
        const mousedownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        confirmBtn.dispatchEvent(mousedownEvent);

        expect(mousedownEvent.defaultPrevented).toBe(true);
    });

    it('keeps the dialog open when onConfirm returns false', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<input name="val" value="x">',
            onConfirm: () => false,
        });
        dialog.open();

        const form = document.body.querySelector('form');
        form.dispatchEvent(new Event('submit', { cancelable: true }));

        expect(document.body.querySelector('.ife-dialog-overlay')).not.toBeNull();
        // The user can correct the input and submit again: a valid confirm
        // after a rejected one must still close the dialog.
        dialog.onConfirm = () => undefined;
        form.dispatchEvent(new Event('submit', { cancelable: true }));
        expect(document.body.querySelector('.ife-dialog-overlay')).toBeNull();
    });

    it('does not register the document Escape listener until opened', () => {
        const addSpy = vi.spyOn(document, 'addEventListener');
        try {
            dialog = new Dialog(container, {
                title: 'Test',
                bodyHtml: '<p>body</p>',
                onConfirm: () => {},
            });

            const beforeOpen = addSpy.mock.calls.filter(([type]) => type === 'keydown');
            expect(beforeOpen.length).toBe(0);

            dialog.open();
            const afterOpen = addSpy.mock.calls.filter(([type]) => type === 'keydown');
            expect(afterOpen.length).toBe(1);
        } finally {
            addSpy.mockRestore();
        }
    });

    it('removes the Escape listener on close and stays idempotent', () => {
        const onClose = vi.fn();
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<p>body</p>',
            onConfirm: () => {},
            onClose,
        });
        const removeSpy = vi.spyOn(document, 'removeEventListener');
        dialog.open();
        dialog.close();

        const removed = removeSpy.mock.calls.filter(([type]) => type === 'keydown');
        expect(removed.length).toBe(1);

        // A second close (Escape + destroy racing) must not fire onClose again
        // or re-touch document.body styles.
        dialog.close();
        expect(onClose).toHaveBeenCalledTimes(1);
        removeSpy.mockRestore();
    });

    it('closing a dialog that was never opened is a no-op', () => {
        const onClose = vi.fn();
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<p>body</p>',
            onConfirm: () => {},
            onClose,
        });

        expect(() => dialog.close()).not.toThrow();
        expect(onClose).not.toHaveBeenCalled();
        expect(document.body.querySelector('.ife-dialog-overlay')).toBeNull();
    });
});
