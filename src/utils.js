import document from 'document';

// Polyfill for Nodelist.forEach
if (NodeList !== undefined && NodeList.prototype && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
}

// Shortcuts
const appendChild = (parent, child) => parent.appendChild(child);
const createElement = tag => document.createElement(tag);
const dispatchEvent = (element, event) => element.dispatchEvent(new Event(event, { bubbles: true }));
const execCommand = (command, value = null) => document.execCommand(command, false, value);
const hasClass = (element, classes) => element.classList && element.classList.contains(classes);
const getAttribute = (element, attribute) => element.getAttribute(attribute);
const querySelector = (selector, context = document) => context.querySelector(selector);
const querySelectorAll = (selector, context = document) => context.querySelectorAll(selector);
const removeChild = (parent, child) => parent.removeChild(child);
const setAttribute = (element, attribute, value) => element.setAttribute(attribute, value);

/**
 * Shortcut for addEventListener to optimize the minified JS.
 * @param {object} context The context to which the listener is attached.
 * @param {string} type Event type.
 * @param {(string|function)} selector Event target if delegation is used, event handler if not.
 * @param {function} [fn] Event handler if delegation is used.
 */
function addListener(context, type, selector, fn) {
  const matches = Element.prototype.matches || Element.prototype.msMatchesSelector;

  // Delegate event to the target of the selector
  if (typeof selector === 'string') {
    context.addEventListener(type, event => {
      if (matches.call(event.target, selector)) {
        fn.call(event.target, event);
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
 * Find the current editable region.
 * @param {object} currentNode The possible child node of the editable region.
 */
function findEditableRegion(currentNode) {
  const tags = [];
  let region;

  // Find all HTML tags between the current node and the editable region
  while (currentNode && currentNode.tagName !== 'BODY') {
    const tag = currentNode.tagName;

    if (tag) {
      if (hasClass(currentNode, 'wysi-editor')) {
        // Editable region found
        region = currentNode;
        break;
      } else {
        tags.push(tag.toLowerCase());
      }
    }

    currentNode = currentNode.parentNode;
  }

  return { region, tags };
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

export {
  appendChild,
  createElement,
  dispatchEvent,
  execCommand,
  getAttribute,
  hasClass,
  querySelector,
  querySelectorAll,
  removeChild,
  setAttribute,
  addListener,
  DOMReady,
  findEditableRegion,
  getTextAreaLabel
};