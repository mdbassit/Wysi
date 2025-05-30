import document from 'document';
import { hasClass } from './shortcuts.js';

// Used to store the current DOM selection for later use
let currentSelection;

// For storing translated strings
let availableTranslations;

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
export function addListener(context, type, selector, fn) {
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
export function buildFragment(html) {
  const template = createElement('template');

  template.innerHTML = html.trim();
  return template.content;
}

/**
 * Deep clone an object.
 * @param {object} obj The object to clone.
 * @return {object} The clone object.
 */
export function cloneObject(obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : obj;
}

/**
 * Create an element and optionally set its attributes.
 * @param {string} tag The HTML tag of the new element.
 * @param {object} [attributes] The element's attributes.
 * @return {object} An HTML element.
 */
export function createElement(tag, attributes) {
  const element = document.createElement(tag);

  if (attributes) {
    for (const attributeName in attributes) {
      // Attribute names starting with underscore are actually properties
      if (attributeName[0] === '_') {
        element[attributeName.substring(1)] = attributes[attributeName];
      } else {
        element.setAttribute(attributeName, attributes[attributeName]);
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
export function DOMReady(fn, args) {
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
 * Find the the deepest child of a node.
 * @param {object} node The target node.
 * @return {object} The deepest child node of our target node.
 */
export function findDeepestChildNode(node) {
  while(node.firstChild !== null) {
    node = node.firstChild;
  }

  return node;
}

/**
 * Find the current editor instance.
 * @param {object} currentNode The possible child node of the editor instance.
 * @return {object} The instance's editable region and toolbar, and an array of nodes that lead to it.
 */
export function findInstance(currentNode) {
  const nodes = [];
  let ancestor, toolbar, editor;

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
    editor = children[1];
  }

  return { toolbar, editor, nodes };
}

/**
 * Get the current selection.
 * @return {object} The current selection.
 */
export function getCurrentSelection() {
  return currentSelection;
}

/**
 * Get the html content of a document fragment.
 * @param {string} fragment A document fragment.
 * @return {string} The html content of the fragment.
 */
export function getFragmentContent(fragment) {
  const wrapper = createElement('div');

  wrapper.appendChild(fragment);
  return wrapper.innerHTML;
}

/**
 * Get an editor's instance id.
 * @param {object} editor The editor element.
 * @return {string} The instance id.
 */ 
export function getInstanceId(editor) {
  return editor.dataset.wid;
}

/**
 * Get a list of DOM elements based on a selector value.
 * @param {(string|object)} selector A CSS selector string, a DOM element or a list of DOM elements.
 * @return {array} A list of DOM elements.
 */ 
export function getTargetElements(selector) {
  // If selector is a string, get the elements that it represents
  if (typeof selector === 'string') {
    return Array.from(document.querySelectorAll(selector));
  }

  // If selector is a DOM element, wrap it in an array
  if (selector instanceof Node) {
    return [selector];
  }

  // If selector is a NodeList or an HTMLCollection, convert it to an array
  if (selector instanceof NodeList || selector instanceof HTMLCollection) {
    return Array.from(selector);
  }

  // If selector is an array, find any DOM elements it contains
  if (Array.isArray(selector)) {
    return selector.filter(el => el instanceof Node);
  }

  return [];
}

/**
 * Try to guess the textarea element's label if any.
 * @param {object} textarea The textarea element.
 * @return {string} The textarea element's label or an empty string.
 */ 
export function getTextAreaLabel(textarea) {
  const parent = textarea.parentNode;
  const id = textarea.id;
  let labelElement;

  // If the textarea element is inside a label element
  if (parent.nodeName === 'LABEL') {
    labelElement = parent;

  // Or if the textarea element has an id, and there is a label element
  // with an attribute "for" that points to that id
  } else if (id !== undefined) {
    labelElement = document.querySelector(`label[for="${id}"]`);
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
 * Get a translated string if applicable.
 * @param {string} category The category of the string.
 * @param {string} str The string to translate.
 * @return {string} The translated string, or the original string otherwise.
 */ 
export function getTranslation(category, str) {
  if (availableTranslations[category] && availableTranslations[category][str]) {
    return availableTranslations[category][str];
  }

  return str;
}

/**
 * Restore a previous selection if any.
 */
export function restoreSelection() {
  if (currentSelection) {
    setSelection(currentSelection);
    currentSelection = undefined;
  }
}

/**
 * Set the value of the current selection.
 * @param {object} range The range to set.
 */
export function setCurrentSelection(range) {
  currentSelection = range;
}

/**
 * Set the selection to a range.
 * @param {object} range The range to select.
 */
export function setSelection(range) {
  const selection = document.getSelection();

  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Store translated strings.
 * @param {object} translations The translated strings.
 */
export function storeTranslations(translations) {
  availableTranslations = translations;
}

/**
 * Set the expanded state of a button.
 * @param {object} button The button.
 * @param {boolean} expanded The expanded state.
 */
export function toggleButton(button, expanded) {
  button.setAttribute('aria-expanded', expanded);
}