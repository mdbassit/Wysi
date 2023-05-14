import window from 'window';
import document from 'document';
import toolset from './toolset.js';
import { allowedTags, enableTags } from './filter.js';
import {
  appendChild,
  execCommand,
  getAttribute,
  querySelector,
  querySelectorAll,
  setAttribute,
  stopImmediatePropagation,
  addListener,
  buildFragment,
  createElement,
  DOMReady,
  findRegion
} from './utils.js';

const selectedClass = 'wysi-selected';
let currentSelection;

/**
 * Render the toolbar.
 * @param {array} tools The list of tools in the toolbar.
 * @param {object} translations The labels translation object.
 * @return {string} The toolbars HTML string.
 */
function renderToolbar(tools, translations) {
  const toolbar = createElement('div', { class: 'wysi-toolbar' });

  // Generate toolbar buttons
  tools.forEach(toolName => {
    switch (toolName) {
      // Toolbar separator
      case '|':
        appendChild(toolbar, createElement('div', { class: 'wysi-separator' }));
        break;

      // The format tool renders as a list box
      case 'format':
        appendChild(toolbar, renderFormatTool(translations));
        break;

      // All the other tools render as buttons
      default:
        const tool = toolset[toolName];
        const label = translations[toolName] || tool.label;
        const button = createElement('button', {
          type: 'button',
          title: label,
          'aria-label': label,
          'aria-pressed': false,
          'data-action': toolName,
          _innerHTML: `<svg><use href="#wysi-${toolName}"></use></svg>`
        });

        // Tools that require parameters (e.g: image, link) need a popover
        if (tool.hasForm) {
          const popover = renderPopover(toolName, button, translations);
          appendChild(toolbar, popover);

        // The other tools only display a button
        } else {
          appendChild(toolbar, button);
        }
    }

    // Add the current tool's tags to the list of allowed tags
    enableTags(toolName);
  });

  return toolbar;
}

/**
 * Render format tool.
 * @param {object} translations The labels translation object.
 * @return {object} A DOM element containing the format tool.
 */
function renderFormatTool(translations) {
  const formatLabel = translations['format'] || toolset.format.label;
  const paragraphLabel = translations['paragraph'] || toolset.format.paragraph;
  const headingLabel = translations['heading'] || toolset.format.heading;
  const formats = toolset.format.tags.map(tag => { 
    const name = tag;
    const label = tag === 'p' ? paragraphLabel : `${headingLabel} ${tag.substring(1)}`;

    return { name, label };
  });

  // List box wrapper
  const listBoxWrapper = createElement('div', {
    class: 'wysi-listbox'
  });

  // List box button
  const listBoxButton = createElement('button', {
    type: 'button',
    title: formatLabel,
    'aria-haspopup': 'listbox',
    'aria-expanded': false,
    _textContent: paragraphLabel
  });

  // List box
  const listBox = createElement('div', {
    role: 'listbox',
    tabindex: -1,
    'aria-label': formatLabel
  });

  // List box items
  formats.forEach(format => {
    const item = createElement('button', {
      type: 'button',
      role: 'option',
      tabindex: -1,
      'aria-selected': false,
      'data-action': 'format',
      'data-option': format.name,
      _textContent: format.label
    });

    appendChild(listBox, item);
  });

  // Tie it all together
  appendChild(listBoxWrapper, listBoxButton);
  appendChild(listBoxWrapper, listBox);

  return listBoxWrapper;
}

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
 * Update toolbar buttons state.
 */
function updateToolbarState() {
  const { region, tags } = findRegion(document.getSelection().anchorNode);

  // Abort if the selection is not within an editable region
  if (!region) {
    return;
  }

  // Get the current editable regions toolbar
  const toolbar = region.previousElementSibling;

  // Reset the state of all buttons
  querySelectorAll('[aria-pressed="true"]', toolbar).forEach(button => button.setAttribute('aria-pressed', 'false'));

  // Update the buttons states
  tags.forEach(tag => {
    let listBoxItem;

    switch (tag) {
      case 'p':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
        listBoxItem = querySelector(`[data-action="format"][data-option="${tag}"]`, toolbar);
        break;
      default:
        const allowedTag = allowedTags[tag];
        const action = allowedTag ? allowedTag.toolName : undefined;

        if (action) {
          querySelector(`[data-action="${action}"]`, toolbar).setAttribute('aria-pressed', 'true');
        }
    }

    if (listBoxItem) {
      selectListBoxItem(listBoxItem);
    }
  });
}

/**
 * Execute an action.
 * @param {string} action The action to execute.
 * @param {object} region The editable region.
 * @param {array} [options] Optional action parameters.
 */
