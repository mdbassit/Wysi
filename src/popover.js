import document from 'document';
import toolset from './toolset.js';
import { renderListBox, selectListBoxItem } from './listbox.js';
import { selectedClass } from './common.js';
import { execAction } from './commands.js';
import {
  addListener,
  createElement,
  findInstance,
  getCurrentSelection,
  getFragmentContent,
  getTranslation,
  restoreSelection,
  setCurrentSelection,
  toggleButton
} from './utils.js';

/**
 * Render a popover form to set a tool's parameters.
 * @param {string} toolName The tool name.
 * @param {object} button The tool's toolbar button.
 * @return {object} A DOM element containing the button and the popover.
 */
function renderPopover(toolName, button) {
  const tool = toolset[toolName];
  const labels = tool.attributeLabels;
  const fields = tool.attributes.map((attribute, i) => {
    return {
      name: attribute,
      label: getTranslation(toolName, labels[i]),
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
  button.setAttribute('aria-haspopup', true);
  button.setAttribute('aria-expanded', false);

  wrapper.appendChild(button);
  wrapper.appendChild(popover);

  fields.forEach(field => {
    // Link target requires special handling later
    if (toolName !== 'link' || field.name !== 'target') {
      const label = createElement('label');
      const span = createElement('span', { _textContent: field.label });
      const input = createElement('input', { type: 'text', 'data-attribute': field.name });

      label.appendChild(span);
      label.appendChild(input);
      popover.appendChild(label);
    }
  });

  // Link popover
  if (toolName === 'link') {
    // Add the target attribute
    const targetField = fields.find(f => f.name === 'target');

    if (targetField) {
      targetField.toolName = toolName;
      targetField.options = tool.formOptions ? tool.formOptions.target || [] : [];
      popover.appendChild(createElement('label', { _textContent: targetField.label }));
      popover.appendChild(renderSegmentedField(targetField));
    }

    // The link popover needs an extra "Remove link" button
    const extraTool = 'unlink';
    const label = getTranslation(toolName, toolset[extraTool].label);

    popover.appendChild(createElement('button', {
      type: 'button',
      title: label,
      'aria-label': label,
      'data-action': extraTool,
      _innerHTML: `<svg><use href="#wysi-delete"></use></svg>`
    }));
  }

  // Image popover
  if (toolName === 'image') {
    const imageSettings = tool.extraSettings.map((setting, i) => {
      return {
        name: setting,
        label: getTranslation(toolName, tool.extraSettingLabels[i])
      }
    });

    imageSettings.forEach(setting => {
      setting.toolName = toolName;
      setting.options = tool.formOptions ? tool.formOptions[setting.name] || [] : [];
      popover.appendChild(createElement('label', { _textContent: setting.label }));
      popover.appendChild(renderSegmentedField(setting));
    });
  }

  const cancel = createElement('button', {
    type: 'button',
    _textContent: getTranslation('popover', 'Cancel')
  });

  const save = createElement('button', {
    type: 'button',
    'data-action': toolName,
    _textContent: getTranslation('popover', 'Save')
  });

  popover.appendChild(cancel);
  popover.appendChild(save);

  return wrapper;
}

/**
 * Render a segmented form field.
 * @param {object} field The field attributes.
 * @return {object} A DOM element representing the segmented field.
 */
function renderSegmentedField(field) {
  const segmented = createElement('fieldset', {
    class: 'wysi-segmented'
  });

  // Add the fieldset legend for accessibility
  segmented.appendChild(createElement('legend', { _textContent: field.label }));

  // Add field options
  field.options.forEach((option, i) => {
    segmented.appendChild(createElement('input', {
      id: `wysi-${field.toolName}-${field.name}-${i}`,
      name: `wysi-${field.toolName}-${field.name}`,
      type: 'radio',
      'data-attribute': field.name,
      value: option.value
    }));
    
    segmented.appendChild(createElement('label', {
      for: `wysi-${field.toolName}-${field.name}-${i}`,
      _textContent: getTranslation(field.toolName, option.label)
    }));
  });

  return segmented;
}

/**
 * Open a popover.
 * @param {object} button The popover's button.
 */
function openPopover(button) {
  const inputs = button.nextElementSibling.querySelectorAll('input[type="text"]');
  const radioButtons = button.nextElementSibling.querySelectorAll('input[type="radio"]');
  const selection = document.getSelection();
  const anchorNode = selection.anchorNode;
  const { editor, nodes } = findInstance(anchorNode);
  const values = {};

  if (editor) {
    // Try to find an existing target of the popover's action from the DOM selection
    const action = button.dataset.action;
    const tool = toolset[action];
    let target = editor.querySelector(`.${selectedClass}`);
    let selectContents = false;

    // If that fails, look for an element with the selection CSS class
    if (!target) {
      target = nodes.filter(node => tool.tags.includes(node.tagName.toLowerCase()))[0];
      selectContents = true;
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
        values[attribute] = target.getAttribute(attribute);
      });

      // Process extra popover settings
      if (tool.extraSettings) {
        tool.extraSettings.forEach(setting => {
          const settingOptions = tool.formOptions[setting];

          for (const option of settingOptions) {
            if (!option.criterion) {
              continue;
            }

            const key = Object.keys(option.criterion)[0];
            const value = option.criterion[key];

            if (target.style[key] && target.style[key] === value) {
              values[setting] = option.value;
              break;
            }
          }
        });
      }

    // If no existing target is found, we are adding new content
    } else if (selection && editor.contains(anchorNode) && selection.rangeCount) {
      // Save the current selection to keep track of where to insert the content
      setCurrentSelection(selection.getRangeAt(0));
    }
  }

  // Populate the input fields with the existing values if any
  inputs.forEach(input => {
    input.value = values[input.dataset.attribute] || '';
  });

  // Check the relevent radio fields if any
  radioButtons.forEach(radio => {
    const value = values[radio.dataset.attribute] || '';

    if (radio.value === value) {
      radio.checked = true;
    }
  });

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
  const action = button.dataset.action;
  const selection = getCurrentSelection();
  const inputs = button.parentNode.querySelectorAll('input[type="text"]');
  const radioButtons = button.parentNode.querySelectorAll('input[type="radio"]');
  const { editor } = findInstance(button);
  const options = [];

  inputs.forEach(input => {
    options.push(input.value);
  });

  radioButtons.forEach(radio => {
    if (radio.checked) {
      options.push(radio.value);
    }
  });

  // Workaround for links being removed when updating images
  if (action === 'image') {
    const selected = editor.querySelector(`.${selectedClass}`);
    const parent = selected ? selected.parentNode : {};

    if (selected && parent.tagName === 'A') {
      options.push(parent.outerHTML);
    }

  // Save the content of the current selection to use as a link text
  } else if (action === 'link' && selection) {
    options.push(getFragmentContent(selection.cloneContents()));
  }

  execAction(action, editor, options);
}

/**
 * Close the open popover if any.
 * @param {boolean} ignoreSelection If true, do not restore the previous selection.
 */
function closePopover(ignoreSelection) {
  const popover = document.querySelector('.wysi-popover [aria-expanded="true"]');

  if (popover) {
    toggleButton(popover, false);
  }

  if (!ignoreSelection) {
    restoreSelection();
  }
}

// Open a popover
addListener(document, 'click', '.wysi-popover > button', event => {
  closePopover();
  openPopover(event.target);
  event.stopImmediatePropagation();
});

// Execute the popover action
addListener(document, 'click', '.wysi-popover > div > button[data-action]', event => {
  execPopoverAction(event.target);
  closePopover(true);
});

// Cancel the popover
addListener(document, 'click', '.wysi-popover > div > button:not([data-action])', event => {
  closePopover();
});

// Prevent clicks on the popover content to propagate (keep popover open)
addListener(document, 'click', '.wysi-popover *:not(button)', event => {
  event.stopImmediatePropagation();
});

// Trap focus inside a popover until it's closed
addListener(document, 'keydown', '.wysi-popover *', event => {
  const target = event.target;
  const parent = target.parentNode;
  const form = parent.tagName === 'DIV' ? parent : parent.parentNode;

  switch (event.key) {
    case 'Tab':
      const firstField = form.querySelector('input');

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
        const actionButton = form.querySelector('[data-action]:last-of-type');

        actionButton.click();
        event.preventDefault();
      }
      break;
    case 'Escape':
      closePopover();
      break;
  }

});

let isSelectionInProgress = false;

// Close open popups and dropdowns on click outside
addListener(document, 'click', event => {
  if (!isSelectionInProgress) {
    closePopover();
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