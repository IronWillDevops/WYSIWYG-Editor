import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TableModule from '../src/modules/TableModule.js';

function createMockEditor() {
    const root = document.createElement('div');
    root.contentEditable = 'true';
    const wrapper = document.createElement('div');
    wrapper.appendChild(root);
    const events = {};
    return {
        root,
        wrapper,
        selection: {
            save: vi.fn(),
            restore: vi.fn(),
            closest: vi.fn((selector) => null),
            getRange: vi.fn(() => {
                const range = document.createRange();
                range.setStart(root, 0);
                range.collapse(true);
                return range;
            }),
        },
        history: { push: vi.fn() },
        emitChange: vi.fn(),
        events: { emit: vi.fn() },
        on: vi.fn((event, handler) => {
            events[event] = handler;
            return () => {};
        }),
    };
}

describe('TableModule', () => {
    let editor;
    let module;

    beforeEach(() => {
        document.body.innerHTML = '';
        editor = createMockEditor();
        document.body.appendChild(editor.wrapper);
        module = new TableModule(editor);
    });

    afterEach(() => {
        module.destroy();
        document.body.innerHTML = '';
    });

    function setupTableInEditor(rows = 3, cols = 3, withHeader = true) {
        const table = document.createElement('table');
        table.className = 'ife-table';
        if (withHeader) {
            const thead = table.createTHead();
            const hr = thead.insertRow();
            for (let c = 0; c < cols; c++) {
                const th = document.createElement('th');
                th.innerHTML = `<br>`;
                hr.appendChild(th);
            }
        }
        const tbody = table.createTBody();
        const bodyRows = withHeader ? rows - 1 : rows;
        for (let r = 0; r < Math.max(bodyRows, 1); r++) {
            const tr = tbody.insertRow();
            for (let c = 0; c < cols; c++) {
                const td = tr.insertCell();
                td.innerHTML = `<br>`;
            }
        }
        editor.root.appendChild(table);
        const firstCell = table.querySelector('td, th');
        if (firstCell) {
            const range = document.createRange();
            range.setStart(firstCell, 0);
            range.collapse(true);
            editor.selection.closest = vi.fn((sel) => {
                if (sel === 'table') return table;
                if (sel === 'td, th') return firstCell;
                if (sel === 'tr') return firstCell?.closest('tr');
                return null;
            });
        }
        return table;
    }

    it('inserts table with correct structure', () => {
        module.insertTable(3, 4, true);
        const table = editor.root.querySelector('table.ife-table');
        expect(table).not.toBeNull();
        expect(table.querySelectorAll('th').length).toBe(4);
        expect(table.querySelectorAll('td').length).toBe(8);
    });

    it('inserts table without header', () => {
        module.insertTable(2, 2, false);
        const table = editor.root.querySelector('table.ife-table');
        expect(table).not.toBeNull();
        expect(table.querySelector('thead')).toBeNull();
        expect(table.querySelectorAll('td').length).toBe(4);
    });

    it('inserts table with minimum 1 body row', () => {
        module.insertTable(1, 2, false);
        const table = editor.root.querySelector('table.ife-table');
        expect(table.querySelectorAll('td').length).toBe(2);
    });

    it('pushes history on insertTable', () => {
        module.insertTable(2, 2, false);
        expect(editor.history.push).toHaveBeenCalled();
    });

    it('adds a row above current', () => {
        const table = setupTableInEditor(3, 2, false);
        module.addRow(true);
        expect(table.querySelectorAll('tr').length).toBe(4);
    });

    it('adds a row below current', () => {
        const table = setupTableInEditor(3, 2, false);
        module.addRow(false);
        expect(table.querySelectorAll('tr').length).toBe(4);
    });

    it('deletes current row', () => {
        const table = setupTableInEditor(3, 2, false);
        module.deleteRow();
        expect(table.querySelectorAll('tr').length).toBe(2);
    });

    it('adds a column to the left', () => {
        const table = setupTableInEditor(2, 2, false);
        module.addColumn(true);
        table.querySelectorAll('tr').forEach((tr) => {
            expect(tr.children.length).toBe(3);
        });
    });

    it('adds a column to the right', () => {
        const table = setupTableInEditor(2, 2, false);
        module.addColumn(false);
        table.querySelectorAll('tr').forEach((tr) => {
            expect(tr.children.length).toBe(3);
        });
    });

    it('deletes current column', () => {
        const table = setupTableInEditor(2, 3, false);
        module.deleteColumn();
        table.querySelectorAll('tr').forEach((tr) => {
            expect(tr.children.length).toBe(2);
        });
    });

    it('deletes the entire table', () => {
        setupTableInEditor(2, 2, false);
        module.deleteTable();
        expect(editor.root.querySelector('table.ife-table')).toBeNull();
    });

    it('merges cell to the right', () => {
        const table = setupTableInEditor(2, 3, false);
        module.mergeRight();
        const firstRow = table.querySelector('tr');
        expect(firstRow.children.length).toBe(2);
        expect(firstRow.children[0].getAttribute('colspan')).toBe('2');
    });

    it('splits a merged cell', () => {
        const table = setupTableInEditor(2, 3, false);
        const cell = table.querySelector('td');
        cell.setAttribute('colspan', '2');
        module.splitCell();
        expect(cell.getAttribute('colspan')).toBe('1');
        expect(cell.nextElementSibling).not.toBeNull();
    });

    it('does not split a cell with colspan 1', () => {
        const table = setupTableInEditor(2, 2, false);
        const cell = table.querySelector('td');
        const nextSibling = cell.nextElementSibling;
        module.splitCell();
        expect(cell.getAttribute('colspan')).toBeNull();
        expect(cell.nextElementSibling).toBe(nextSibling);
    });

    it('sets cell background color', () => {
        const table = setupTableInEditor(2, 2, false);
        const cell = table.querySelector('td');
        module.setCellBackground('#ff0000');
        expect(cell.style.backgroundColor).toBe('rgb(255, 0, 0)');
    });

    it('sets table alignment', () => {
        const table = setupTableInEditor(2, 2, false);
        module.setTableAlignment('center');
        expect(table.style.marginLeft).toBe('auto');
        expect(table.style.marginRight).toBe('auto');
    });

    it('builds context toolbar on construction', () => {
        const toolbar = module.contextToolbar;
        expect(toolbar).not.toBeNull();
        expect(toolbar.classList.contains('ife-table-toolbar')).toBe(true);
    });

    it('calls adjustTableHeight on init', () => {
        expect(editor.on).toHaveBeenCalledWith('init', expect.any(Function));
        expect(editor.on).toHaveBeenCalledWith('change', expect.any(Function));
    });
});
