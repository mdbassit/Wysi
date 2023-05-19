import window from 'window';
import document from 'document';
import toolset from './toolset.js';
import { instances } from './common.js';
import { addListener, createElement, execAction, toggleButton } from './utils.js';
import {
  appendChild,
  getAttribute,
  querySelector,
  querySelectorAll,
  setAttribute,
  stopImmediatePropagation
} from './shortcuts.js';


/**
 * Render a list box.
 * @param {object} details The list box properties and data.
 * @return {object} A DOM element containing the list box.
 */
function renderListBox(details) {
  const label = details.label;
  const items = details.items;

  // List box wrapper
  const listBox = createElement('div', {
    class: 'wysi-listbox'
  });

  // List box button
  const button = createElement('button', {
    type: 'button',
    title: label,
    'aria-haspopup': 'listbox',
    'aria-expanded': false,
    _textContent: items[0].label
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
      'aria-selected': false,
      'data-action': item.action,
      'data-option': item.name,
      _textContent: item.label
    });

    appendChild(menu, option);
  });

  // Tie it all together
  appendChild(listBox, button);
  appendChild(listBox, menu);

  return listBox;
}

/**
 * Open a list box.
 * @param {object} button The list box's button.
 */
function openListBox(button) {
  const isOpen = getAttribute(button, 'aria-expanded') === 'true';
  const listBox = button.nextElementSibling;
  let selectedItem = querySelector('[aria-selected="true"]', listBox);

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
  const selectedItem = querySelector('[aria-selected="true"]', listBox);

  if (selectedItem) {
    setAttribute(selectedItem, 'aria-selected', 'false');
  }

  setAttribute(item, 'aria-selected', 'true');
  button.innerHTML = item.innerHTML;
}

/**
 * Close the currently open list box if any.
 */
function closeListBox() {
  const activeListBox = querySelector('.wysi-listbox [aria-expanded="true"]');

  if (activeListBox) {
    toggleButton(activeListBox, false);
  }
}

// list box button click
addListener(document, 'click', '.wysi-listbox > button', event => {
  closeListBox();
  openListBox(event.target);
  stopImmediatePropagation(event);
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
  const action = getAttribute(item, 'data-action');
  const option = getAttribute(item, 'data-option');
  const region = item.parentNode.parentNode.parentNode.nextElementSibling;

  execAction(action, region, [option]);
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