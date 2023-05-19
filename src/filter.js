import settings from './settings.js';
import toolset from './toolset.js';
import {
  appendChild,
  createElement,
  getAttribute,
  removeChild,
  removeAttribute,
  setAttribute,
  toLowerCase,
  buildFragment,
  cloneObject
} from './utils.js';

const STYLE_ATTRIBUTE = 'style';

/**
 * Enable HTML tags belonging to a set of tools.
 * @param {array} tools A array of tool objects.
 * @return {object} The list of allowed tags.
 */
function enableTags(tools) {
  const allowedTags = cloneObject(settings.allowedTags);

  tools.forEach(toolName => {
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
    const styles = tool.styles ? tool.styles.slice() : [];

    tags.forEach(tag => {
      allowedTags[tag] = { attributes, styles, alias, isEmpty };
      
      if (!extraTags.includes(tag)) {
        allowedTags[tag].toolName = toolName;
      }
    });
  });

  return allowedTags;
}

/**
 * Prepare raw content for editing.
 * @param {string} content The editable region's raw content.
 * @param {array} allowedTags The list of allowed tags.
 * @return {string} The filter HTML content.
 */
function prepareContent(content, allowedTags) {
  const container = createElement('div');
  const fragment = buildFragment(content);

  filterContent(fragment, allowedTags);
  wrapTextNodes(fragment);
  cleanContent(fragment, allowedTags);
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
  newElement.innerHTML = node.innerHTML || node.textContent || node.outerHTML;

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
 * Remove unsupported CSS styles from a node.
 * @param {object} node The element to filter.
 * @param {array} allowedStyles An array of supported styles.
 */
function filterStyles(node, allowedStyles) {
  const styleAttribute = getAttribute(node, STYLE_ATTRIBUTE);

  if (styleAttribute) {
    // Parse the styles
    const styles = styleAttribute.split(';').map(style => {
      const prop = style.split(':');
      
      return {
        name: prop[0].trim(),
        value: prop[1]
      };
    })
    // Filter the styles
    .filter(style => allowedStyles.includes(style.name))

    // Convert back to a style string
    .map(({ name, value }) => `${name}: ${value.trim()};`).join('');

    if (styles !== '') {
      setAttribute(node, STYLE_ATTRIBUTE, styles);
    } else {
      removeAttribute(node, STYLE_ATTRIBUTE);
    }
  }
}

/**
 * Remove unsupported HTML tags and attributes.
 * @param {object} node The parent element to filter recursively.
 * @param {array} allowedTags The list of allowed tags.
 */
function filterContent(node, allowedTags) {
  const children = Array.from(node.childNodes);

  if (!children || !children.length) {
    return;
  }

  children.forEach(childNode => {
    // Element nodes
    if (childNode.nodeType === 1) {
      // Filter recursively (deeper nodes firest)
      filterContent(childNode, allowedTags);

      // Check if the current element is allowed
      const tag = toLowerCase(childNode.tagName);
      const allowedTag = allowedTags[tag];
      const attributes = Array.from(childNode.attributes);

      if (allowedTag) {
        const allowedAttributes = allowedTag.attributes;
        const allowedStyles = allowedTag.styles;

        // Remove attributes that are not allowed
        for (let i = 0; i < attributes.length; i++) {
          const attributeName = attributes[i].name;

          if (!allowedAttributes.includes(attributes[i].name)) {
            if (attributeName === STYLE_ATTRIBUTE && allowedStyles.length) {
              filterStyles(childNode, allowedStyles);
            } else {
              removeAttribute(childNode, attributes[i].name);
            }
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
 * @param {array} allowedTags The list of allowed tags.
 */
function cleanContent(node, allowedTags) {
  const children = Array.from(node.childNodes);

  if (!children || !children.length) {
    return;
  }

  children.forEach(childNode => {
    // Remove empty element nodes
    if (childNode.nodeType === 1) {
      // Filter recursively (deeper nodes firest)
      cleanContent(childNode, allowedTags);

      // Check if the element can be empty
      const tag = toLowerCase(childNode.tagName);
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

  const exclude = ['BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'HR', 'P', 'OL', 'UL'];
  let appendToPrev = false;

  children.forEach(childNode => {
    if (childNode.nodeType !== 3 && exclude.includes(childNode.tagName)) {
      appendToPrev = false;
      return;
    }

    // Remove empty text node
    /*if (trimText(childNode.textContent) === '') {
      removeChild(node, childNode);

    // Wrap text node in a paragraph
    } else {*/
      if (appendToPrev) {
        const prev = childNode.previousElementSibling;

        if (prev) {
          prev.appendChild(childNode);
        }
      } else {
        replaceNode(childNode, 'p');
        appendToPrev = true;
      }
    /*}*/
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
  enableTags,
  prepareContent
};