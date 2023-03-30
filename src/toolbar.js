import window from 'window';
import document from 'document';
import toolset from './toolset.js';
import { allowedTags, enableTags } from './filter.js';
import { 
  getAttribute,
  querySelector,
  querySelectorAll,
  setAttribute,
  addListener,
  findEditableRegion
} from './utils.js';

/**
 * Render the toolbar.
 * @param {array} tools The list of tools in the toolbar.
 * @param {object} options Configuration options.
 * @return {string} The toolbars HTML string.
 */
function renderToolbar(tools, options) {
  const globalTranslations = window.wysiGlobalTranslations || {};
  const translations = options.translations || globalTranslations || {};
  const buttons = [];

  // Generate toolbar buttons
  tools.forEach(toolName => {
    switch (toolName) {
      case 'separator':
        buttons.push('<div class="wysi-separator"></div>');
        break;
      case 'formatting':
        const paragraphLabel = translations['paragraph'] || toolset.paragraph.label;
        const headingLabel = translations['heading'] || toolset.heading.label;
        const formattingLabel = translations['formatting'] || toolset.formatting.label;

        buttons.push(
          '<div class="wysi-listbox">'+
            `<button type="button" aria-haspopup="listbox" aria-expanded="false" title="${formattingLabel}">`+
              paragraphLabel+
            '</button>'+
            `<div role="listbox" tabindex="-1" aria-label="${formattingLabel}">`+
              `<button type="button" role="option" tabindex="-1" aria-selected="false" data-action="paragraph">${paragraphLabel}</button>`+
              [1, 2, 3, 4].map(level => 
              `<button type="button" role="option" tabindex="-1" aria-selected="false" data-action="heading" data-level="${level}">${headingLabel} ${level}</button>`
              ).join('')+
            '</div>'+
          '</div>'
        );
        break;
      default:
        const tool = toolset[toolName];
        const label = translations[toolName] || tool.label;

        buttons.push(
          `<button type="button" aria-label="${label}" aria-pressed="false" title="${label}" data-action="${toolName}">`+
            `<svg><use href="#wysi-${toolName}"></use></svg>`+
          '</button>'
        );
    }

    // Add the current tool's tags to the list of allowed tags
    enableTags(toolName);
  });

  return buttons.join('');
}


/**
 * Update toolbar buttons state.
 */
function updateToolbarState() {
  const { region, tags } = findEditableRegion(document.getSelection().anchorNode);

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
        listBoxItem = querySelector('[data-action="paragraph"]', toolbar);
        break;
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
        listBoxItem = querySelector(`[data-action="heading"][data-level="${tag.replace('h', '')}"]`, toolbar);
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
    // Focus the editable region
    region.focus();

    // Execute the button's action
    tool.action(...options);
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
  const level = getAttribute(item, 'data-level');
  const region = item.parentNode.parentNode.parentNode.nextElementSibling;
  const options = [];

  if (level) {
    options.push(level);
  }
  
  //selectListBoxItem(item);
  execAction(action, region, options);
});

// On key press on an item
addListener(document, 'keydown', '.wysi-listbox > div > button', event => {
  const item = event.target;
  const listBox = item.parentNode;
  const button = listBox.previousElementSibling;
  let preventDefault = true;

  switch (event.key) {
    case 'ArrowUp':
      if (item.previousElementSibling) {
        item.previousElementSibling.focus();
      }
      break;
    case 'ArrowDown':
      if (item.nextElementSibling) {
        item.nextElementSibling.focus();
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

export { renderToolbar };