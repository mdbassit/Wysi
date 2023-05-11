import toolset from './toolset.js';
import { appendChild, createElement, removeChild, setAttribute, buildFragment } from './utils.js';

// Default allowed tags
const allowedTags = {
  br: {
    attributes: [],
    isEmpty: true
  }
};

/**
 * Enable HTML tags belonging to a tool.
 * @param {object} tool The tool object.
 */
function enableTags(toolName) {
  const tool = toolset[toolName];

  if (!tool || !tool.tags) {
    return;
  }

  const isEmpty = !!tool.isEmpty;
  const extraTags = tool.extraTags || [];
  const aliasList = tool.alias || [];
  const alias = aliasList.length ? tool.tags[0] : undefined;
  const tags = [...tool.tags, ...extraTags, ...aliasList];
  const attributes = tool.attributes ? tool.attributes.slice() : [];

  tags.forEach(tag => {
    allowedTags[tag] = { attributes, alias, isEmpty };
    
    if (!extraTags.includes(tag)) {
      allowedTags[tag].toolName = toolName;
    }
  });
}

/**
 * Prepare raw content for editing.
 * @param {string} content The editable region's raw content.
 * @return {string} The filter HTML content.
 */
function prepareContent(content) {
  const container = createElement('div');
  const fragment = buildFragment(content);

  filterContent(fragment);
  wrapTextNodes(fragment);
  cleanContent(fragment);
  appendChild(container, fragment);

  return container.innerHTML;
}

/**
 * Replace a DOM element with another while preserving its content.
 * @param {object} node The element to replace.
 * @param {string} tag The HTML tag of the new element.
 * @param {boolean} [copyAttributes] If true, also copy the original element's attributes.
 */
function replaceNode(node, tag, copyAttributes) {
  const newElement = createElement(tag);
  const parentNode = node.parentNode;
  const attributes = node.attributes;

  // Copy the original element's content
  newElement.innerHTML = node.innerHTML || node.textContent;

  // Copy the original element's attributes
  if (copyAttributes && attributes) {
    for (let i = 0; i < attributes.length; i++) {
      setAttribute(newElement, attributes[i].name, attributes[i].value);
    }
  }

  // Replace the element
  parentNode.replaceChild(newElement, node);
}

/**
 * Remove unsupported HTML tags and attributes.
 * @param {object} node The parent element to filter recursively.
 */
function filterContent(node) {
  const children = Array.from(node.childNodes);

  if (!children || !children.length) {
    return;
  }

  children.forEach(childNode => {
    // Element nodes
    if (childNode.nodeType === 1) {
      // Filter recursively (deeper nodes firest)
      filterContent(childNode);

      // Check if the current element is allowed
      const tag = childNode.tagName.toLowerCase();
      const allowedTag = allowedTags[tag];
      const attributes = Array.from(childNode.attributes);

      if (allowedTag) {
        // Remove attributes that are not allowed
        for (let i = 0; i < attributes.length; i++) {
          if (!allowedTag.attributes.includes(attributes[i].name)) {
            childNode.removeAttribute(attributes[i].name);
          }
        }

        // If the tag is an alias, replace it with the standard tag
        // e.g: <b> tags will be replaced with <strong> tags
        if (allowedTag.alias) {
          replaceNode(childNode, allowedTag.alias, true);
        }
      } else {
        // Remove style nodes
        if (tag === 'style') {
          removeChild(node, childNode);

        // And unwrap the other nodes
        } else {
          childNode.replaceWith(...childNode.childNodes);
        }
      }

    // Remove comment nodes
    } else if (childNode.nodeType === 8) {
      removeChild(node, childNode);
    }
  });
}

/**
 * Remove empty nodes.
 * @param {object} node The parent element to filter recursively.
 */
function cleanContent(node) {
  const children = Array.from(node.childNodes);

  if (!children || !children.length) {
    return;
  }

  children.forEach(childNode => {
    // Remove empty element nodes
    if (childNode.nodeType === 1) {
      // Filter recursively (deeper nodes firest)
      cleanContent(childNode);

      // Check if the element can be empty
      const tag = childNode.tagName.toLowerCase();
      const allowedTag = allowedTags[tag];

      if (allowedTag && !allowedTag.isEmpty && trimText(childNode.innerHTML) === '') {
        removeChild(node, childNode);
      }
    }
  });
}

/**
 * Wrap the child text nodes in a paragraph (non-recursively).
 * @param {object} node The parent element of the text nodes.
 */
function wrapTextNodes(node) {
  const children = Array.from(node.childNodes);

  if (!children || !children.length) {
    return;
  }

  children.forEach(childNode => {
    if (childNode.nodeType === 3) {
      // Remove empty text node
      if (trimText(childNode.textContent) === '') {
        removeChild(node, childNode);

      // Wrap text node in a paragraph
      } else {
        replaceNode(childNode, 'p');
      }
    }
  });
}

/**
 * Trim whitespace from the start and end of a text.
 * @param {string} text The text to trim.
 * @return {string} The trimmed text.
 */
function trimText(text) {
  return text.replace(/^\s+|\s+$/g, '').trim();
}

export {
  allowedTags,
  enableTags,
  prepareContent
};