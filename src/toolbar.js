import document from 'document';
import toolset from './toolset.js';
import { renderPopover } from './popover.js';
import { renderListBox, selectListBoxItem } from './listbox.js';
import { instances, selectedClass } from './common.js';
import { execAction } from './commands.js';
import {
  addListener,
  buildFragment,
  createElement,
  DOMReady,
  findDeepestChildNode,
  findInstance,
  getInstanceId,
  getTranslation,
  setSelection
} from './utils.js';

/**
 * Render the toolbar.
 * @param {array} tools The list of tools in the toolbar.
 * @return {string} The toolbars HTML string.
 */
function renderToolbar(tools) {
  const toolbar = createElement('div', { class: 'wysi-toolbar' });

  // Generate toolbar buttons
  tools.forEach(toolName => {
    switch (toolName) {
      // Toolbar separator
      case '|':
        toolbar.appendChild(createElement('div', { class: 'wysi-separator' }));
        break;

      // Toolbar new line
      case '-':
        toolbar.appendChild(createElement('div', { class: 'wysi-newline' }));
        break;

      // The format tool renders as a list box
      case 'format':
        toolbar.appendChild(renderFormatTool());
        break;

      // All the other tools render as buttons
      default:
        if (typeof toolName === 'object') {
          if (toolName.items) {
            toolbar.appendChild(renderToolGroup(toolName));
          }
        } else {
          renderTool(toolName, toolbar);
        }
    }
  });

  return toolbar;
}

/**
 * Render a tool.
 * @param {string} name The tool's name.
 * @param {object} toolbar The toolbar to which the tool will be appended.
 */
function renderTool(name, toolbar) {
  const tool = toolset[name];
  const label = getTranslation(name, tool.label);
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
    const popover = renderPopover(name, button);
    toolbar.appendChild(popover);

  // The other tools only display a button
  } else {
    toolbar.appendChild(button);
  }
}

/**
 * Render a tool group.
 * @param {object} details The group's properties.
 * @return {object} A DOM element containing the tool group.
 */
function renderToolGroup(details) {
  const label = details.label || getTranslation('toolbar', 'Select an item');
  const options = details.items;

  const items = options.map(option => {
    const tool = toolset[option];
    const label = getTranslation(option, tool.label);
    const icon = option;
    const action = option;

    return { label, icon, action };
  });

  return renderListBox({ label, items });
}

/**
 * Render format tool.
 * @return {object} A DOM element containing the format tool.
 */
function renderFormatTool() {
  const toolName = 'format';
  const label = getTranslation(toolName, toolset.format.label);
  const paragraphLabel = getTranslation(toolName, toolset.format.paragraph);
  const headingLabel = getTranslation(toolName, toolset.format.heading);
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
  const selection = document.getSelection();
  const anchorNode = selection.anchorNode;

  if (!anchorNode) {
    return;
  }

  const range = selection.getRangeAt(0);

  // This is to fix double click selection on Firefox not highlighting the relevant tool in some cases
  // We want to find the deepest child node to properly handle nested styles
  const candidateNode = findDeepestChildNode(range.startContainer.nextElementSibling || range.startContainer);

  // Fallback to the original selection.anchorNode if a more suitable node is not found
  const selectedNode = range.intersectsNode(candidateNode) ? candidateNode : anchorNode;

  // Get editor instance
  const { toolbar, editor, nodes } = findInstance(selectedNode);
  const tags = nodes.map(node => node.tagName.toLowerCase());

  // Abort if the selection is not within an editor instance
  if (!editor) {
    return;
  }

  // Check for an element with the selection class (likely an image)
  const selectedObject = editor.querySelector(`.${selectedClass}`);

  // If such element exists, add its tag to the list of active tags
  if (selectedObject) {
    tags.push(selectedObject.tagName.toLowerCase());
  }

  // Get the list of allowed tags in the current editor instance
  const instanceId = getInstanceId(editor);
  const allowedTags = instances[instanceId].allowedTags;

  // Reset the state of all buttons
  toolbar.querySelectorAll('[aria-pressed="true"]').forEach(button => button.setAttribute('aria-pressed', 'false'));

  // Reset the state of all list boxes
  toolbar.querySelectorAll('.wysi-listbox > div > button:first-of-type').forEach(button => selectListBoxItem(button));

  // Update the buttons states
  tags.forEach((tag, i) => {
    switch (tag) {
      case 'p':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'li':
        const format = toolbar.querySelector(`[data-action="format"][data-option="${tag}"]`);
        const textAlign = nodes[i].style.textAlign || nodes[i].getAttribute('align');

        if (format) {
          selectListBoxItem(format);
        }

        // Check for text align
        if (textAlign) {
          const action = 'align' + textAlign.charAt(0).toUpperCase() + textAlign.slice(1);
          const button = toolbar.querySelector(`[data-action="${action}"]`);
          
          if (button) {
            if (button.parentNode.getAttribute('role') === 'listbox') {
              selectListBoxItem(button);
            } else {
              button.setAttribute('aria-pressed', 'true');
            }
          }
        }
        break;
      default:
        const allowedTag = allowedTags[tag];
        const action = allowedTag ? allowedTag.toolName : undefined;

        if (action) {
          const button = toolbar.querySelector(`[data-action="${action}"]`);
          button.setAttribute('aria-pressed', 'true');
        }
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

  document.body.appendChild(svgElement);
}

// Deselect selected element when clicking outside
addListener(document, 'mousedown', '.wysi-editor, .wysi-editor *', event => {
  const selected = document.querySelector(`.${selectedClass}`);

  if (selected && selected !== event.target) {
    selected.classList.remove(selectedClass);
  }
});

// Select an image when it's clicked
addListener(document, 'mousedown', '.wysi-editor img', event => {
  const image = event.target;
  const range = document.createRange();

  image.classList.add(selectedClass);

  range.selectNode(image);
  setSelection(range);
});

// Toolbar button click
addListener(document, 'click', '.wysi-toolbar > button', event => {
  const button = event.target;
  const action = button.dataset.action;
  const { editor } = findInstance(button);
  const selection = document.getSelection();

  if (selection && editor.contains(selection.anchorNode)) {
    execAction(action, editor);
  }
});

// Update the toolbar buttons state
addListener(document, 'selectionchange', updateToolbarState);
addListener(document, 'input', '.wysi-editor', updateToolbarState);

// include SVG icons
DOMReady(embedSVGIcons);

export { renderToolbar };