function execAction(action, region, options = []) {
  const tool = toolset[action];
  
  if (tool) {
    const command = tool.command || action;
    const realAction = tool.action || (() => execCommand(command));

    // Focus the editable region
    region.focus();

    // Restore selection if any
    restoreSelection();

    // Execute the tool's action
    realAction(...options);
  }
}

/**
 * Restore a previous selection if any.
 */
function restoreSelection() {
  if (currentSelection) {
    const selection = document.getSelection();

    selection.removeAllRanges();
    selection.addRange(currentSelection);
    currentSelection = undefined;
  }
}

/**
 * Set the expanded state of a button.
 * @param {object} button The button.
 */
function toggleButton(button, expanded) {
  setAttribute(button, 'aria-expanded', expanded);
}

/**
 * Close all popups and dropdowns.
 */
function closeAllLayers() {
  const buttons = '.wysi-listbox [aria-expanded="true"], body:not(.wysi-dragging) .wysi-popover [aria-expanded="true"]';
  querySelectorAll(buttons).forEach(button => toggleButton(button, false));
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
 * Embed SVG icons in the HTML document.
 */
function embedSVGIcons() {
  // The icons will be included during the build process
  const icons = '_SVGIcons_';
  const svgElement = buildFragment(icons);

  appendChild(document.body, svgElement);
}

// Deselect selected element when clicking outside
addListener(document, 'click', '.wysi-editor, .wysi-editor *', event => {
  const selected = querySelector(`.${selectedClass}`);

  if (selected && selected !== event.target) {
    selected.classList.remove(selectedClass);
  }
});

// Select an image when it's clicked
addListener(document, 'click', '.wysi-editor img', event => {
  const image = event.target;
  const selection = document.getSelection();
  const range = document.createRange();

  image.classList.add(selectedClass);

  range.selectNode(image);
  selection.removeAllRanges();
  selection.addRange(range);
});

// Toolbar button click
addListener(document, 'click', '.wysi-toolbar > button', event => {
  const button = event.target;
  const action = button.getAttribute('data-action');
  const region = button.parentNode.nextElementSibling;
  
  execAction(action, region);
});

// Update the toolbar buttons state
addListener(document, 'selectionchange', updateToolbarState);

// Open a popover
addListener(document, 'click', '.wysi-popover > button', event => {
  // This fixes an issue where the form is cleared when clicking the button multiple times
  restoreSelection();

  const button = event.target;
  const inputs = querySelectorAll('input', button.nextElementSibling);
  const region = button.parentNode.parentNode.nextElementSibling;
  const selection = document.getSelection();
  const anchorNode = selection.anchorNode;
  const { nodes } = findRegion(anchorNode);
  const values = [];

  if (region) {
    const action = getAttribute(button, 'data-action');
    const tool = toolset[action];
    let target = nodes.filter(node => tool.tags.includes(node.tagName.toLowerCase()))[0];
    let selectContents = true;

    if (!target) {
      target = querySelector(`.${selectedClass}`, region);
      selectContents = false;
    }

    if (target) {
      const range = document.createRange();
      
      if (selectContents) {
        range.selectNodeContents(target);
      } else {
        range.selectNode(target);
      }

      currentSelection = range;

      tool.attributes.forEach(attribute => {
        values.push(getAttribute(target, attribute));
      })
    } else if (selection && region.contains(anchorNode) && selection.rangeCount) {
      currentSelection = selection.getRangeAt(0);
    }
  }

  inputs.forEach((input, i) => {
    input.value = values[i] || '';
  });

  closeAllLayers();
  toggleButton(event.target, true);
  inputs[0].focus();
  stopImmediatePropagation(event);
});

// Execute the popover action
addListener(document, 'click', '.wysi-popover > div > button[data-action]', event => {
  const button = event.target;
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
  closeAllLayers();
});

// Cancel the popover
addListener(document, 'click', '.wysi-popover > div > button:not([data-action])', event => {
  restoreSelection();
  closeAllLayers();
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
      closeAllLayers();
      restoreSelection();
      break;
  }

});

// list box button click
addListener(document, 'click', '.wysi-listbox > button', event => {
  closeAllLayers();
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
addListener(document, 'mouseup', event => {
  closeAllLayers();
});

// Add a special class to the body when text is being selected inside a popover
// This will prevent the popover from closing when the end of the text selection is outside it
addListener(document, 'mousedown', '.wysi-popover, .wysi-popover *', event => {
  document.body.classList.add('wysi-dragging');
});

// Remove the special class (above) and allow closing popovers when clicking outside
addListener(document, 'mouseup', event => {
  document.body.classList.remove('wysi-dragging');
});

// include SVG icons
DOMReady(embedSVGIcons);

export { renderToolbar };