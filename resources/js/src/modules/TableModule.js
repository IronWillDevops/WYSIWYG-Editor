import Dialog from '../utils/Dialog.js';

/**
 * Full table editor: insert, delete, merge/split cells, add/remove rows and
 * columns, resize, alignment and cell background colors. A contextual
 * mini-toolbar appears above the table whenever the caret is inside one.
 */
export default class TableModule {
    constructor(editor) {
        this.editor = editor;
        this.buildContextToolbar();
        this.editor.root.addEventListener('click', () => this.syncContextToolbar());
        this.editor.root.addEventListener('keyup', () => this.syncContextToolbar());
        this.editor.on('selectionchange', () => this.syncContextToolbar());

        this.adjustTableHeight = this.adjustTableHeight.bind(this);
        this.handleColumnResizeStart = this.handleColumnResizeStart.bind(this);
        window.addEventListener('resize', this.adjustTableHeight);
        this.editor.on('init', () => setTimeout(this.adjustTableHeight, 0));
        this.editor.on('change', this.adjustTableHeight);

        this.editor.root.addEventListener('mousedown', (e) => this.handleColumnResizeStart(e));
        this.editor.on('paste', () => this.addColumnResizeHandles());
    }

    /**
     * Builds the floating mini-toolbar that appears whenever the caret is
     * inside a table, exposing the row/column/cell operations below through
     * the UI (previously these existed as methods with no way to trigger
     * them from the editor itself).
     */
    buildContextToolbar() {
        this.contextToolbar = document.createElement('div');
        this.contextToolbar.className = 'ife-table-toolbar';
        this.contextToolbar.style.display = 'none';
        this.contextToolbar.setAttribute('role', 'toolbar');
        this.contextToolbar.setAttribute('aria-label', 'Table editing');

        const actions = [
            ['Row above', () => this.addRow(true)],
            ['Row below', () => this.addRow(false)],
            ['Delete row', () => this.deleteRow(), true],
            ['Col left', () => this.addColumn(true)],
            ['Col right', () => this.addColumn(false)],
            ['Delete col', () => this.deleteColumn(), true],
            ['Merge right', () => this.mergeRight()],
            ['Split cell', () => this.splitCell()],
            ['Delete table', () => this.deleteTable(), true],
        ];

        actions.forEach(([label, handler, danger]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `ife-btn ife-btn--ghost ife-table-toolbar__btn${danger ? ' ife-table-toolbar__btn--danger' : ''}`;
            button.textContent = label;
            button.title = label;
            button.addEventListener('mousedown', (event) => event.preventDefault());
            button.addEventListener('click', () => {
                this.editor.selection.restore();
                handler();
                this.syncContextToolbar();
            });
            this.contextToolbar.appendChild(button);
        });

        const colorLabel = document.createElement('label');
        colorLabel.className = 'ife-table-toolbar__color';
        colorLabel.title = 'Cell background color';
        colorLabel.textContent = 'Bg';
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.setAttribute('aria-label', 'Cell background color');
        colorInput.addEventListener('mousedown', (event) => event.stopPropagation());
        colorInput.addEventListener('input', () => {
            this.editor.selection.restore();
            this.setCellBackground(colorInput.value);
        });
        colorLabel.appendChild(colorInput);
        this.contextToolbar.appendChild(colorLabel);

        const borderLabel = document.createElement('label');
        borderLabel.className = 'ife-table-toolbar__color';
        borderLabel.title = 'Cell border color';
        borderLabel.textContent = 'Bd';
        const borderInput = document.createElement('input');
        borderInput.type = 'color';
        borderInput.setAttribute('aria-label', 'Cell border color');
        borderInput.addEventListener('mousedown', (event) => event.stopPropagation());
        borderInput.addEventListener('input', () => {
            this.editor.selection.restore();
            this.setCellBorderColor(borderInput.value);
        });
        borderLabel.appendChild(borderInput);
        this.contextToolbar.appendChild(borderLabel);

        const borderWidthSelect = document.createElement('select');
        borderWidthSelect.className = 'ife-toolbar__select';
        borderWidthSelect.setAttribute('aria-label', 'Cell border width');
        [['', 'Bd W'], ['1px', '1px'], ['2px', '2px'], ['3px', '3px'], ['4px', '4px']].forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            borderWidthSelect.appendChild(option);
        });
        borderWidthSelect.addEventListener('mousedown', (event) => event.stopPropagation());
        borderWidthSelect.addEventListener('change', () => {
            this.editor.selection.restore();
            this.setCellBorderWidth(borderWidthSelect.value);
        });
        this.contextToolbar.appendChild(borderWidthSelect);

        const alignSelect = document.createElement('select');
        alignSelect.className = 'ife-toolbar__select';
        alignSelect.setAttribute('aria-label', 'Table alignment');
        [['left', 'Align left'], ['center', 'Align center'], ['right', 'Align right']].forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            alignSelect.appendChild(option);
        });
        alignSelect.addEventListener('mousedown', (event) => event.stopPropagation());
        alignSelect.addEventListener('change', () => {
            this.editor.selection.restore();
            this.setTableAlignment(alignSelect.value);
        });
        this.contextToolbar.appendChild(alignSelect);
    }

    openInsertDialog() {
        const body = `
            <label class="ife-field">
                <span>Rows</span>
                <input type="number" name="rows" min="1" max="50" value="3" required>
            </label>
            <label class="ife-field">
                <span>Columns</span>
                <input type="number" name="cols" min="1" max="20" value="3" required>
            </label>
            <label class="ife-field--inline">
                <input type="checkbox" name="header" checked>
                <span>Include header row</span>
            </label>
        `;

        this.editor.selection.save();
        const dialog = new Dialog(this.editor.wrapper, {
            title: 'Insert table',
            bodyHtml: body,
            confirmLabel: 'Insert',
            onConfirm: (form) => {
                const data = new FormData(form);
                this.insertTable(Number(data.get('rows')), Number(data.get('cols')), Boolean(data.get('header')));
            },
        });
        dialog.open();
    }

    insertTable(rows, cols, withHeader) {
        this.editor.history.push();
        this.editor.selection.restore();

        const table = document.createElement('table');
        table.className = 'ife-table';

        if (withHeader) {
            const thead = table.createTHead();
            const headRow = thead.insertRow();
            for (let c = 0; c < cols; c += 1) {
                const th = document.createElement('th');
                th.contentEditable = 'true';
                th.innerHTML = '<br>';
                headRow.appendChild(th);
            }
        }

        const tbody = table.createTBody();
        const bodyRows = withHeader ? rows - 1 : rows;
        for (let r = 0; r < Math.max(bodyRows, 1); r += 1) {
            const row = tbody.insertRow();
            for (let c = 0; c < cols; c += 1) {
                const cell = row.insertCell();
                cell.innerHTML = '<br>';
            }
        }

        const range = this.editor.selection.getRange();
        range?.deleteContents();
        range?.insertNode(table);

        this.editor.emitChange();
        this.adjustTableHeight();
    }

    getCurrentCell() {
        return this.editor.selection.closest('td, th');
    }

    getCurrentTable() {
        return this.editor.selection.closest('table');
    }

    addRow(before = false) {
        const cell = this.getCurrentCell();
        const row = cell?.closest('tr');
        if (!row) return;

        this.editor.selection.save();
        this.editor.history.push();
        const newRow = row.cloneNode(true);
        [...newRow.children].forEach((td) => {
            td.innerHTML = '<br>';
        });
        row.parentNode.insertBefore(newRow, before ? row : row.nextSibling);
        this.editor.selection.restore();
        this.editor.selection.focus();
        this.editor.emitChange();
    }

    deleteRow() {
        const row = this.getCurrentCell()?.closest('tr');
        if (!row) return;
        const table = row.closest('table');
        const nextRow = row.nextElementSibling;
        const prevRow = row.previousElementSibling;
        this.editor.history.push();
        row.remove();
        if (table && table.isConnected) {
            const targetRow = nextRow || prevRow;
            if (targetRow) {
                const firstCell = targetRow.querySelector('td, th');
                if (firstCell) {
                    const range = document.createRange();
                    range.setStart(firstCell, 0);
                    range.collapse(true);
                    this.editor.selection.setRange(range);
                }
            }
        }
        this.editor.selection.focus();
        this.editor.emitChange();
    }

    addColumn(before = false) {
        const table = this.getCurrentTable();
        const cell = this.getCurrentCell();
        if (!table || !cell) return;
        const cellRow = cell.parentNode;
        if (!cellRow) return;
        let index = [...cellRow.children].indexOf(cell);
        if (index < 0) return;

        this.editor.selection.save();
        this.editor.history.push();
        table.querySelectorAll('tr').forEach((row) => {
            const reference = row.children[index];
            if (!reference) return;
            const newCell = document.createElement(reference.tagName.toLowerCase() === 'th' ? 'th' : 'td');
            newCell.innerHTML = '<br>';
            row.insertBefore(newCell, before ? reference : reference.nextSibling);
        });
        this.editor.selection.restore();
        this.editor.selection.focus();
        this.editor.emitChange();
    }

    deleteColumn() {
        const table = this.getCurrentTable();
        const cell = this.getCurrentCell();
        if (!table || !cell) return;
        const cellRow = cell.parentNode;
        if (!cellRow) return;
        const index = [...cellRow.children].indexOf(cell);
        if (index < 0) return;

        this.editor.history.push();
        table.querySelectorAll('tr').forEach((row) => row.children[index]?.remove());
        if (table.isConnected) {
            const firstRow = table.querySelector('tr');
            if (firstRow) {
                const firstCell = firstRow.querySelector('td, th');
                if (firstCell) {
                    const range = document.createRange();
                    range.setStart(firstCell, 0);
                    range.collapse(true);
                    this.editor.selection.setRange(range);
                }
            }
        }
        this.editor.selection.focus();
        this.editor.emitChange();
    }

    deleteTable() {
        const table = this.getCurrentTable();
        if (!table) return;
        this.editor.history.push();
        table.remove();
        this.editor.emitChange();
    }

    /** Merges the current cell with its right-hand neighbor. */
    mergeRight() {
        const cell = this.getCurrentCell();
        const next = cell?.nextElementSibling;
        if (!cell || !next) return;

        this.editor.history.push();
        const span = Number(cell.getAttribute('colspan') ?? 1) + Number(next.getAttribute('colspan') ?? 1);
        cell.setAttribute('colspan', String(span));
        cell.innerHTML += ` ${next.innerHTML}`;
        next.remove();
        this.editor.emitChange();
    }

    /** Splits a previously merged cell back into two cells. */
    splitCell() {
        const cell = this.getCurrentCell();
        const span = Number(cell?.getAttribute('colspan') ?? 1);
        if (!cell || span <= 1) return;

        this.editor.history.push();
        cell.setAttribute('colspan', String(span - 1));
        const sibling = document.createElement(cell.tagName.toLowerCase());
        sibling.innerHTML = '<br>';
        cell.after(sibling);
        this.editor.emitChange();
    }

    setCellBackground(color) {
        const cell = this.getCurrentCell();
        if (!cell) return;
        this.editor.history.push();
        cell.style.backgroundColor = color;
        this.editor.emitChange();
    }

    setCellBorderColor(color) {
        const cell = this.getCurrentCell();
        if (!cell) return;
        this.editor.history.push();
        cell.style.borderColor = color;
        this.editor.emitChange();
    }

    setCellBorderWidth(width) {
        if (!width) return;
        const cell = this.getCurrentCell();
        if (!cell) return;
        this.editor.history.push();
        cell.style.borderWidth = width;
        this.editor.emitChange();
    }

    /** @param {'next'|'prev'} direction */
    navigateToCell(direction) {
        const cell = this.getCurrentCell();
        if (!cell) return;
        const row = cell.closest('tr');
        if (!row) return;
        const table = row.closest('table');
        if (!table) return;
        const allRows = [...table.querySelectorAll('tr')];
        const currentRowIndex = allRows.indexOf(row);
        const cells = [...row.children];
        const currentIndex = cells.indexOf(cell);

        let nextRow, nextCells, nextIndex;

        if (direction === 'next') {
            if (currentIndex < cells.length - 1) {
                nextIndex = currentIndex + 1;
                nextCells = cells;
                nextRow = row;
            } else if (currentRowIndex < allRows.length - 1) {
                nextRow = allRows[currentRowIndex + 1];
                nextCells = [...nextRow.children];
                nextIndex = Math.min(currentIndex, nextCells.length - 1);
            } else {
                this.addRow(false);
                nextRow = row.nextElementSibling;
                if (nextRow) {
                    nextCells = [...nextRow.children];
                    nextIndex = 0;
                } else return;
            }
        } else {
            if (currentIndex > 0) {
                nextIndex = currentIndex - 1;
                nextCells = cells;
                nextRow = row;
            } else if (currentRowIndex > 0) {
                nextRow = allRows[currentRowIndex - 1];
                nextCells = [...nextRow.children];
                nextIndex = nextCells.length - 1;
            } else return;
        }

        if (!nextRow || !nextCells) return;
        const target = nextCells[nextIndex];
        if (!target) return;

        const range = document.createRange();
        range.setStart(target, 0);
        range.collapse(true);
        this.editor.selection.setRange(range);
        this.editor.selection.focus();
    }

    handleColumnResizeStart(event) {
        const target = event.target;
        if (!target.classList.contains('ife-col-resize-handle')) return;
        event.preventDefault();
        event.stopPropagation();

        const table = target.closest('table');
        if (!table) return;
        const rect = table.getBoundingClientRect();
        const startX = event.clientX;
        const colIndex = parseInt(target.dataset.col, 10);
        const startWidth = target.dataset.startWidth ? parseFloat(target.dataset.startWidth) : 0;

        const onMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const newWidth = Math.max(20, startWidth + dx);
            table.querySelectorAll('tr').forEach((row) => {
                const cell = row.children[colIndex];
                if (cell) cell.style.width = `${newWidth}px`;
            });
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            this.addColumnResizeHandles();
            this.editor.emitChange();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    addColumnResizeHandles() {
        this.editor.root.querySelectorAll('.ife-col-resize-handle').forEach((el) => el.remove());
        const tables = this.editor.root.querySelectorAll('table.ife-table');
        tables.forEach((table) => {
            const firstRow = table.querySelector('tr');
            if (!firstRow) return;
            [...firstRow.children].forEach((cell, index) => {
                const handle = document.createElement('div');
                handle.className = 'ife-col-resize-handle';
                handle.dataset.col = index;
                handle.dataset.startWidth = cell.getBoundingClientRect().width;
                handle.style.left = `${cell.offsetLeft + cell.offsetWidth - 3}px`;
                const row = firstRow;
                row.style.position = 'relative';
                handle.style.top = '0';
                table.appendChild(handle);
            });
        });
    }

    setTableAlignment(align) {
        const table = this.getCurrentTable();
        if (!table) return;
        this.editor.history.push();
        table.style.marginLeft = align === 'left' || align === 'center' ? (align === 'center' ? 'auto' : '0') : 'auto';
        table.style.marginRight = align === 'right' || align === 'center' ? (align === 'center' ? 'auto' : '0') : 'auto';
        this.editor.emitChange();
    }

    /** Shows/hides the contextual table toolbar based on caret position. */
    syncContextToolbar() {
        const inTable = Boolean(this.getCurrentTable());

        if (inTable && !this.contextToolbar.isConnected) {
            this.editor.wrapper.insertBefore(this.contextToolbar, this.editor.root);
        }

        const wasHidden = this.contextToolbar.style.display === 'none';
        this.contextToolbar.style.display = inTable ? 'flex' : 'none';

        if (inTable || !wasHidden) {
            this.adjustTableHeight();
        }

        this.editor.events.emit('table:context', inTable);
    }

    /** Constrains content area and table height to fit within the viewport. */
    adjustTableHeight() {
        if (!this.editor.root?.isConnected) return;

        const wrapper = this.editor.wrapper;
        const viewportHeight = window.innerHeight;
        const wrapperRect = wrapper.getBoundingClientRect();

        const toolbarEl = wrapper.querySelector('.ife-toolbar');
        const toolbarHeight = toolbarEl ? toolbarEl.offsetHeight : 0;

        const contextToolbarVisible = this.contextToolbar?.style.display !== 'none';
        const contextToolbarHeight = contextToolbarVisible ? (this.contextToolbar?.offsetHeight || 0) : 0;

        const statusbarEl = wrapper.querySelector('.ife-statusbar');
        const statusbarHeight = statusbarEl ? statusbarEl.offsetHeight : 0;

        const wrapperStyle = getComputedStyle(wrapper);
        const wrapperBorderTop = parseFloat(wrapperStyle.borderTopWidth) || 0;
        const wrapperBorderBottom = parseFloat(wrapperStyle.borderBottomWidth) || 0;

        const maxContentHeight = viewportHeight
            - wrapperRect.top
            - wrapperBorderTop
            - toolbarHeight
            - contextToolbarHeight
            - statusbarHeight
            - wrapperBorderBottom;

        this.editor.root.style.maxHeight = `${Math.max(200, Math.floor(maxContentHeight))}px`;

        const tables = this.editor.root.querySelectorAll('table.ife-table');
        if (!tables.length) return;

        const contentPaddingTop = parseFloat(getComputedStyle(this.editor.root).paddingTop) || 16;
        const contentPaddingBottom = parseFloat(getComputedStyle(this.editor.root).paddingBottom) || 16;

        tables.forEach((table) => {
            let precedingHeight = 0;
            let prev = table.previousElementSibling;
            while (prev) {
                const prevStyle = getComputedStyle(prev);
                precedingHeight += prev.offsetHeight
                    + (parseFloat(prevStyle.marginTop) || 0)
                    + (parseFloat(prevStyle.marginBottom) || 0);
                prev = prev.previousElementSibling;
            }

            const tableStyle = getComputedStyle(table);
            const tableMarginTop = parseFloat(tableStyle.marginTop) || 0;
            const tableMarginBottom = parseFloat(tableStyle.marginBottom) || 0;

            const availableForTable = maxContentHeight
                - contentPaddingTop
                - precedingHeight
                - tableMarginTop
                - tableMarginBottom
                - contentPaddingBottom;

            table.style.maxHeight = `${Math.max(200, Math.floor(availableForTable))}px`;
        });
    }

    destroy() {
        window.removeEventListener('resize', this.adjustTableHeight);
        this.editor.root.style.maxHeight = '';
        this.contextToolbar?.remove();
    }
}
