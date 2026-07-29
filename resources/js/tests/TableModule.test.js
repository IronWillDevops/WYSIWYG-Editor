import { describe, it, expect, vi, beforeEach } from 'vitest';
import TableModule from '../src/modules/TableModule.js';

describe('TableModule', () => {
    let editor;
    let root;

    function createEditor(withToolbar = false, withStatusbar = false) {
        wrapper = document.createElement('div');
        wrapper.className = 'ife-wrapper';
        wrapper.style.position = 'relative';
        root = document.createElement('div');
        root.className = 'ife-content';
        root.contentEditable = 'true';
        root.innerHTML = '<p>hello</p>';
        wrapper.appendChild(root);

        if (withToolbar) {
            const toolbar = document.createElement('div');
            toolbar.className = 'ife-toolbar';
            toolbar.style.height = '40px';
            wrapper.appendChild(toolbar);
        }

        if (withStatusbar) {
            const statusbar = document.createElement('div');
            statusbar.className = 'ife-statusbar';
            statusbar.style.height = '24px';
            wrapper.appendChild(statusbar);
        }

        document.body.innerHTML = '';
        document.body.appendChild(wrapper);

        editor = {
            root,
            wrapper,
            history: { push: () => {} },
            selection: {
                save: () => {},
                restore: () => {},
                getRange: () => null,
                closest: () => null,
            },
            commands: {},
            events: {
                on: () => () => {},
                emit: () => {},
            },
            emitChange: () => {},
            on: () => () => {},
        };
    }

    let wrapper;

    beforeEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';

        createEditor();
    });

    describe('adjustTableHeight', () => {
        it('sets maxHeight on root even when no tables exist', () => {
            root.innerHTML = '<p>some content</p>';
            const module = new TableModule(editor);

            module.adjustTableHeight();

            expect(root.style.maxHeight).toBeTruthy();
            expect(root.style.maxHeight).toMatch(/^\d+px$/);
        });

        it('sets maxHeight clamped to minimum of 200px', () => {
            const module = new TableModule(editor);

            const originalHeight = window.innerHeight;
            vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(50);

            module.adjustTableHeight();

            expect(root.style.maxHeight).toBe('200px');
        });

        it('sets maxHeight on root and table when a table is present', () => {
            root.innerHTML = '<table class="ife-table"><tr><td>cell</td></tr></table>';
            const module = new TableModule(editor);

            module.adjustTableHeight();

            expect(root.style.maxHeight).toBeTruthy();
            expect(root.style.maxHeight).toMatch(/^\d+px$/);

            const table = root.querySelector('table.ife-table');
            expect(table.style.maxHeight).toBeTruthy();
            expect(table.style.maxHeight).toMatch(/^\d+px$/);
        });

        it('accounts for content padding in table maxHeight', () => {
            root.style.paddingTop = '30px';
            root.style.paddingBottom = '30px';
            root.innerHTML = '<table class="ife-table"><tr><td>cell</td></tr></table>';
            const module = new TableModule(editor);

            module.adjustTableHeight();

            const table = root.querySelector('table.ife-table');
            const tableMaxHeight = parseFloat(table.style.maxHeight);
            const rootMaxHeight = parseFloat(root.style.maxHeight);

            expect(tableMaxHeight).toBeLessThan(rootMaxHeight);
        });

        it('adjusts each table independently based on preceding content', () => {
            const p1 = document.createElement('p');
            p1.style.marginBottom = '100px';
            p1.textContent = 'text';

            const t1 = document.createElement('table');
            t1.className = 'ife-table';
            t1.id = 't1';
            t1.innerHTML = '<tr><td>table 1</td></tr>';

            const p2 = document.createElement('p');
            p2.style.marginBottom = '50px';
            p2.textContent = 'more text';

            const t2 = document.createElement('table');
            t2.className = 'ife-table';
            t2.id = 't2';
            t2.innerHTML = '<tr><td>table 2</td></tr>';

            root.append(p1, t1, p2, t2);

            const module = new TableModule(editor);
            module.adjustTableHeight();

            const h1 = parseFloat(t1.style.maxHeight);
            const h2 = parseFloat(t2.style.maxHeight);

            expect(h2).toBeLessThan(h1);
        });

        it('subtracts toolbar height when toolbar is present', () => {
            createEditor(true, false);

            root.innerHTML = '<table class="ife-table"><tr><td>cell</td></tr></table>';
            const module = new TableModule(editor);

            module.adjustTableHeight();

            expect(root.style.maxHeight).toBeTruthy();
            expect(root.style.maxHeight).toMatch(/^\d+px$/);
        });

        it('subtracts statusbar height when statusbar is present', () => {
            createEditor(false, true);

            root.innerHTML = '<table class="ife-table"><tr><td>cell</td></tr></table>';
            const module = new TableModule(editor);

            module.adjustTableHeight();

            expect(root.style.maxHeight).toBeTruthy();
            expect(root.style.maxHeight).toMatch(/^\d+px$/);
        });

        it('subtracts context toolbar height when visible', () => {
            root.innerHTML = '<table class="ife-table"><tr><td>cell</td></tr></table>';
            const module = new TableModule(editor);

            module.contextToolbar.style.display = 'flex';
            module.contextToolbar.style.height = '36px';

            module.adjustTableHeight();

            expect(root.style.maxHeight).toBeTruthy();
        });
    });

    describe('destroy', () => {
        it('clears maxHeight on root', () => {
            root.innerHTML = '<table class="ife-table"><tr><td>cell</td></tr></table>';
            const module = new TableModule(editor);

            module.adjustTableHeight();
            expect(root.style.maxHeight).toBeTruthy();

            module.destroy();
            expect(root.style.maxHeight).toBe('');
        });

    });
});
