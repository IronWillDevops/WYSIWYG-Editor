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
        colorLabel.textContent = 'Cell';
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

        this.editor.history.push();
        const newRow = row.cloneNode(true);
        [...newRow.children].forEach((td) => {
            td.innerHTML = '<br>';
        });
        row.parentNode.insertBefore(newRow, before ? row : row.nextSibling);
        this.editor.emitChange();
    }

    deleteRow() {
        const row = this.getCurrentCell()?.closest('tr');
        if (!row) return;
        this.editor.history.push();
        row.remove();
        this.editor.emitChange();
    }

    addColumn(before = false) {
        const table = this.getCurrentTable();
        const cell = this.getCurrentCell();
        if (!table || !cell) return;
        const index = [...cell.parentNode.children].indexOf(cell);

        this.editor.history.push();
        table.querySelectorAll('tr').forEach((row) => {
            const reference = row.children[index];
            const newCell = document.createElement(reference?.tagName.toLowerCase() === 'th' ? 'th' : 'td');
            newCell.innerHTML = '<br>';
            row.insertBefore(newCell, before ? reference : reference?.nextSibling ?? null);
        });
        this.editor.emitChange();
    }

    deleteColumn() {
        const table = this.getCurrentTable();
        const cell = this.getCurrentCell();
        if (!table || !cell) return;
        const index = [...cell.parentNode.children].indexOf(cell);

        this.editor.history.push();
        table.querySelectorAll('tr').forEach((row) => row.children[index]?.remove());
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

        // Mounted lazily on first use (rather than in the constructor) so it
        // lands after the main Toolbar in the DOM even though modules are
        // constructed before the Toolbar is — this keeps it visually docked
        // right above the content area instead of above the main toolbar.
        if (inTable && !this.contextToolbar.isConnected) {
            this.editor.wrapper.insertBefore(this.contextToolbar, this.editor.root);
        }

        this.contextToolbar.style.display = inTable ? 'flex' : 'none';
        this.editor.events.emit('table:context', inTable);
    }

    destroy() {
        this.contextToolbar?.remove();
    }
}
