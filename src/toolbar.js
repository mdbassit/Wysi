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
  addListener,
  buildFragment,
  createElement,
  DOMReady,
  findRegion
} from './utils.js';

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
        
        appendChild(toolbar, createElement('button', {
          type: 'button',
          title: label,
          'aria-label': label,
          'aria-pressed': false,
          'data-action': toolName,
          _innerHTML: `<svg><use href="#wysi-${toolName}"></use></svg>`
        }));
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

    // Execute the tool's action
    realAction(...options);
  }
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

  setAttribute(button, 'aria-expanded', !isOpen);
  selectedItem.focus();
}

/**
 * Close a list box.
 * @param {object} button The list box's button.
 */
function closeListBox(button) {
  setAttribute(button, 'aria-expanded', 'false');
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

// Toolbar button click
addListener(document, 'click', '.wysi-toolbar > button', event => {
  const button = event.target;
  const action = button.getAttribute('data-action');
  const region = button.parentNode.nextElementSibling;
  
  execAction(action, region);
});

// Update the toolbar buttons state
addListener(document, 'selectionchange', updateToolbarState);

// list box button click
addListener(document, 'click', '.wysi-listbox > button', event => {
  openListBox(event.target);

  event.preventDefault();
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
      closeListBox(button);
      break;
    default:
      preventDefault = false;
  }

  if (preventDefault) {
    event.preventDefault();
  }
});

// Close list boxes on click outside
addListener(document, 'click', event => {
  querySelectorAll('.wysi-listbox [aria-expanded="true"]').forEach(button => closeListBox(button));
});

// include SVG icons
DOMReady(embedSVGIcons);

export { renderToolbar };