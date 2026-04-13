import document from 'document';
import toolset from './toolset.js';
import { instances } from './common.js';
import {
  addListener,
  createElement,
  findInstance,
  getInstanceId,
  getTranslation,
  toggleButton
} from './utils.js';
import { dispatchEvent, execCommand } from './shortcuts.js';

// Saved selection for table menu (separate from shared currentSelection)
let tableMenuSelection = null;

// Flag to prevent closing menu immediately after opening
let isTableMenuOpening = false;

// ============ DOM HELPERS ============

/**
 * Find the table cell (td or th) containing the given node.
 * @param {object} node A DOM node.
 * @return {object|null} The table cell element, or null.
 */
function getCurrentCell(node) {
  while (node) {
    if (node.nodeType === 1) {
      if (node.tagName === 'TD' || node.tagName === 'TH') return node;
      if (node.classList.contains('wysi-editor')) return null;
    }
    node = node.parentNode;
  }
  return null;
}

/**
 * Find the table element containing the given node.
 * @param {object} node A DOM node.
 * @return {object|null} The table element, or null.
 */
function getCurrentTable(node) {
  while (node) {
    if (node.nodeType === 1) {
      if (node.tagName === 'TABLE') return node;
      if (node.classList.contains('wysi-editor')) return null;
    }
    node = node.parentNode;
  }
  return null;
}

/**
 * Get the index of a cell within its row.
 * @param {object} cell The td/th element.
 * @return {number} The zero-based index.
 */
function getCellIndex(cell) {
  let index = 0;
  let sibling = cell.previousElementSibling;
  while (sibling) {
    index++;
    sibling = sibling.previousElementSibling;
  }
  return index;
}

/**
 * Get all rows from a table.
 * @param {object} table The table element.
 * @return {array} Array of tr elements.
 */
function getAllRows(table) {
  return Array.from(table.querySelectorAll('tr'));
}

/**
 * Create an empty table cell.
 * @param {string} [tagName] The cell tag name (td or th).
 * @return {object} A new cell element with a br placeholder.
 */
function createCell(tagName) {
  const cell = createElement(tagName || 'td');
  cell.appendChild(createElement('br'));
  return cell;
}

/**
 * Move cursor focus to a table cell.
 * @param {object} cell The cell to focus.
 */
