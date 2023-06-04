import document from 'document';
import toolset from './toolset.js';
import { instances } from './common.js';
import {
  addListener,
  createElement,
  execAction,
  findInstance,
  toggleButton
} from './utils.js';


/**
 * Render a list box.
 * @param {object} details The list box properties and data.
 * @return {object} A DOM element containing the list box.
 */
function renderListBox(details) {
  const label = details.label;
  const items = details.items;
  const firstItem = items[0];
  const classes = ['wysi-listbox'].concat(details.classes || []);

  // List box wrapper
  const listBox = createElement('div', { class: classes.join(' ') });

  // List box button
  const button = createElement('button', {
    type: 'button',
    title: label,
    'aria-label': `${label} ${firstItem.label}`,
    'aria-haspopup': 'listbox',
    'aria-expanded': false,
    _innerHTML: renderListBoxItem(firstItem)
  });

  // List box menu
  const menu = createElement('div', {
    role: 'listbox',
    tabindex: -1,
    'aria-label': label
  });

  // List box items
  items.forEach(item => {
    const option = createElement('button', {
      type: 'button',
      role: 'option',
      tabindex: -1,
      'aria-label': item.label,
      'aria-selected': false,
      'data-action': item.action,
      'data-option': item.name || '',
      _innerHTML: renderListBoxItem(item)
    });

    menu.appendChild(option);
  });

  // Tie it all together
  listBox.appendChild(button);
  listBox.appendChild(menu);

  return listBox;
}

/**
 * Render a list box item.
 * @param {object} item The list box item.
 * @return {string} The list box item's content.
 */
function renderListBoxItem(item) {
  return item.icon ? `<svg><use href="#wysi-${item.icon}"></use></svg>` : item.label;
}

/**
 * Open a list box.
 * @param {object} button The list box's button.
 */
function openListBox(button) {
  const isOpen = button.getAttribute('aria-expanded') === 'true';
  const listBox = button.nextElementSibling;
  let selectedItem = listBox.querySelector('[aria-selected="true"]');

  if (!selectedItem) {
    selectedItem = listBox.firstElementChild;
  }

  toggleButton(button, !isOpen);
  selectedItem.focus();
}

/**
 * Select a list box item.
 * @param {object} item The list box item.
 */
function selectListBoxItem(item) {
  const listBox = item.parentNode;
  const button = listBox.previousElementSibling;
  const selectedItem = listBox.querySelector('[aria-selected="true"]');

  if (selectedItem) {
    selectedItem.setAttribute('aria-selected', 'false');
  }

  item.setAttribute('aria-selected', 'true');
  button.innerHTML = item.innerHTML;
}

/**
 * Close the currently open list box if any.
 */
function closeListBox() {
  const activeListBox = document.querySelector('.wysi-listbox [aria-expanded="true"]');

  if (activeListBox) {
    toggleButton(activeListBox, false);
  }
}

// list box button click
addListener(document, 'click', '.wysi-listbox > button', event => {
  closeListBox();
  openListBox(event.target);
  event.stopImmediatePropagation();
});

// On key press on the list box button
addListener(document, 'keydown', '.wysi-listbox > button', event => {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
    case 'Enter':
    case ' ':
      openListBox(event.target);
      event.preventDefault();
      break;
  }
});

// When the mouse moves on a list box item, focus it
addListener(document.documentElement, 'mousemove', '.wysi-listbox > div > button', event => {
  event.target.focus();
});

// On click on an list box item
addListener(document, 'click', '.wysi-listbox > div > button', event => {
  const item = event.target;
  const action = item.getAttribute('data-action');
  const option = item.getAttribute('data-option');
  const { editor } = findInstance(item);
  const selection = document.getSelection();

  if (selection && editor.contains(selection.anchorNode)) {
    execAction(action, editor, [option]);
  }

  selectListBoxItem(item);
});

// On key press on an item
addListener(document, 'keydown', '.wysi-listbox > div > button', event => {
  const item = event.target;
  const listBox = item.parentNode;
  const button = listBox.previousElementSibling;
  let preventDefault = true;

  switch (event.key) {
    case 'ArrowUp':
      const prev = item.previousElementSibling;

      if (prev) {
        prev.focus();
      }

      break;
    case 'ArrowDown':
      const next = item.nextElementSibling;

      if (next) {
        next.focus();
      }

      break;
    case 'Home':
      listBox.firstElementChild.focus();
      break;
    case 'End':
      listBox.lastElementChild.focus();
      break;
    case 'Tab':
      item.click();
      break;
    case 'Escape':
      toggleButton(button, false);
      break;
    default:
      preventDefault = false;
  }

  if (preventDefault) {
    event.preventDefault();
  }
});

// Close open popups and dropdowns on click outside
addListener(document, 'click', event => {
  closeListBox();
});

export { renderListBox, selectListBoxItem };