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
});