function focusCell(cell) {
  const selection = document.getSelection();
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Dispatch an input event on the editor to sync content.
 * @param {object} editor The editor element.
 */
function syncEditor(editor) {
  if (editor) {
    dispatchEvent(editor, 'input');
  }
}

// ============ TABLE OPERATIONS ============

/**
 * Insert a new table at the current cursor position.
 * @param {number} rows Number of rows.
 * @param {number} cols Number of columns.
 */
function insertTable(rows, cols, header) {
  const table = createElement('table');

  if (header) {
    const thead = createElement('thead');
    const tr = createElement('tr');
    for (let j = 0; j < cols; j++) {
      tr.appendChild(createCell('th'));
    }
    thead.appendChild(tr);
    table.appendChild(thead);
  }

  const tbody = createElement('tbody');

  for (let i = 0; i < rows; i++) {
    const tr = createElement('tr');
    for (let j = 0; j < cols; j++) {
      tr.appendChild(createCell());
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);

  // Add a trailing paragraph so users can type after the table
  execCommand('insertHTML', table.outerHTML + '<p><br></p>');

  // Add resize handles to the newly inserted table
  const selection = document.getSelection();
  if (selection.anchorNode) {
    const newTable = getCurrentTable(selection.anchorNode);
    if (newTable) addResizeHandles(newTable);
  }
}

/**
 * Add a row above or below the current row.
 * @param {string} position Either 'above' or 'below'.
 */
function addRow(position) {
  const selection = document.getSelection();
  if (!selection.anchorNode) return;

  const cell = getCurrentCell(selection.anchorNode);
  if (!cell) return;

  const row = cell.parentNode;
  const colCount = row.children.length;
  const newRow = createElement('tr');

  for (let i = 0; i < colCount; i++) {
    const newCell = createCell();
    const refWidth = row.children[i].style.width;
    if (refWidth) newCell.style.width = refWidth;
    newRow.appendChild(newCell);
  }

  if (position === 'above') {
    row.before(newRow);
  } else {
    row.after(newRow);
  }
}

/**
 * Remove the current row. Deletes the table if only one row remains.
 */
function removeRow() {
  const selection = document.getSelection();
  if (!selection.anchorNode) return;

  const cell = getCurrentCell(selection.anchorNode);
  if (!cell) return;

  const row = cell.parentNode;
  const table = getCurrentTable(cell);
  const rows = getAllRows(table);

  if (rows.length <= 1) {
    deleteTable();
  } else {
    const nextRow = row.nextElementSibling || row.previousElementSibling;
    row.remove();

    if (nextRow && nextRow.firstElementChild) {
      focusCell(nextRow.firstElementChild);
    }
  }
}

/**
 * Add a column to the left or right of the current column.
 * @param {string} position Either 'left' or 'right'.
 */
function addColumn(position) {
  const selection = document.getSelection();
  if (!selection.anchorNode) return;

  const cell = getCurrentCell(selection.anchorNode);
  if (!cell) return;

  const cellIndex = getCellIndex(cell);
  const table = getCurrentTable(cell);
  const rows = getAllRows(table);

  rows.forEach(row => {
    const refCell = row.children[cellIndex];
    if (!refCell) return;

    const tagName = refCell.tagName.toLowerCase();
    const newCell = createCell(tagName);

    if (position === 'left') {
      refCell.before(newCell);
    } else {
      refCell.after(newCell);
    }
  });

  // Reset widths and refresh handles
  getAllRows(table).forEach(row => {
    Array.from(row.children).forEach(c => c.style.width = '');
  });
  addResizeHandles(table);
}

/**
 * Remove the current column. Deletes the table if only one column remains.
 */
function removeColumn() {
  const selection = document.getSelection();
  if (!selection.anchorNode) return;

  const cell = getCurrentCell(selection.anchorNode);
  if (!cell) return;

  const cellIndex = getCellIndex(cell);
  const row = cell.parentNode;

  if (row.children.length <= 1) {
    deleteTable();
    return;
  }

  const table = getCurrentTable(cell);
  const rows = getAllRows(table);

  rows.forEach(r => {
    const cellToRemove = r.children[cellIndex];
    if (cellToRemove) cellToRemove.remove();
  });

  // Reset widths and refresh handles
  getAllRows(table).forEach(r => {
    Array.from(r.children).forEach(c => c.style.width = '');
  });
  addResizeHandles(table);

  const targetCell = row.children[cellIndex] || row.children[cellIndex - 1];
  if (targetCell) focusCell(targetCell);
}

/**
 * Delete the entire table and replace with an empty paragraph.
 */
function deleteTable() {
  const selection = document.getSelection();
  if (!selection.anchorNode) return;

  const table = getCurrentTable(selection.anchorNode);
  if (!table) return;

  const p = createElement('p');
  p.appendChild(createElement('br'));
  table.replaceWith(p);

  focusCell(p);
}

// ============ MARKDOWN TABLE PARSING ============

const separatorRegex = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/;

/**
 * Check if a text string is a markdown table.
 * @param {string} text The text to check.
 * @return {boolean} True if the text is a markdown table.
 */
function isMarkdownTable(text) {
  const lines = text.trim().split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return false;

  const separatorIndex = lines.findIndex(line => separatorRegex.test(line));
  if (separatorIndex < 1) return false;

  // All non-separator lines should contain pipes
  const nonSeparatorLines = lines.filter((_, i) => i !== separatorIndex);
  return nonSeparatorLines.every(line => line.includes('|'));
}

/**
 * Convert a markdown table string to an HTML table.
 * @param {string} text The markdown table text.
 * @return {string} An HTML table string.
 */
function parseMarkdownTable(text) {
  const lines = text.trim().split('\n').filter(line => line.trim() !== '');

  const separatorIndex = lines.findIndex(line => separatorRegex.test(line));
  if (separatorIndex === -1) return '';

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function parseCells(line) {
    let cells = line.split('|');
    if (cells[0].trim() === '') cells.shift();
    if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();
    return cells.map(c => escapeHtml(c.trim()));
  }

  const headerLines = lines.slice(0, separatorIndex);
  const bodyLines = lines.slice(separatorIndex + 1);
  let html = '<table>';

  if (headerLines.length > 0) {
    html += '<thead>';
    headerLines.forEach(line => {
      const cells = parseCells(line);
      html += '<tr>' + cells.map(c => `<th>${c || '<br>'}</th>`).join('') + '</tr>';
    });
    html += '</thead>';
  }

  if (bodyLines.length > 0) {
    html += '<tbody>';
    bodyLines.forEach(line => {
      const cells = parseCells(line);
      html += '<tr>' + cells.map(c => `<td>${c || '<br>'}</td>`).join('') + '</tr>';
    });
    html += '</tbody>';
  }

  html += '</table>';
  return html;
}

// ============ COLUMN RESIZING ============

let resizeState = null;

/**
 * Add resize handles to all cells in the first row of a table.
 * @param {object} table The table element.
 */
function addResizeHandles(table) {
  // Remove existing handles
  table.querySelectorAll('.wysi-col-resize').forEach(el => el.remove());

  const firstRow = table.querySelector('tr');
  if (!firstRow) return;

  Array.from(firstRow.children).forEach(cell => {
    const handle = createElement('span', { class: 'wysi-col-resize' });
    handle.contentEditable = 'false';
    cell.appendChild(handle);
  });
}

/**
 * Add resize handles to all tables in an editor.
 * @param {object} editor The editor element.
 */
function addResizeHandlesToAll(editor) {
  editor.querySelectorAll('table').forEach(addResizeHandles);
}

/**
 * Apply percentage widths to all cells in the first row based on current sizes.
 * @param {object} table The table element.
 */
function initColumnWidths(table) {
  const firstRow = table.querySelector('tr');
  if (!firstRow) return;

  const cells = Array.from(firstRow.children);
  // Only initialize if no widths are set yet
  if (cells.some(c => c.style.width)) return;

  const tableWidth = table.offsetWidth;
  if (!tableWidth) return;

  cells.forEach(cell => {
    const pct = (cell.offsetWidth / tableWidth * 100).toFixed(2);
    cell.style.width = pct + '%';
  });
}

/**
 * Set widths on all cells in a column.
 * @param {object} table The table element.
 * @param {number} colIndex The column index.
 * @param {string} width The CSS width value.
 */
function setColumnWidth(table, colIndex, width) {
  getAllRows(table).forEach(row => {
    const cell = row.children[colIndex];
    if (cell) cell.style.width = width;
  });
}

// Mouse down on resize handle
addListener(document, 'mousedown', '.wysi-col-resize', event => {
  event.preventDefault();
  event.stopImmediatePropagation();

  const handle = event.target;
  const cell = handle.parentNode;
  const table = getCurrentTable(cell);
  if (!table) return;

  const colIndex = getCellIndex(cell);
  const nextCell = cell.nextElementSibling;
  if (!nextCell) return; // Don't resize last column directly

  // Initialize widths if needed
  initColumnWidths(table);

  const tableWidth = table.offsetWidth;
  const startX = event.clientX;
  const startWidthPct = parseFloat(cell.style.width);
  const nextWidthPct = parseFloat(nextCell.style.width);

  resizeState = {
    table,
    colIndex,
    tableWidth,
    startX,
    startWidthPct,
    nextWidthPct
  };

  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  handle.classList.add('wysi-col-resize-active');
});

addListener(document, 'mousemove', event => {
  if (!resizeState) return;
  event.preventDefault();

  const { table, colIndex, tableWidth, startX, startWidthPct, nextWidthPct } = resizeState;
  const dx = event.clientX - startX;
  const dxPct = dx / tableWidth * 100;

  const minPct = 3; // minimum column width %
  let newPct = startWidthPct + dxPct;
  let newNextPct = nextWidthPct - dxPct;

  if (newPct < minPct) {
    newPct = minPct;
    newNextPct = startWidthPct + nextWidthPct - minPct;
  }
  if (newNextPct < minPct) {
    newNextPct = minPct;
    newPct = startWidthPct + nextWidthPct - minPct;
  }

  setColumnWidth(table, colIndex, newPct.toFixed(2) + '%');
  setColumnWidth(table, colIndex + 1, newNextPct.toFixed(2) + '%');
});

addListener(document, 'mouseup', event => {
  if (!resizeState) return;

  const { table } = resizeState;

  // Sync editor
  const { editor } = findInstance(table);
  syncEditor(editor);

  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  document.querySelectorAll('.wysi-col-resize-active').forEach(el => el.classList.remove('wysi-col-resize-active'));
  resizeState = null;
});

// ============ TABLE MENU UI ============

/**
 * Render the table toolbar tool (button + dropdown menu).
 * @return {object} A DOM element containing the table tool.
 */
function renderTableTool() {
  const label = getTranslation('table', toolset.table.label);

  const wrapper = createElement('div', {
    class: 'wysi-table-menu'
  });

  const button = createElement('button', {
    type: 'button',
    title: label,
    'aria-label': label,
    'aria-pressed': false,
    'aria-haspopup': true,
    'aria-expanded': false,
    'data-action': 'table',
    _innerHTML: '<svg><use href="#wysi-table"></use></svg>'
  });

  const menu = createElement('div', {
    tabindex: -1
  });

  wrapper.appendChild(button);
  wrapper.appendChild(menu);

  return wrapper;
}

/**
 * Populate the table menu in insert mode (rows/cols form).
 * @param {object} container The menu container div.
 */
function populateInsertMode(container) {
  const rowsLabel = createElement('label');
  rowsLabel.appendChild(createElement('span', {
    _textContent: getTranslation('table', 'Rows')
  }));
  rowsLabel.appendChild(createElement('input', {
    type: 'number',
    min: 1,
    max: 20,
    value: 3,
    'data-field': 'rows'
  }));

  const colsLabel = createElement('label');
  colsLabel.appendChild(createElement('span', {
    _textContent: getTranslation('table', 'Columns')
  }));
  colsLabel.appendChild(createElement('input', {
    type: 'number',
    min: 1,
    max: 20,
    value: 3,
    'data-field': 'cols'
  }));

  const actions = createElement('div', {
    class: 'wysi-table-insert-actions'
  });

  actions.appendChild(createElement('button', {
    type: 'button',
    _textContent: getTranslation('popover', 'Cancel')
  }));

  actions.appendChild(createElement('button', {
    type: 'button',
    'data-action': 'insertTable',
    _textContent: getTranslation('table', 'Insert')
  }));

  const headerLabel = createElement('label');
  headerLabel.appendChild(createElement('span', {
    _textContent: getTranslation('table', 'Header row')
  }));
  headerLabel.appendChild(createElement('input', {
    type: 'checkbox',
    checked: true,
    'data-field': 'header'
  }));

  container.appendChild(rowsLabel);
  container.appendChild(colsLabel);
  container.appendChild(headerLabel);
  container.appendChild(actions);
}

/**
 * Populate the table menu in operations mode (action buttons).
 * @param {object} container The menu container div.
 */
function populateOperationsMode(container) {
  const items = [
    { action: 'tableAddRowAbove', label: 'Add row above' },
    { action: 'tableAddRowBelow', label: 'Add row below' },
    { action: 'tableRemoveRow', label: 'Delete row' },
    { separator: true },
    { action: 'tableAddColLeft', label: 'Add column left' },
    { action: 'tableAddColRight', label: 'Add column right' },
    { action: 'tableRemoveCol', label: 'Delete column' },
    { separator: true },
    { action: 'tableDelete', label: 'Delete table' }
  ];

  items.forEach(item => {
    if (item.separator) {
      container.appendChild(createElement('hr'));
    } else {
      container.appendChild(createElement('button', {
        type: 'button',
        'data-action': item.action,
        _textContent: getTranslation('table', item.label)
      }));
    }
  });
}

/**
 * Open the table menu.
 * @param {object} button The table menu button.
 */
function openTableMenu(button) {
  const selection = document.getSelection();
  const anchorNode = selection.anchorNode;

  // Save current selection for later restore
  if (selection.rangeCount) {
    tableMenuSelection = selection.getRangeAt(0).cloneRange();
  }

  // Check if cursor is inside a table cell
  const cell = anchorNode ? getCurrentCell(anchorNode) : null;

  // Populate menu based on context
  const menuContent = button.nextElementSibling;
  menuContent.innerHTML = '';

  if (cell) {
    populateOperationsMode(menuContent);
  } else {
    populateInsertMode(menuContent);
  }

  // Open the menu
  toggleButton(button, true);

  // Focus the first interactive element
  const firstFocusable = menuContent.querySelector('input, button');
  if (firstFocusable) firstFocusable.focus();
}

/**
 * Close the table menu if open.
 */
function closeTableMenu() {
  const button = document.querySelector('.wysi-table-menu [aria-expanded="true"]');
  if (button) {
    toggleButton(button, false);
  }
}

/**
 * Execute a table menu action.
 * @param {string} action The action name.
 * @param {object} editor The editor element.
 */
function execTableAction(action, editor) {
  // Focus editor first
  if (editor) editor.focus();

  // Restore saved selection
  if (tableMenuSelection) {
    const selection = document.getSelection();
    selection.removeAllRanges();
    selection.addRange(tableMenuSelection);
    tableMenuSelection = null;
  }

  switch (action) {
    case 'insertTable': {
      const menu = document.querySelector('.wysi-table-menu > div');
      const rows = parseInt(menu.querySelector('[data-field="rows"]').value) || 3;
      const cols = parseInt(menu.querySelector('[data-field="cols"]').value) || 3;
      const header = menu.querySelector('[data-field="header"]').checked;
      insertTable(rows, cols, header);
      break;
    }
    case 'tableAddRowAbove':
      addRow('above');
      break;
    case 'tableAddRowBelow':
      addRow('below');
      break;
    case 'tableRemoveRow':
      removeRow();
      break;
    case 'tableAddColLeft':
      addColumn('left');
      break;
    case 'tableAddColRight':
      addColumn('right');
      break;
    case 'tableRemoveCol':
      removeColumn();
      break;
    case 'tableDelete':
      deleteTable();
      break;
  }

  // Sync editor content to textarea
  syncEditor(editor);
}

// ============ CONTEXT MENU ============

let contextMenu = null;
let contextMenuEditor = null;

function closeContextMenu() {
  if (contextMenu && contextMenu.parentNode) {
    contextMenu.remove();
  }
  contextMenu = null;
  contextMenuEditor = null;
}

// Right-click inside a table cell
addListener(document, 'contextmenu', '.wysi-editor td, .wysi-editor th', event => {
  const cell = getCurrentCell(event.target);
  if (!cell) return;

  event.preventDefault();
  closeContextMenu();
  closeTableMenu();

  // Save selection
  const selection = document.getSelection();
  if (selection.rangeCount) {
    tableMenuSelection = selection.getRangeAt(0).cloneRange();
  }

  const { editor } = findInstance(cell);
  contextMenuEditor = editor;

  // Create menu
  contextMenu = createElement('div', { class: 'wysi-table-ctx' });
  populateOperationsMode(contextMenu);

  // Position at click using fixed positioning
  contextMenu.style.left = event.clientX + 'px';
  contextMenu.style.top = event.clientY + 'px';

  document.body.appendChild(contextMenu);
});

// Execute action from context menu
addListener(document, 'click', '.wysi-table-ctx button[data-action]', event => {
  const action = event.target.dataset.action;
  execTableAction(action, contextMenuEditor);
  closeContextMenu();
});

// Close context menu on outside click or escape
addListener(document, 'mousedown', event => {
  if (contextMenu && !contextMenu.contains(event.target)) {
    closeContextMenu();
  }
});

addListener(document, 'keydown', event => {
  if (event.key === 'Escape' && contextMenu) {
    closeContextMenu();
  }
});

// ============ EVENT LISTENERS ============

// Open/close table menu on button click
addListener(document, 'click', '.wysi-table-menu > button', event => {
  const button = event.target;
  const wasOpen = button.getAttribute('aria-expanded') === 'true';

  closeTableMenu();

  if (!wasOpen) {
    openTableMenu(button);
  }
});

// Keyboard open for table menu button
addListener(document, 'keydown', '.wysi-table-menu > button', event => {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
    case 'Enter':
    case ' ':
      closeTableMenu();
      openTableMenu(event.target);
      event.preventDefault();
      break;
  }
});

// Execute action from menu
addListener(document, 'click', '.wysi-table-menu > div button[data-action]', event => {
  const { editor } = findInstance(event.target);
  execTableAction(event.target.dataset.action, editor);
  closeTableMenu();
});

// Cancel button in menu
addListener(document, 'click', '.wysi-table-menu > div button:not([data-action])', event => {
  closeTableMenu();
});

// Stop propagation on non-button clicks inside menu (keep menu open)
addListener(document, 'click', '.wysi-table-menu *:not(button)', event => {
  event.stopImmediatePropagation();
});

// Keyboard navigation inside the menu
addListener(document, 'keydown', '.wysi-table-menu > div *', event => {
  switch (event.key) {
    case 'Escape':
      closeTableMenu();
      event.stopImmediatePropagation();
      break;
    case 'Enter':
      if (event.target.tagName === 'INPUT') {
        const insertButton = event.target.closest('.wysi-table-menu > div').querySelector('[data-action="insertTable"]');
        if (insertButton) insertButton.click();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      break;
    case 'Tab': {
      const container = event.target.closest('.wysi-table-menu > div');
      const focusable = container.querySelectorAll('input, button');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && event.target === first) {
        last.focus();
        event.preventDefault();
      } else if (!event.shiftKey && event.target === last) {
        first.focus();
        event.preventDefault();
      }
      event.stopImmediatePropagation();
      break;
    }
  }
});

// Close menu on outside click
addListener(document, 'mousedown', '.wysi-table-menu > button', () => {
  isTableMenuOpening = true;
});

addListener(document, 'mouseup', () => {
  setTimeout(() => { isTableMenuOpening = false; });
});

addListener(document, 'click', event => {
  if (!isTableMenuOpening) {
    closeTableMenu();
  }
});

// Tab key navigation inside tables
addListener(document, 'keydown', event => {
  if (event.key !== 'Tab') return;

  // Don't interfere with table menu
  if (event.target.closest && event.target.closest('.wysi-table-menu')) return;

  const selection = document.getSelection();
  if (!selection.anchorNode) return;

  const { editor } = findInstance(selection.anchorNode);
  if (!editor) return;

  const cell = getCurrentCell(selection.anchorNode);
  if (!cell) return;

  event.preventDefault();

  const row = cell.parentNode;

  if (event.shiftKey) {
    // Move to previous cell
    const prevCell = cell.previousElementSibling;
    if (prevCell) {
      focusCell(prevCell);
    } else {
      const prevRow = row.previousElementSibling;
      if (prevRow && prevRow.lastElementChild) {
        focusCell(prevRow.lastElementChild);
      }
    }
  } else {
    // Move to next cell
    const nextCell = cell.nextElementSibling;
    if (nextCell) {
      focusCell(nextCell);
    } else {
      const nextRow = row.nextElementSibling;
      if (nextRow && nextRow.firstElementChild) {
        focusCell(nextRow.firstElementChild);
      } else {
        // Last cell — add a new row and move to it
        addRow('below');
        const newRow = row.nextElementSibling;
        if (newRow && newRow.firstElementChild) {
          focusCell(newRow.firstElementChild);
        }
        syncEditor(editor);
      }
    }
  }
});

export { renderTableTool, isMarkdownTable, parseMarkdownTable, addResizeHandlesToAll };
