import document from 'document';
import toolset from './toolset.js';
import { renderListBox, selectListBoxItem } from './listbox.js';
import { selectedClass } from './common.js';
import {
  appendChild,
  getAttribute,
  querySelector,
  querySelectorAll,
  setAttribute,
  stopImmediatePropagation,
  toLowerCase
} from './shortcuts.js';
import {
  addListener,
  createElement,
  execAction,
  findRegion,
  restoreSelection,
  setCurrentSelection,
  toggleButton
} from './utils.js';

/**
 * Render a popover form to set a tool's parameters.
 * @param {string} toolName The tool name.
 * @param {object} button The tool's toolbar button.
 * @param {object} translations The labels translation object.
 * @return {object} A DOM element containing the button and the popover.
 */
function renderPopover(toolName, button, translations) {
  const tool = toolset[toolName];
  const labels = tool.attributeLabels;
  const fields = tool.attributes.map((attribute, i) => {
    return {
      name: attribute,
      label: translations[attribute] || labels[i],
    }
  });

  // Popover wrapper
  const wrapper = createElement('div', {
    class: 'wysi-popover'
  });

  // Popover
  const popover = createElement('div', {
    tabindex: -1,
  });

  // Toolbar Button
  setAttribute(button, 'aria-haspopup', true);
  setAttribute(button, 'aria-expanded', false);

  appendChild(wrapper, button);
  appendChild(wrapper, popover);

  fields.forEach(field => {
    const label = createElement('label');
    const span = createElement('span', { _textContent: field.label });
    const input = createElement('input', { type: 'text' });

    appendChild(label, span);
    appendChild(label, input);
    appendChild(popover, label);
  });

  const cancel = createElement('button', {
    type: 'button',
    _textContent: translations.cancel || 'Cancel'
  });

  const save = createElement('button', {
    type: 'button',
    'data-action': toolName,
    _textContent: translations.save || 'Save'
  });

  // The link popover needs an extra "Remove link" button
  if (toolName === 'link') {
    const extraTool = 'unlink';
    const label = translations[extraTool] || toolset[extraTool].label;

    appendChild(popover, createElement('button', {
      type: 'button',
      title: label,
      'aria-label': label,
      'data-action': extraTool,
      _innerHTML: `<svg><use href="#wysi-delete"></use></svg>`
    }));
  }

  appendChild(popover, cancel);
  appendChild(popover, save);

  return wrapper;
}

/**
 * Open a popover.
 * @param {object} button The popover's button.
 */
function openPopover(button) {
  const inputs = querySelectorAll('input', button.nextElementSibling);
  const region = button.parentNode.parentNode.nextElementSibling;
  const selection = document.getSelection();
  const anchorNode = selection.anchorNode;
  const { nodes } = findRegion(anchorNode);
  const values = [];

  if (region) {
    // Try to find an existing target of the popover's action from the DOM selection
    const action = getAttribute(button, 'data-action');
    const tool = toolset[action];
    let target = nodes.filter(node => tool.tags.includes(toLowerCase(node.tagName)))[0];
    let selectContents = true;

    // If that fails, look for an element with the selection CSS class
    if (!target) {
      target = querySelector(`.${selectedClass}`, region);
      selectContents = false;
    }

    // If an existing target is found, we will be in modification mode
    if (target) {
      const range = document.createRange();
      
      // Add the target to a selection range
      // Depending on the type of the target, select the whole node or just its contents
      if (selectContents) {
        range.selectNodeContents(target);
      } else {
        range.selectNode(target);
      }

      // Save the current selection for later use
      setCurrentSelection(range);

      // Retrieve the current attribute values of the target for modification
      tool.attributes.forEach(attribute => {
        values.push(getAttribute(target, attribute));
      })

    // If no existing target is found, we are adding new content
    } else if (selection && region.contains(anchorNode) && selection.rangeCount) {
      // Save the current selection to keep track of where to insert the content
      setCurrentSelection(selection.getRangeAt(0));
    }
  }

  // Populate the form fields with the existing values if any
  inputs.forEach((input, i) => {
    input.value = values[i] || '';
  });

  // Close any open popover
  closePopover();

  // Open this popover
  toggleButton(button, true);

  // Focus the first input field
  inputs[0].focus();
}

/**
 * Execute a popover's action.
 * @param {object} button The popover's action button.
 */
function execPopoverAction(button) {
  const action = getAttribute(button, 'data-action');
  const inputs = querySelectorAll('input', button.parentNode);
  const region = button.parentNode.parentNode.parentNode.nextElementSibling;
  const options = [];

  inputs.forEach(input => {
    options.push(input.value);
  });

  // Workaround for links being removed when updating images
  if (action === 'image') {
    const selected = querySelector(`.${selectedClass}`, region);
    const parent = selected ? selected.parentNode : {};

    if (selected && parent.tagName === 'A') {
      options.push(parent.outerHTML);
    }
  }

  execAction(action, region, options);
}

/**
 * Close the open popover if any.
 * @param {boolean} restore If true, restore the previous selection.
 */
function closePopover(restore) {
  const popover = querySelector('.wysi-popover [aria-expanded="true"]');

  if (popover) {
    toggleButton(popover, false);
  }

  if (restore) {
    restoreSelection();
  }
}

// Open a popover
addListener(document, 'click', '.wysi-popover > button', event => {
  openPopover(event.target);
  stopImmediatePropagation(event);
});

// Execute the popover action
addListener(document, 'click', '.wysi-popover > div > button[data-action]', event => {
  execPopoverAction(event.target);
  closePopover();
});

// Cancel the popover
addListener(document, 'click', '.wysi-popover > div > button:not([data-action])', event => {
  closePopover(true);
});

// Prevent clicks on the popover content to propagate (keep popover open)
addListener(document, 'click', '.wysi-popover *:not(button)', event => {
  stopImmediatePropagation(event);
});

// Trap focus inside a popover until it's closed
addListener(document, 'keydown', '.wysi-popover *', event => {
  const target = event.target;
  const parent = target.parentNode;
  const form = parent.tagName === 'DIV' ? parent : parent.parentNode;

  switch (event.key) {
    case 'Tab':
      const firstField = querySelector('input', form);

      if (event.shiftKey) {
        if (target === firstField) {
          form.lastElementChild.focus();
          event.preventDefault();
        }
      } else {
        if (!target.nextElementSibling && !target.parentNode.nextElementSibling) {
          firstField.focus();
          event.preventDefault();
        }
      }
      break;
    case 'Enter':
      if (target.tagName === 'INPUT') {
        const actionButton = querySelector('[data-action]:last-of-type', form);

        actionButton.click();
        event.preventDefault();
      }
      break;
    case 'Escape':
      closePopover(true);
      break;
  }

});

let isSelectionInProgress = false;

// Close open popups and dropdowns on click outside
addListener(document, 'click', event => {
  if (!isSelectionInProgress) {
    closePopover(true);
  }
});

// Text selection within a popover is in progress
// This helps avoid closing a popover when the end of a text selection is outside it
addListener(document, 'mousedown', '.wysi-popover, .wysi-popover *', event => {
  isSelectionInProgress = true;
});

// The text selection ended
addListener(document, 'mouseup', event => {
  setTimeout(() => { isSelectionInProgress = false; });
});

export { renderPopover };