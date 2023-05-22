import document from 'document';
import toolset from './toolset.js';
import { renderPopover } from './popover.js';
import { renderListBox, selectListBoxItem } from './listbox.js';
import { instances, selectedClass } from './common.js';
import {
  appendChild,
  getAttribute,
  querySelector,
  querySelectorAll,
  setAttribute,
  toLowerCase
} from './shortcuts.js';
import {
  addListener,
  buildFragment,
  createElement,
  DOMReady,
  execAction,
  findInstance,
  setSelection
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

      // Toolbar new line
      case '-':
        appendChild(toolbar, createElement('div', { class: 'wysi-newline' }));
        break;

      // The format tool renders as a list box
      case 'format':
        appendChild(toolbar, renderFormatTool(translations));
        break;

      // All the other tools render as buttons
      default:
        if (typeof toolName === 'object') {
          if (toolName.items) {
            appendChild(toolbar, renderToolGroup(toolName, translations));
          }
        } else {
          renderTool(toolName, toolbar, translations);
        }
    }
  });

  return toolbar;
}

/**
 * Render a tool.
 * @param {string} name The tool's name.
 * @param {object} toolbar The toolbar to which the tool will be appended.
 * @param {object} translations The labels translation object.
 */
function renderTool(name, toolbar, translations) {
  const tool = toolset[name];
  const label = translations[name] || tool.label;
  const button = createElement('button', {
    type: 'button',
    title: label,
    'aria-label': label,
    'aria-pressed': false,
    'data-action': name,
    _innerHTML: `<svg><use href="#wysi-${name}"></use></svg>`
  });

  // Tools that require parameters (e.g: image, link) need a popover
  if (tool.hasForm) {
    const popover = renderPopover(name, button, translations);
    appendChild(toolbar, popover);

  // The other tools only display a button
  } else {
    appendChild(toolbar, button);
  }
}

/**
 * Render a tool group.
 * @param {object} details The group's properties.
 * @param {object} translations The labels translation object.
 * @return {object} A DOM element containing the tool group.
 */
function renderToolGroup(details, translations) {
  const label = details.label || translations.select || 'Select an item';
  const options = details.items;

  const items = options.map(option => {
    const tool = toolset[option];
    const label = translations[option] || tool.label;
    const icon = option;
    const action = option;

    return { label, icon, action };
  });

  return renderListBox({ label, items });
}

/**
 * Render format tool.
 * @param {object} translations The labels translation object.
 * @return {object} A DOM element containing the format tool.
 */
function renderFormatTool(translations) {
  const label = translations['format'] || toolset.format.label;
  const paragraphLabel = translations['paragraph'] || toolset.format.paragraph;
  const headingLabel = translations['heading'] || toolset.format.heading;
  const classes = 'wysi-format';
  const items = toolset.format.tags.map(tag => { 
    const name = tag;
    const label = tag === 'p' ? paragraphLabel : `${headingLabel} ${tag.substring(1)}`;
    const action = 'format';

    return { name, label, action };
  });

  return renderListBox({ label, items, classes });
}

/**
 * Update toolbar buttons state.
 */
function updateToolbarState() {
  const { toolbar, region, nodes } = findInstance(document.getSelection().anchorNode);
  const tags = nodes.map(node => toLowerCase(node.tagName));

  // Abort if the selection is not within an editable region
  if (!region) {
    return;
  }

  // Get the list of allowed tags in the current editable region
  const instanceId = getAttribute(region, 'data-wid');
  const allowedTags = instances[instanceId].allowedTags;

  // Reset the state of all buttons
  querySelectorAll('[aria-pressed="true"]', toolbar).forEach(button => setAttribute(button, 'aria-pressed', 'false'));

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
          const button = querySelector(`[data-action="${action}"]`, toolbar);
          setAttribute(button, 'aria-pressed', 'true');
        }
    }

    if (listBoxItem) {
      selectListBoxItem(listBoxItem);
    }
  });
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
  const range = document.createRange();

  image.classList.add(selectedClass);

  range.selectNode(image);
  setSelection(range);
});

// Toolbar button click
addListener(document, 'click', '.wysi-toolbar > button', event => {
  const button = event.target;
  const action = button.getAttribute('data-action');
  const { region } = findInstance(button);
  const selection = document.getSelection();

  if (selection && region.contains(selection.anchorNode)) {
    execAction(action, region);
  }
});

// Update the toolbar buttons state
addListener(document, 'selectionchange', updateToolbarState);

// include SVG icons
DOMReady(embedSVGIcons);

export { renderToolbar };