import window from 'window';
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
  setAttribute
} from './shortcuts.js';
import {
  addListener,
  buildFragment,
  createElement,
  DOMReady,
  execAction,
  findRegion,
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
  });

  return toolbar;
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
  const items = toolset.format.tags.map(tag => { 
    const name = tag;
    const label = tag === 'p' ? paragraphLabel : `${headingLabel} ${tag.substring(1)}`;
    const action = 'format';

    return { name, label, action };
  });

  return renderListBox({ label, items });
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

  // Get the list of allowed tags in the current editable region
  const instanceId = getAttribute(region, 'data-wid');
  const allowedTags = instances[instanceId].allowedTags;

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
  const region = button.parentNode.nextElementSibling;
  
  execAction(action, region);
});

// Update the toolbar buttons state
addListener(document, 'selectionchange', updateToolbarState);

// include SVG icons
DOMReady(embedSVGIcons);

export { renderToolbar };