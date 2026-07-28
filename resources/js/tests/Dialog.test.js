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

    it('opens and appends overlay to container', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<p>body</p>',
            onConfirm: () => {},
        });
        dialog.open();

        expect(container.querySelector('.ife-dialog-overlay')).not.toBeNull();
        expect(container.querySelector('.ife-dialog')).not.toBeNull();
    });

    it('closes and removes overlay from DOM', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<p>body</p>',
            onConfirm: () => {},
        });
        dialog.open();
        dialog.close();

        expect(container.querySelector('.ife-dialog-overlay')).toBeNull();
    });

    it('calls onConfirm with form data on submit', () => {
        const onConfirm = vi.fn();
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<input name="val" value="hello">',
            onConfirm,
        });
        dialog.open();

        const form = container.querySelector('form');
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

        expect(container.querySelector('.ife-dialog-overlay')).toBeNull();
    });

    it('closes when clicking the overlay backdrop', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<p>body</p>',
            onConfirm: () => {},
        });
        dialog.open();

        const overlay = container.querySelector('.ife-dialog-overlay');
        overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(container.querySelector('.ife-dialog-overlay')).toBeNull();
    });

    it('closes when clicking the close button', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<p>body</p>',
            onConfirm: () => {},
        });
        dialog.open();

        const closeBtn = container.querySelector('.ife-dialog__close');
        closeBtn.click();

        expect(container.querySelector('.ife-dialog-overlay')).toBeNull();
    });

    it('closes when clicking the cancel button', () => {
        dialog = new Dialog(container, {
            title: 'Test',
            bodyHtml: '<p>body</p>',
            onConfirm: () => {},
        });
        dialog.open();

        const cancelBtn = container.querySelector('[data-action="cancel"]');
        cancelBtn.click();

        expect(container.querySelector('.ife-dialog-overlay')).toBeNull();
    });
});
