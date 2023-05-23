import document from 'document';
import toolset from './toolset.js';
import {
  execCommand,
  getAttribute,
  hasClass,
  querySelector,
  setAttribute,
  toLowerCase
} from './shortcuts.js';

// Used to store the current DOM selection for later use
let currentSelection;

// Polyfill for Nodelist.forEach
if (NodeList !== undefined && NodeList.prototype && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
}

/**
 * Shortcut for addEventListener to optimize the minified JS.
 * @param {object} context The context to which the listener is attached.
 * @param {string} type Event type.
 * @param {(string|function)} selector Event target if delegation is used, event handler if not.
 * @param {function} [fn] Event handler if delegation is used.
 */
function addListener(context, type, selector, fn) {
  // Delegate event to the target of the selector
  if (typeof selector === 'string') {
    context.addEventListener(type, event => {
      const target = event.target;

      if (target.matches(selector)) {
        fn.call(target, event);
      }
    });

  // If the selector is not a string then it's a function
  // in which case we need a regular event listener
  } else {
    fn = selector;
    context.addEventListener(type, fn);
  }
}

/**
 * Build an html fragment from a string.
 * @param {string} html The HTML code.
 * @return {object} A document fragment.
 */
function buildFragment(html) {
  const template = createElement('template');

  template.innerHTML = html.trim();
  return template.content;
}

/**
 * Deep clone an object.
 * @param {object} obj The object to clone.
 * @return {object} The clone object.
 */
function cloneObject(obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : obj;
}

/**
 * Create an element and optionally set its attributes.
 * @param {string} tag The HTML tag of the new element.
 * @param {object} [attributes] The element's attributes.
 * @return {object} An HTML element.
 */
function createElement(tag, attributes) {
  const element = document.createElement(tag);

  if (attributes) {
    for (const attributeName in attributes) {
      // Attribute names starting with underscore are actually properties
      if (attributeName[0] === '_') {
        element[attributeName.substring(1)] = attributes[attributeName];
      } else {
        setAttribute(element, attributeName, attributes[attributeName]);
      }
    }
  }

  return element;
}

/**
 * Call a function only when the DOM is ready.
 * @param {function} fn The function to call.
 * @param {array} [args] Arguments to pass to the function.
 */
function DOMReady(fn, args) {
  args = args !== undefined ? args : [];

  if (document.readyState !== 'loading') {
    fn(...args);
  } else {
    addListener(document, 'DOMContentLoaded', () => {
      fn(...args);
    });
  }
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

    // Restore selection if any
    restoreSelection();

    // Execute the tool's action
    realAction(...options);

    // Focus the editable region
    region.focus();
  }
}

/**
 * Find the current editor instance.
 * @param {object} currentNode The possible child node of the editor instance.
 * @return {object} The instance's editable region and toolbar, and an array of nodes that lead to it.
 */
function findInstance(currentNode) {
  const nodes = [];
  let ancestor, toolbar, region;

  // Find all HTML tags between the current node and the editable ancestor
  while (currentNode && currentNode !== document.body) {
    const tag = currentNode.tagName;

    if (tag) {
      if (hasClass(currentNode, 'wysi-wrapper')) {
        // Editable ancestor found
        ancestor = currentNode;
        break;
      } else {
        nodes.push(currentNode);
      }
    }

    currentNode = currentNode.parentNode;
  }

  if (ancestor) {
    const children = ancestor.children;

    toolbar = children[0];
    region = children[1];
  }

  return { toolbar, region, nodes };
}

/**
 * Get an editor's instance id.
 * @param {object} editor The editor element.
 * @return {string} The instance id.
 */ 
function getInstanceId(editor) {
  return getAttribute(editor, 'data-wid');
}

/**
 * Try to guess the textarea element's label if any.
 * @param {object} textarea The textarea element.
 * @return {string} The textarea element's label or an empty string.
 */ 
function getTextAreaLabel(textarea) {
  const parent = textarea.parentNode;
  const id = textarea.id;
  let labelElement;

  // If the textarea element is inside a label element
  if (parent.nodeName === 'LABEL') {
    labelElement = parent;

  // Or if the textarea element has an id, and there is a label element
  // with an attribute "for" that points to that id
  } else if (id !== undefined) {
    labelElement = querySelector(`label[for="${id}"]`);
  }

  // If a label element is found, return the first non empty child text node
  if (labelElement) {
    const textNodes = [].filter.call(labelElement.childNodes, n => n.nodeType === 3);
    const texts = textNodes.map(n => n.textContent.replace(/\s+/g, ' ').trim());
    const label = texts.filter(l => l !== '')[0];

    if (label) {
      return label;
    }
  }

  return '';
}

/**
 * Restore a previous selection if any.
 */
function restoreSelection() {
  if (currentSelection) {
    setSelection(currentSelection);
    currentSelection = undefined;
  }
}

/**
 * Set the value of the current selection.
 * @param {object} range The range to set.
 */
function setCurrentSelection(range) {
  currentSelection = range;
}

/**
 * Set the selection to a range.
 * @param {object} range The range to select.
 */
function setSelection(range) {
  const selection = document.getSelection();

  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Set the expanded state of a button.
 * @param {object} button The button.
 * @param {boolean} expanded The expanded state.
 */
function toggleButton(button, expanded) {
  setAttribute(button, 'aria-expanded', expanded);
}

export {
  addListener,
  buildFragment,
  cloneObject,
  createElement,
  DOMReady,
  execAction,
  findInstance,
  getInstanceId,
  getTextAreaLabel,
  restoreSelection,
  setCurrentSelection,
  setSelection,
  toggleButton
};