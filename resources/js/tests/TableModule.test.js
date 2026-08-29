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

        it('bounds the editor to the viewport on construction (init may fire before async module load)', () => {
            vi.useFakeTimers();
            root.innerHTML = '<p>some content</p>';

            new TableModule(editor);
            expect(root.style.maxHeight).toBe('');

            vi.advanceTimersByTime(0);
            expect(root.style.maxHeight).toBeTruthy();
            expect(root.style.maxHeight).toMatch(/^\d+px$/);

            vi.useRealTimers();
        });

        it('sets maxHeight clamped to minimum of 200px', () => {
            const module = new TableModule(editor);

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

    describe('DOM mutations', () => {
        function setupEditorWithTable(html) {
            document.body.innerHTML = '';
            wrapper = document.createElement('div');
            wrapper.className = 'ife-wrapper';
            root = document.createElement('div');
            root.contentEditable = 'true';
            root.innerHTML = html;
            wrapper.appendChild(root);
            document.body.appendChild(wrapper);
            editor = {
                root,
                wrapper,
                history: { push: vi.fn() },
                selection: {
                    save: vi.fn(() => {
                        const sel = window.getSelection();
                        if (sel && sel.rangeCount > 0) {
                            const r = sel.getRangeAt(0);
                            savedRange = r ? r.cloneRange() : null;
                        }
                    }),
                    restore: vi.fn(() => {
                        if (savedRange) {
                            const sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(savedRange);
                        }
                    }),
                    getRange: () => {
                        const sel = window.getSelection();
                        if (sel && sel.rangeCount > 0) return sel.getRangeAt(0);
                        return null;
                    },
                    setRange: (r) => {
                        const sel = window.getSelection();
                        sel.removeAllRanges();
                        sel.addRange(r);
                    },
                    closest: (selector) => {
                        const sel = window.getSelection();
                        if (!sel || sel.rangeCount === 0) return null;
                        let node = sel.getRangeAt(0).commonAncestorContainer;
                        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
                        while (node && node !== wrapper) {
                            if (node instanceof HTMLElement && node.matches(selector)) return node;
                            node = node.parentElement;
                        }
                        return null;
                    },
                    focus: vi.fn(),
                },
                emitChange: vi.fn(),
                events: { on: vi.fn(() => vi.fn()), emit: vi.fn() },
                on: vi.fn(() => vi.fn()),
            };
        }

        let savedRange = null;

        function selectCell(tableSelector, rowIndex, cellIndex) {
            const table = root.querySelector(tableSelector);
            const row = table.rows[rowIndex];
            const cell = row.cells[cellIndex];
            const range = document.createRange();
            range.setStart(cell, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            savedRange = range.cloneRange();
        }

        describe('insertTable', () => {
            function selectInRoot() {
                const range = document.createRange();
                range.selectNodeContents(root);
                range.collapse(true);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }

            it('creates a table with specified dimensions', () => {
                setupEditorWithTable('<p>hello</p>');
                const module = new TableModule(editor);
                selectInRoot();

                module.insertTable(3, 4, true);

                const table = root.querySelector('table.ife-table');
                expect(table).not.toBeNull();
                expect(table.querySelector('thead')).not.toBeNull();
                expect(table.querySelector('tbody')).not.toBeNull();
                const rows = table.querySelectorAll('tr');
                expect(rows.length).toBe(3);
                expect(rows[0].querySelectorAll('th').length).toBe(4);
            });

            it('creates table without header row', () => {
                setupEditorWithTable('<p>hello</p>');
                const module = new TableModule(editor);
                selectInRoot();

                module.insertTable(2, 3, false);

                const table = root.querySelector('table.ife-table');
                expect(table.querySelector('thead')).toBeNull();
                expect(table.querySelector('tbody')).not.toBeNull();
                expect(table.rows.length).toBe(2);
                expect(table.rows[0].cells.length).toBe(3);
            });

            it('pushes history and emits change', () => {
                setupEditorWithTable('<p>hello</p>');
                const module = new TableModule(editor);
                selectInRoot();

                module.insertTable(2, 2, false);

                expect(editor.history.push).toHaveBeenCalled();
                expect(editor.emitChange).toHaveBeenCalled();
            });
        });

        describe('addRow', () => {
            it('adds a row below the current row', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>a1</td></tr><tr><td>b1</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.addRow(false);

                const rows = root.querySelectorAll('tr');
                expect(rows.length).toBe(3);
            });

            it('adds a row above the current row', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>a1</td></tr><tr><td>b1</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 1, 0);

                module.addRow(true);

                const rows = root.querySelectorAll('tr');
                expect(rows.length).toBe(3);
            });
        });

        describe('deleteRow', () => {
            it('removes the current row', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>a</td></tr><tr><td>b</td></tr><tr><td>c</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 1, 0);

                module.deleteRow();

                const rows = root.querySelectorAll('tr');
                expect(rows.length).toBe(2);
            });
        });

        describe('addColumn', () => {
            it('adds a column to the right', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>a1</td><td>a2</td></tr><tr><td>b1</td><td>b2</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.addColumn(false);

                const firstRow = root.querySelector('tr');
                expect(firstRow.cells.length).toBe(3);
                expect(root.querySelectorAll('tr').length).toBe(2);
            });

            it('adds a column to the left', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>a1</td><td>a2</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 1);

                module.addColumn(true);

                const firstRow = root.querySelector('tr');
                expect(firstRow.cells.length).toBe(3);
            });
        });

        describe('deleteColumn', () => {
            it('removes the current column', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>a</td><td>b</td><td>c</td></tr><tr><td>d</td><td>e</td><td>f</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 1);

                module.deleteColumn();

                const firstRow = root.querySelector('tr');
                expect(firstRow.cells.length).toBe(2);
                expect(firstRow.cells[0].textContent).toBe('a');
                expect(firstRow.cells[1].textContent).toBe('c');
            });
        });

        describe('mergeRight', () => {
            it('merges current cell with next cell', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>left</td><td>right</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.mergeRight();

                const cells = root.querySelectorAll('td');
                expect(cells.length).toBe(1);
                expect(cells[0].getAttribute('colspan')).toBe('2');
            });
        });

        describe('splitCell', () => {
            it('splits a merged cell', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td colspan="2">merged</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.splitCell();

                const cells = root.querySelectorAll('td');
                expect(cells.length).toBe(2);
                expect(cells[0].getAttribute('colspan')).toBe('1');
            });

            it('does nothing for unmerged cell', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>simple</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.splitCell();

                const cells = root.querySelectorAll('td');
                expect(cells.length).toBe(1);
            });
        });

        describe('deleteTable', () => {
            it('removes the entire table', () => {
                setupEditorWithTable('<p>before</p><table class="ife-table"><tr><td>cell</td></tr></table><p>after</p>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.deleteTable();

                expect(root.querySelector('table')).toBeNull();
            });
        });

        describe('setCellBackground', () => {
            it('sets background color on current cell', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>cell</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.setCellBackground('#ff0000');

                const cell = root.querySelector('td');
                expect(cell.style.backgroundColor).toBe('rgb(255, 0, 0)');
            });
        });

        describe('setCellBorderColor', () => {
            it('sets border color on current cell', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>cell</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.setCellBorderColor('#00ff00');

                const cell = root.querySelector('td');
                expect(cell.style.borderColor).toBe('rgb(0, 255, 0)');
            });
        });

        describe('setCellBorderWidth', () => {
            it('sets border width on current cell', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>cell</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.setCellBorderWidth('2px');

                const cell = root.querySelector('td');
                expect(cell.style.borderWidth).toBe('2px');
            });

            it('does nothing when width is empty', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>cell</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.setCellBorderWidth('');

                expect(editor.history.push).not.toHaveBeenCalled();
            });
        });

        describe('setTableAlignment', () => {
            it('sets table to center alignment', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>cell</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.setTableAlignment('center');

                const table = root.querySelector('table');
                expect(table.style.marginLeft).toBe('auto');
                expect(table.style.marginRight).toBe('auto');
            });

            it('sets table to left alignment', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>cell</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.setTableAlignment('left');

                const table = root.querySelector('table');
                expect(table.style.marginLeft).toBe('0px');
                expect(table.style.marginRight).toBe('auto');
            });

            it('sets table to right alignment', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>cell</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.setTableAlignment('right');

                const table = root.querySelector('table');
                expect(table.style.marginLeft).toBe('auto');
                expect(table.style.marginRight).toBe('0px');
            });
        });

        describe('navigateToCell', () => {
            it('moves to next cell in same row', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>a</td><td>b</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.navigateToCell('next');

                const sel = window.getSelection();
                const cell = sel.getRangeAt(0).commonAncestorContainer;
                const td = cell.nodeType === Node.TEXT_NODE ? cell.parentElement : cell;
                expect(td.closest('td').textContent).toBe('b');
            });

            it('moves to previous cell in same row', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>a</td><td>b</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 1);

                module.navigateToCell('prev');

                const sel = window.getSelection();
                const cell = sel.getRangeAt(0).commonAncestorContainer;
                const td = cell.nodeType === Node.TEXT_NODE ? cell.parentElement : cell;
                expect(td.closest('td').textContent).toBe('a');
            });

            it('moves to cell at same column index in next row', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>a1</td><td>a2</td></tr><tr><td>b1</td><td>b2</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 1);

                module.navigateToCell('next');

                const sel = window.getSelection();
                const cell = sel.getRangeAt(0).commonAncestorContainer;
                const td = cell.nodeType === Node.TEXT_NODE ? cell.parentElement : cell;
                expect(td.closest('td').textContent).toBe('b2');
            });

            it('moves to last cell of previous row', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>a1</td><td>a2</td></tr><tr><td>b1</td><td>b2</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 1, 0);

                module.navigateToCell('prev');

                const sel = window.getSelection();
                const cell = sel.getRangeAt(0).commonAncestorContainer;
                const td = cell.nodeType === Node.TEXT_NODE ? cell.parentElement : cell;
                expect(td.closest('td').textContent).toBe('a2');
            });

            it('does nothing when at first cell going prev', () => {
                setupEditorWithTable('<table class="ife-table"><tr><td>a</td></tr></table>');
                const module = new TableModule(editor);
                selectCell('table.ife-table', 0, 0);

                module.navigateToCell('prev');

                expect(root.querySelector('td').textContent).toBe('a');
            });
        });
    });
});
