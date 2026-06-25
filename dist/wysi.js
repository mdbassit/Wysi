/*!
 * Copyright (c) 2023 Momo Bassit.
 * Licensed under the MIT License (MIT)
 * https://github.com/mdbassit/Wysi
 */
(function (window, document) {
  'use strict';

  // Default settings
  var settings = {
    // Default selector
    el: '[data-wysi], .wysi-field',
    // Default tools in the toolbar
    tools: ['format', '|', 'bold', 'italic', '|', {
      label: 'Text alignment',
      items: ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']
    }, '|', 'ul', 'ol', '|', 'indent', 'outdent', '|', 'link', 'image', '|', 'table'],
    // Enable dark mode (toolbar only)
    darkMode: false,
    // Height of the editable region
    height: 200,
    // Grow the editable region's height to fit its content
    autoGrow: false,
    // Hide the toolbar when the editable region is out of focus
    autoHide: false,
    // Default list of allowed tags
    // These tags are always allowed regardless of the instance options
    allowedTags: {
      br: {
        attributes: [],
        styles: [],
        isEmpty: true
      },
      p: {
        attributes: [],
        styles: [],
        isEmpty: false
      }
    },
    // Custom tags to allow when filtering inserted content
    customTags: [
      /* Example:
       {
        tags: ['table', 'thead', 'tbody', 'tr', 'td', 'th'], // Tags to allow
        attributes: ['id', 'class'], // These attributes will be permitted for all the tags above
        styles: ['width'],
        isEmpty: false
      }
       */
    ]
  };

  // Supported tools
  var toolset = {
    format: {
      tags: ['p', 'h1', 'h2', 'h3', 'h4'],
      styles: ['text-align'],
      label: 'Select block format',
      paragraph: 'Paragraph',
      heading: 'Heading'
    },
    quote: {
      tags: ['blockquote'],
      label: 'Quote'
    },
    bold: {
      tags: ['strong'],
      alias: ['b'],
      label: 'Bold'
    },
    italic: {
      tags: ['em'],
      alias: ['i'],
      label: 'Italic'
    },
    underline: {
      tags: ['u'],
      label: 'Underline'
    },
    strike: {
      tags: ['s'],
      alias: ['del', 'strike'],
      label: 'Strike-through',
      command: 'strikeThrough'
    },
    alignLeft: {
      label: 'Align left',
      command: 'justifyLeft'
    },
    alignCenter: {
      label: 'Align center',
      command: 'justifyCenter'
    },
    alignRight: {
      label: 'Align right',
      command: 'justifyRight'
    },
    alignJustify: {
      label: 'Justify',
      command: 'justifyFull'
    },
    ul: {
      tags: ['ul'],
      extraTags: ['li'],
      styles: ['text-align'],
      label: 'Bulleted list',
      command: 'insertUnorderedList'
    },
    ol: {
      tags: ['ol'],
      extraTags: ['li'],
      styles: ['text-align'],
      label: 'Numbered list',
      command: 'insertOrderedList'
    },
    indent: {
      label: 'Increase indent'
    },
    outdent: {
      label: 'Decrease indent'
    },
    link: {
      tags: ['a'],
      attributes: ['href', 'target'],
      attributeLabels: ['URL', 'Open link in'],
      hasForm: true,
      formOptions: {
        target: [{
          label: 'Current tab',
          value: ''
        }, {
          label: 'New tab',
          value: '_blank'
        }]
      },
      label: 'Link'
    },
    image: {
      tags: ['img'],
      attributes: ['src', 'alt'],
      attributeLabels: ['URL', 'Alternative text'],
      extraSettings: ['size', 'position'],
      extraSettingLabels: ['Image size', 'Image position'],
      styles: ['width', 'height', 'display', 'margin', 'float'],
      isEmpty: true,
      hasForm: true,
      formOptions: {
        size: [{
          label: 'None',
          value: '',
          criterion: null
        }, {
          label: '100%',
          value: '100%',
          criterion: {
            width: '100%'
          }
        }, {
          label: '50%',
          value: '50%',
          criterion: {
            width: '50%'
          }
        }, {
          label: '25%',
          value: '25%',
          criterion: {
            width: '25%'
          }
        }],
        position: [{
          label: 'None',
          value: '',
          criterion: null
        }, {
          label: 'Left',
          value: 'left',
          criterion: {
            float: 'left'
          }
        }, {
          label: 'Center',
          value: 'center',
          criterion: {
            margin: 'auto'
          }
        }, {
          label: 'Right',
          value: 'right',
          criterion: {
            float: 'right'
          }
        }]
      },
      label: 'Image'
    },
    table: {
      tags: ['table'],
      extraTags: ['thead', 'tbody', 'tr', 'td', 'th'],
      styles: ['text-align', 'width'],
      label: 'Table'
    },
    hr: {
      tags: ['hr'],
      isEmpty: true,
      label: 'Horizontal line',
      command: 'insertHorizontalRule'
    },
    removeFormat: {
      label: 'Remove format'
    },
    unlink: {
      label: 'Remove link'
    }
  };

  // Instances storage
  const instances = {};

  // The CSS class to use for selected elements
  const selectedClass = 'wysi-selected';

  // Placeholder elements CSS class
  const placeholderClass = 'wysi-fragment-placeholder';

  // Heading elements
  const headingElements = ['H1', 'H2', 'H3', 'H4'];

  // Block type HTML elements
  const blockElements = ['BLOCKQUOTE', 'HR', 'P', 'OL', 'UL', 'TABLE'].concat(headingElements);

  // Detect Firefox browser
  const isFirefox = navigator.userAgent.search(/Gecko\//) > -1;

  // Shortcuts
  const dispatchEvent = (element, event) => element.dispatchEvent(new Event(event, {
    bubbles: true
  }));
  const execCommand = function (command, value) {
    if (value === void 0) {
      value = null;
    }
    return document.execCommand(command, false, value);
  };
  const hasClass = (element, classes) => element.classList && element.classList.contains(classes);

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
   * Find the the deepest child of a node.
   * @param {object} node The target node.
   * @return {object} The deepest child node of our target node.
   */
  function findDeepestChildNode(node) {
    while (node.firstChild !== null) {
      node = node.firstChild;
    }
    return node;
  }

  /**
   * Find WYSIWYG editor instances.
   * @param {string} selector One or more selectors pointing to textarea fields.
   */
  function findEditorInstances(selector) {
    const editorInstances = [];
    getTargetElements(selector).forEach(textarea => {
      const wrapper = textarea.previousElementSibling;
      if (wrapper && hasClass(wrapper, 'wysi-wrapper')) {
        const children = wrapper.children;
        const toolbar = children[0];
        const editor = children[1];
        const instanceId = getInstanceId(editor);
        editorInstances.push({
          textarea,
          wrapper,
          toolbar,
          editor,
          instanceId
        });
      }
    });
    return editorInstances;
  }

  /**
   * Find the current editor instance.
   * @param {object} currentNode The possible child node of the editor instance.
   * @return {object} The instance's editable region and toolbar, and an array of nodes that lead to it.
   */
  function findInstance(currentNode) {
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
    return {
      toolbar,
      editor,
      nodes
    };
  }

  /**
   * Get the current selection.
   * @return {object} The current selection.
   */
  function getCurrentSelection() {
    return currentSelection;
  }

  /**
   * Get the html content of a document fragment.
   * @param {string} fragment A document fragment.
   * @return {string} The html content of the fragment.
   */
  function getFragmentContent(fragment) {
    const wrapper = createElement('div');
    wrapper.appendChild(fragment);
    return wrapper.innerHTML;
  }

  /**
   * Get an editor's instance id.
   * @param {object} editor The editor element.
   * @return {string} The instance id.
   */
  function getInstanceId(editor) {
    return editor.dataset.wid;
  }

  /**
   * Get a list of DOM elements based on a selector value.
   * @param {(string|object)} selector A CSS selector string, a DOM element or a list of DOM elements.
   * @return {array} A list of DOM elements.
   */
  function getTargetElements(selector) {
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
      labelElement = document.querySelector("label[for=\"" + id + "\"]");
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
  function getTranslation(category, str) {
    if (availableTranslations[category] && availableTranslations[category][str]) {
      return availableTranslations[category][str];
    }
    return str;
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
   * Store translated strings.
   * @param {object} translations The translated strings.
   */
  function storeTranslations(translations) {
    availableTranslations = translations;
  }

  /**
   * Set the expanded state of a button.
   * @param {object} button The button.
   * @param {boolean} expanded The expanded state.
   */
  function toggleButton(button, expanded) {
    button.setAttribute('aria-expanded', expanded);
  }

  /**
   * Execute an action.
   * @param {string} action The action to execute.
   * @param {object} editor The editor instance.
   * @param {array} [options] Optional action parameters.
   */
  function execAction(action, editor, options) {
    if (options === void 0) {
      options = [];
    }
    const tool = toolset[action];
    if (tool) {
      const command = tool.command || action;

      // Restore selection if any
      restoreSelection();

      // Execute the tool's action
      execEditorCommand(command, options);

      // Focus the editor instance
      editor.focus();
    }
  }

  /**
   * Execute an editor command.
   * @param {string} command The command to execute.
   * @param {array} [options] Optional command parameters.
   */
  function execEditorCommand(command, options) {
    switch (command) {
      // Block level formatting
      case 'quote':
        options[0] = 'blockquote';
      case 'format':
        execCommand('formatBlock', "<" + options[0] + ">");
        break;

      // Links
      case 'link':
        const linkUrl = options[0],
          _options$ = options[1],
          linkTarget = _options$ === void 0 ? '' : _options$,
          linkText = options[2];
        if (linkText) {
          const targetAttr = linkTarget !== '' ? " target=\"" + linkTarget + "\"" : '';
          const linkTag = "<a href=\"" + linkUrl + "\"" + targetAttr + ">" + linkText + "</a>";
          execCommand('insertHTML', linkTag);
        }
        break;

      // Images
      case 'image':
        const styles = [];
        const imageUrl = options[0],
          _options$2 = options[1],
          altText = _options$2 === void 0 ? '' : _options$2,
          size = options[2],
          position = options[3],
          originalHtml = options[4];
        if (size !== '') {
          styles.push("width: " + size + ";");
        }
        if (position !== '') {
          if (position === 'center') {
            styles.push('display: block; margin: auto;');
          } else {
            styles.push("float: " + position + ";");
          }
        }
        const styleAttr = styles.length > 0 ? " style=\"" + styles.join(' ') + "\"" : '';
        const image = "<img src=\"" + imageUrl + "\" alt=\"" + altText + "\" class=\"wysi-selected\"" + styleAttr + ">";
        const imageTag = originalHtml ? originalHtml.replace(/<img[^>]+>/i, image) : image;
        execCommand('insertHTML', imageTag);
        break;

      // All the other commands
      default:
        execCommand(command);
    }
  }

  /**
   * Render a list box.
   * @param {object} details The list box properties and data.
   * @return {object} A DOM element containing the list box.
   */
  function renderListBox(details) {
    const label = details.label;
    const items = details.items;
    const firstItem = items[0];
    const classes = ['wysi-listbox'].concat(details.classes || []);

    // List box wrapper
    const listBox = createElement('div', {
      class: classes.join(' ')
    });

    // List box button
    const button = createElement('button', {
      type: 'button',
      title: label,
      'aria-label': label + " " + firstItem.label,
      'aria-haspopup': 'listbox',
      'aria-expanded': false,
      _innerHTML: renderListBoxItem(firstItem)
    });

    // List box menu
    const menu = createElement('div', {
      role: 'listbox',
      tabindex: -1,
      'aria-label': label
    });

    // List box items
    items.forEach(item => {
      const option = createElement('button', {
        type: 'button',
        role: 'option',
        tabindex: -1,
        'aria-label': item.label,
        'aria-selected': false,
        'data-action': item.action,
        'data-option': item.name || '',
        _innerHTML: renderListBoxItem(item)
      });
      menu.appendChild(option);
    });

    // Tie it all together
    listBox.appendChild(button);
    listBox.appendChild(menu);
    return listBox;
  }

  /**
   * Render a list box item.
   * @param {object} item The list box item.
   * @return {string} The list box item's content.
   */
  function renderListBoxItem(item) {
    return item.icon ? "<svg><use href=\"#wysi-" + item.icon + "\"></use></svg>" : item.label;
  }

  /**
   * Open a list box.
   * @param {object} button The list box's button.
   */
  function openListBox(button) {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    const listBox = button.nextElementSibling;
    let selectedItem = listBox.querySelector('[aria-selected="true"]');
    if (!selectedItem) {
      selectedItem = listBox.firstElementChild;
    }
    toggleButton(button, !isOpen);
    selectedItem.focus();
  }

  /**
   * Select a list box item.
   * @param {object} item The list box item.
   */
  function selectListBoxItem(item) {
    const listBox = item.parentNode;
    const button = listBox.previousElementSibling;
    const selectedItem = listBox.querySelector('[aria-selected="true"]');
    if (selectedItem) {
      selectedItem.setAttribute('aria-selected', 'false');
    }
    item.setAttribute('aria-selected', 'true');
    button.innerHTML = item.innerHTML;
  }

  /**
   * Close the currently open list box if any.
   */
  function closeListBox() {
    const activeListBox = document.querySelector('.wysi-listbox [aria-expanded="true"]');
    if (activeListBox) {
      toggleButton(activeListBox, false);
    }
  }

  // list box button click
  addListener(document, 'click', '.wysi-listbox > button', event => {
    closeListBox();
    openListBox(event.target);
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
    const action = item.dataset.action;
    const option = item.dataset.option;
    const _findInstance = findInstance(item),
      editor = _findInstance.editor;
    const selection = document.getSelection();
    if (selection && editor.contains(selection.anchorNode)) {
      execAction(action, editor, [option]);
    }
    selectListBoxItem(item);
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
        toggleButton(button, false);
        break;
      default:
        preventDefault = false;
    }
    if (preventDefault) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
  let isOpeningInProgress = false;

  // Close open popups and dropdowns on click outside
  addListener(document, 'click', event => {
    if (!isOpeningInProgress) {
      closeListBox();
    }
  });

  // This prevents closing a listbox immediately after opening it
  addListener(document, 'mousedown', '.wysi-listbox > button', event => isOpeningInProgress = true);
  addListener(document, 'mouseup', event => setTimeout(() => {
    isOpeningInProgress = false;
  }));

  // Used to give form fields unique ids
  let uniqueFieldId = 0;

  /**
   * Render a popover form to set a tool's parameters.
   * @param {string} toolName The tool name.
   * @param {object} button The tool's toolbar button.
   * @return {object} A DOM element containing the button and the popover.
   */
  function renderPopover(toolName, button) {
    const tool = toolset[toolName];
    const labels = tool.attributeLabels;
    const fields = tool.attributes.map((attribute, i) => {
      return {
        name: attribute,
        label: getTranslation(toolName, labels[i])
      };
    });

    // Popover wrapper
    const wrapper = createElement('div', {
      class: 'wysi-popover'
    });

    // Popover
    const popover = createElement('div', {
      tabindex: -1
    });

    // Toolbar Button
    button.setAttribute('aria-haspopup', true);
    button.setAttribute('aria-expanded', false);
    wrapper.appendChild(button);
    wrapper.appendChild(popover);
    fields.forEach(field => {
      // Link target requires special handling later
      if (toolName !== 'link' || field.name !== 'target') {
        const label = createElement('label');
        const span = createElement('span', {
          _textContent: field.label
        });
        const input = createElement('input', {
          type: 'text',
          name: "wysi-" + field.name,
          'data-attribute': field.name
        });
        label.appendChild(span);
        label.appendChild(input);
        popover.appendChild(label);
      }
    });

    // Link popover
    if (toolName === 'link') {
      // Add the target attribute
      const targetField = fields.find(f => f.name === 'target');
      if (targetField) {
        targetField.toolName = toolName;
        targetField.options = tool.formOptions ? tool.formOptions.target || [] : [];
        popover.appendChild(createElement('span', {
          _textContent: targetField.label
        }));
        popover.appendChild(renderSegmentedField(targetField));
      }

      // The link popover needs an extra "Remove link" button
      const extraTool = 'unlink';
      const label = getTranslation(toolName, toolset[extraTool].label);
      popover.appendChild(createElement('button', {
        type: 'button',
        title: label,
        'aria-label': label,
        'data-action': extraTool,
        _innerHTML: "<svg><use href=\"#wysi-delete\"></use></svg>"
      }));
    }

    // Image popover
    if (toolName === 'image') {
      const imageSettings = tool.extraSettings.map((setting, i) => {
        return {
          name: setting,
          label: getTranslation(toolName, tool.extraSettingLabels[i])
        };
      });
      imageSettings.forEach(setting => {
        setting.toolName = toolName;
        setting.options = tool.formOptions ? tool.formOptions[setting.name] || [] : [];
        popover.appendChild(createElement('span', {
          _textContent: setting.label
        }));
        popover.appendChild(renderSegmentedField(setting));
      });
    }
    const cancel = createElement('button', {
      type: 'button',
      _textContent: getTranslation('popover', 'Cancel')
    });
    const save = createElement('button', {
      type: 'button',
      'data-action': toolName,
      _textContent: getTranslation('popover', 'Save')
    });
    popover.appendChild(cancel);
    popover.appendChild(save);
    return wrapper;
  }

  /**
   * Render a segmented form field.
   * @param {object} field The field attributes.
   * @return {object} A DOM element representing the segmented field.
   */
  function renderSegmentedField(field) {
    const fieldId = uniqueFieldId++;
    const segmented = createElement('fieldset', {
      class: 'wysi-segmented'
    });

    // Add the fieldset legend for accessibility
    segmented.appendChild(createElement('legend', {
      _textContent: field.label
    }));

    // Add field options
    field.options.forEach(option => {
      const segmentId = uniqueFieldId++;
      segmented.appendChild(createElement('input', {
        id: "wysi-seg-" + segmentId,
        name: "wysi-" + field.toolName + "-" + field.name + "-" + fieldId,
        type: 'radio',
        'data-attribute': field.name,
        value: option.value
      }));
      segmented.appendChild(createElement('label', {
        for: "wysi-seg-" + segmentId,
        _textContent: getTranslation(field.toolName, option.label)
      }));
    });
    return segmented;
  }

  /**
   * Open a popover.
   * @param {object} button The popover's button.
   */
  function openPopover(button) {
    const inputs = button.nextElementSibling.querySelectorAll('input[type="text"]');
    const radioButtons = button.nextElementSibling.querySelectorAll('input[type="radio"]');
    const selection = document.getSelection();
    const anchorNode = selection.anchorNode;
    const _findInstance = findInstance(anchorNode),
      editor = _findInstance.editor,
      nodes = _findInstance.nodes;
    const values = {};
    if (editor) {
      // Try to find an existing target of the popover's action from the DOM selection
      const action = button.dataset.action;
      const tool = toolset[action];
      let target = editor.querySelector("." + selectedClass);
      let selectContents = false;

      // If that fails, look for an element with the selection CSS class
      if (!target) {
        target = nodes.filter(node => tool.tags.includes(node.tagName.toLowerCase()))[0];
        selectContents = true;
      }

      // If an existing target is found, we will be in modification mode
      if (target) {
        const range = document.createRange();

        // Add the target to a selection range
        // Depending on the type of the target, select the whole node or just its contents
        if (selectContents) {
          range.selectNodeContents(target);
        } else {
          range.selectNode(target);
        }

        // Save the current selection for later use
        setCurrentSelection(range);

        // Retrieve the current attribute values of the target for modification
        tool.attributes.forEach(attribute => {
          values[attribute] = target.getAttribute(attribute);
        });

        // Process extra popover settings
        if (tool.extraSettings) {
          tool.extraSettings.forEach(setting => {
            const settingOptions = tool.formOptions[setting];
            for (const option of settingOptions) {
              if (!option.criterion) {
                continue;
              }
              const key = Object.keys(option.criterion)[0];
              const value = option.criterion[key];
              if (target.style[key] && target.style[key] === value) {
                values[setting] = option.value;
                break;
              }
            }
          });
        }

        // If no existing target is found, we are adding new content
      } else if (selection && editor.contains(anchorNode) && selection.rangeCount) {
        // Save the current selection to keep track of where to insert the content
        setCurrentSelection(selection.getRangeAt(0));
      }
    }

    // Populate the input fields with the existing values if any
    inputs.forEach(input => {
      input.value = values[input.dataset.attribute] || '';
    });

    // Check the relevent radio fields if any
    radioButtons.forEach(radio => {
      const value = values[radio.dataset.attribute] || '';
      if (radio.value === value) {
        radio.checked = true;
      }
    });

    // Open this popover
    toggleButton(button, true);

    // Focus the first input field
    inputs[0].focus();
  }

  /**
   * Execute a popover's action.
   * @param {object} button The popover's action button.
   */
  function execPopoverAction(button) {
    const action = button.dataset.action;
    const selection = getCurrentSelection();
    const inputs = button.parentNode.querySelectorAll('input[type="text"]');
    const radioButtons = button.parentNode.querySelectorAll('input[type="radio"]');
    const _findInstance2 = findInstance(button),
      editor = _findInstance2.editor;
    const options = [];
    inputs.forEach(input => {
      options.push(input.value);
    });
    radioButtons.forEach(radio => {
      if (radio.checked) {
        options.push(radio.value);
      }
    });

    // Workaround for links being removed when updating images
    if (action === 'image') {
      const selected = editor.querySelector("." + selectedClass);
      const parent = selected ? selected.parentNode : {};
      if (selected && parent.tagName === 'A') {
        options.push(parent.outerHTML);
      }

      // Save the content of the current selection to use as a link text
    } else if (action === 'link' && selection) {
      options.push(getFragmentContent(selection.cloneContents()));
    }
    execAction(action, editor, options);
  }

  /**
   * Close the open popover if any.
   * @param {boolean} ignoreSelection If true, do not restore the previous selection.
   */
  function closePopover(ignoreSelection) {
    const popover = document.querySelector('.wysi-popover [aria-expanded="true"]');
    if (popover) {
      toggleButton(popover, false);
    }
    if (!ignoreSelection) {
      restoreSelection();
    }
  }

  // Open a popover
  addListener(document, 'click', '.wysi-popover > button', event => {
    closePopover();
    openPopover(event.target);
  });

  // On key press on the popover button
  addListener(document, 'keydown', '.wysi-popover > button', event => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        openPopover(event.target);
        event.preventDefault();
        break;
    }
  });

  // Execute the popover action
  addListener(document, 'click', '.wysi-popover > div > button[data-action]', event => {
    execPopoverAction(event.target);
    closePopover(true);
  });

  // Cancel the popover
  addListener(document, 'click', '.wysi-popover > div > button:not([data-action])', event => {
    closePopover();
  });

  // Prevent clicks on the popover content to propagate (keep popover open)
  addListener(document, 'click', '.wysi-popover *:not(button)', event => {
    event.stopImmediatePropagation();
  });

  // Trap focus inside a popover until it's closed
  addListener(document, 'keydown', '.wysi-popover *', event => {
    const target = event.target;
    const parent = target.parentNode;
    const form = parent.tagName === 'DIV' ? parent : parent.parentNode;
    switch (event.key) {
      case 'Tab':
        const firstField = form.querySelector('input');
        if (event.shiftKey) {
          if (target === firstField) {
            form.lastElementChild.focus();
            event.preventDefault();
          }
        } else {
          if (!target.nextElementSibling && !target.parentNode.nextElementSibling) {
            firstField.focus();
            event.preventDefault();
          }
        }
        break;
      case 'Enter':
        if (target.tagName === 'INPUT') {
          const actionButton = form.querySelector('[data-action]:last-of-type');
          actionButton.click();
          event.preventDefault();
        }
        break;
      case 'Escape':
        closePopover();
        event.stopImmediatePropagation();
        break;
    }
  });
  let isSelectionInProgress = false;

  // Close open popups and dropdowns on click outside
  addListener(document, 'click', event => {
    if (!isSelectionInProgress) {
      closePopover();
    }
  });

  // Text selection within a popover is in progress
  // This helps avoid closing a popover when the end of a text selection is outside it
  addListener(document, 'mousedown', '.wysi-popover, .wysi-popover *', event => {
    isSelectionInProgress = true;
  });

  // The text selection ended
  addListener(document, 'mouseup', event => {
    setTimeout(() => {
      isSelectionInProgress = false;
    });
  });

  // Saved selection for table menu (separate from shared currentSelection)
  let tableMenuSelection = null;

  // Flag to prevent closing menu immediately after opening
  let isTableMenuOpening = false;

  // ============ DOM HELPERS ============

  /**
   * Find the table cell (td or th) containing the given node.
   * @param {object} node A DOM node.
   * @return {object|null} The table cell element, or null.
   */
  function getCurrentCell(node) {
    while (node) {
      if (node.nodeType === 1) {
        if (node.tagName === 'TD' || node.tagName === 'TH') return node;
        if (node.classList.contains('wysi-editor')) return null;
      }
      node = node.parentNode;
    }
    return null;
  }

  /**
   * Find the table element containing the given node.
   * @param {object} node A DOM node.
   * @return {object|null} The table element, or null.
   */
  function getCurrentTable(node) {
    while (node) {
      if (node.nodeType === 1) {
        if (node.tagName === 'TABLE') return node;
        if (node.classList.contains('wysi-editor')) return null;
      }
      node = node.parentNode;
    }
    return null;
  }

  /**
   * Get the index of a cell within its row.
   * @param {object} cell The td/th element.
   * @return {number} The zero-based index.
   */
  function getCellIndex(cell) {
    let index = 0;
    let sibling = cell.previousElementSibling;
    while (sibling) {
      index++;
      sibling = sibling.previousElementSibling;
    }
    return index;
  }

  /**
   * Get all rows from a table.
   * @param {object} table The table element.
   * @return {array} Array of tr elements.
   */
  function getAllRows(table) {
    return Array.from(table.querySelectorAll('tr'));
  }

  /**
   * Create an empty table cell.
   * @param {string} [tagName] The cell tag name (td or th).
   * @return {object} A new cell element with a br placeholder.
   */
  function createCell(tagName) {
    const cell = createElement(tagName || 'td');
    cell.appendChild(createElement('br'));
    return cell;
  }

  /**
   * Move cursor focus to a table cell.
   * @param {object} cell The cell to focus.
   */
  function focusCell(cell) {
    const selection = document.getSelection();
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Dispatch an input event on the editor to sync content.
   * @param {object} editor The editor element.
   */
  function syncEditor(editor) {
    if (editor) {
      dispatchEvent(editor, 'input');
    }
  }

  // ============ TABLE OPERATIONS ============

  /**
   * Insert a new table at the current cursor position.
   * @param {number} rows Number of rows.
   * @param {number} cols Number of columns.
   */
  function insertTable(rows, cols, header) {
    const table = createElement('table');
    if (header) {
      const thead = createElement('thead');
      const tr = createElement('tr');
      for (let j = 0; j < cols; j++) {
        tr.appendChild(createCell('th'));
      }
      thead.appendChild(tr);
      table.appendChild(thead);
    }
    const tbody = createElement('tbody');
    for (let i = 0; i < rows; i++) {
      const tr = createElement('tr');
      for (let j = 0; j < cols; j++) {
        tr.appendChild(createCell());
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    // Add a trailing paragraph so users can type after the table
    execCommand('insertHTML', table.outerHTML + '<p><br></p>');

    // Add resize handles to the newly inserted table
    const selection = document.getSelection();
    if (selection.anchorNode) {
      const newTable = getCurrentTable(selection.anchorNode);
      if (newTable) addResizeHandles(newTable);
    }
  }

  /**
   * Add a row above or below the current row.
   * @param {string} position Either 'above' or 'below'.
   */
  function addRow(position) {
    const selection = document.getSelection();
    if (!selection.anchorNode) return;
    const cell = getCurrentCell(selection.anchorNode);
    if (!cell) return;
    const row = cell.parentNode;
    const colCount = row.children.length;
    const newRow = createElement('tr');
    for (let i = 0; i < colCount; i++) {
      const newCell = createCell();
      const refWidth = row.children[i].style.width;
      if (refWidth) newCell.style.width = refWidth;
      newRow.appendChild(newCell);
    }
    if (position === 'above') {
      row.before(newRow);
    } else {
      row.after(newRow);
    }
  }

  /**
   * Remove the current row. Deletes the table if only one row remains.
   */
  function removeRow() {
    const selection = document.getSelection();
    if (!selection.anchorNode) return;
    const cell = getCurrentCell(selection.anchorNode);
    if (!cell) return;
    const row = cell.parentNode;
    const table = getCurrentTable(cell);
    const rows = getAllRows(table);
    if (rows.length <= 1) {
      deleteTable();
    } else {
      const nextRow = row.nextElementSibling || row.previousElementSibling;
      row.remove();
      if (nextRow && nextRow.firstElementChild) {
        focusCell(nextRow.firstElementChild);
      }
    }
  }

  /**
   * Add a column to the left or right of the current column.
   * @param {string} position Either 'left' or 'right'.
   */
  function addColumn(position) {
    const selection = document.getSelection();
    if (!selection.anchorNode) return;
    const cell = getCurrentCell(selection.anchorNode);
    if (!cell) return;
    const cellIndex = getCellIndex(cell);
    const table = getCurrentTable(cell);
    const rows = getAllRows(table);
    rows.forEach(row => {
      const refCell = row.children[cellIndex];
      if (!refCell) return;
      const tagName = refCell.tagName.toLowerCase();
      const newCell = createCell(tagName);
      if (position === 'left') {
        refCell.before(newCell);
      } else {
        refCell.after(newCell);
      }
    });

    // Reset widths and refresh handles
    getAllRows(table).forEach(row => {
      Array.from(row.children).forEach(c => c.style.width = '');
    });
    addResizeHandles(table);
  }

  /**
   * Remove the current column. Deletes the table if only one column remains.
   */
  function removeColumn() {
    const selection = document.getSelection();
    if (!selection.anchorNode) return;
    const cell = getCurrentCell(selection.anchorNode);
    if (!cell) return;
    const cellIndex = getCellIndex(cell);
    const row = cell.parentNode;
    if (row.children.length <= 1) {
      deleteTable();
      return;
    }
    const table = getCurrentTable(cell);
    const rows = getAllRows(table);
    rows.forEach(r => {
      const cellToRemove = r.children[cellIndex];
      if (cellToRemove) cellToRemove.remove();
    });

    // Reset widths and refresh handles
    getAllRows(table).forEach(r => {
      Array.from(r.children).forEach(c => c.style.width = '');
    });
    addResizeHandles(table);
    const targetCell = row.children[cellIndex] || row.children[cellIndex - 1];
    if (targetCell) focusCell(targetCell);
  }

  /**
   * Delete the entire table and replace with an empty paragraph.
   */
  function deleteTable() {
    const selection = document.getSelection();
    if (!selection.anchorNode) return;
    const table = getCurrentTable(selection.anchorNode);
    if (!table) return;
    const p = createElement('p');
    p.appendChild(createElement('br'));
    table.replaceWith(p);
    focusCell(p);
  }

  // ============ MARKDOWN TABLE PARSING ============

  const separatorRegex = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/;

  /**
   * Check if a text string is a markdown table.
   * @param {string} text The text to check.
   * @return {boolean} True if the text is a markdown table.
   */
  function isMarkdownTable(text) {
    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return false;
    const separatorIndex = lines.findIndex(line => separatorRegex.test(line));
    if (separatorIndex < 1) return false;

    // All non-separator lines should contain pipes
    const nonSeparatorLines = lines.filter((_, i) => i !== separatorIndex);
    return nonSeparatorLines.every(line => line.includes('|'));
  }

  /**
   * Convert a markdown table string to an HTML table.
   * @param {string} text The markdown table text.
   * @return {string} An HTML table string.
   */
  function parseMarkdownTable(text) {
    const lines = text.trim().split('\n').filter(line => line.trim() !== '');
    const separatorIndex = lines.findIndex(line => separatorRegex.test(line));
    if (separatorIndex === -1) return '';
    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function parseCells(line) {
      let cells = line.split('|');
      if (cells[0].trim() === '') cells.shift();
      if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();
      return cells.map(c => escapeHtml(c.trim()));
    }
    const headerLines = lines.slice(0, separatorIndex);
    const bodyLines = lines.slice(separatorIndex + 1);
    let html = '<table>';
    if (headerLines.length > 0) {
      html += '<thead>';
      headerLines.forEach(line => {
        const cells = parseCells(line);
        html += '<tr>' + cells.map(c => "<th>" + (c || '<br>') + "</th>").join('') + '</tr>';
      });
      html += '</thead>';
    }
    if (bodyLines.length > 0) {
      html += '<tbody>';
      bodyLines.forEach(line => {
        const cells = parseCells(line);
        html += '<tr>' + cells.map(c => "<td>" + (c || '<br>') + "</td>").join('') + '</tr>';
      });
      html += '</tbody>';
    }
    html += '</table>';
    return html;
  }

  // ============ COLUMN RESIZING ============

  let resizeState$1 = null;

  /**
   * Add resize handles to all cells in the first row of a table.
   * @param {object} table The table element.
   */
  function addResizeHandles(table) {
    // Remove existing handles
    table.querySelectorAll('.wysi-col-resize').forEach(el => el.remove());
    const firstRow = table.querySelector('tr');
    if (!firstRow) return;
    Array.from(firstRow.children).forEach(cell => {
      const handle = createElement('span', {
        class: 'wysi-col-resize'
      });
      handle.contentEditable = 'false';
      cell.appendChild(handle);
    });
  }

  /**
   * Add resize handles to all tables in an editor.
   * @param {object} editor The editor element.
   */
  function addResizeHandlesToAll(editor) {
    editor.querySelectorAll('table').forEach(addResizeHandles);
  }

  /**
   * Apply percentage widths to all cells in the first row based on current sizes.
   * @param {object} table The table element.
   */
  function initColumnWidths(table) {
    const firstRow = table.querySelector('tr');
    if (!firstRow) return;
    const cells = Array.from(firstRow.children);
    // Only initialize if no widths are set yet
    if (cells.some(c => c.style.width)) return;
    const tableWidth = table.offsetWidth;
    if (!tableWidth) return;
    cells.forEach(cell => {
      const pct = (cell.offsetWidth / tableWidth * 100).toFixed(2);
      cell.style.width = pct + '%';
    });
  }

  /**
   * Set widths on all cells in a column.
   * @param {object} table The table element.
   * @param {number} colIndex The column index.
   * @param {string} width The CSS width value.
   */
  function setColumnWidth(table, colIndex, width) {
    getAllRows(table).forEach(row => {
      const cell = row.children[colIndex];
      if (cell) cell.style.width = width;
    });
  }

  // Mouse down on resize handle
  addListener(document, 'mousedown', '.wysi-col-resize', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const handle = event.target;
    const cell = handle.parentNode;
    const table = getCurrentTable(cell);
    if (!table) return;
    const colIndex = getCellIndex(cell);
    const nextCell = cell.nextElementSibling;
    if (!nextCell) return; // Don't resize last column directly

    // Initialize widths if needed
    initColumnWidths(table);
    const tableWidth = table.offsetWidth;
    const startX = event.clientX;
    const startWidthPct = parseFloat(cell.style.width);
    const nextWidthPct = parseFloat(nextCell.style.width);
    resizeState$1 = {
      table,
      colIndex,
      tableWidth,
      startX,
      startWidthPct,
      nextWidthPct
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    handle.classList.add('wysi-col-resize-active');
  });
  addListener(document, 'mousemove', event => {
    if (!resizeState$1) return;
    event.preventDefault();
    const _resizeState = resizeState$1,
      table = _resizeState.table,
      colIndex = _resizeState.colIndex,
      tableWidth = _resizeState.tableWidth,
      startX = _resizeState.startX,
      startWidthPct = _resizeState.startWidthPct,
      nextWidthPct = _resizeState.nextWidthPct;
    const dx = event.clientX - startX;
    const dxPct = dx / tableWidth * 100;
    const minPct = 3; // minimum column width %
    let newPct = startWidthPct + dxPct;
    let newNextPct = nextWidthPct - dxPct;
    if (newPct < minPct) {
      newPct = minPct;
      newNextPct = startWidthPct + nextWidthPct - minPct;
    }
    if (newNextPct < minPct) {
      newNextPct = minPct;
      newPct = startWidthPct + nextWidthPct - minPct;
    }
    setColumnWidth(table, colIndex, newPct.toFixed(2) + '%');
    setColumnWidth(table, colIndex + 1, newNextPct.toFixed(2) + '%');
  });
  addListener(document, 'mouseup', event => {
    if (!resizeState$1) return;
    const _resizeState2 = resizeState$1,
      table = _resizeState2.table;

    // Sync editor
    const _findInstance = findInstance(table),
      editor = _findInstance.editor;
    syncEditor(editor);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.querySelectorAll('.wysi-col-resize-active').forEach(el => el.classList.remove('wysi-col-resize-active'));
    resizeState$1 = null;
  });

  // ============ TABLE MENU UI ============

  /**
   * Render the table toolbar tool (button + dropdown menu).
   * @return {object} A DOM element containing the table tool.
   */
  function renderTableTool() {
    const label = getTranslation('table', toolset.table.label);
    const wrapper = createElement('div', {
      class: 'wysi-table-menu'
    });
    const button = createElement('button', {
      type: 'button',
      title: label,
      'aria-label': label,
      'aria-pressed': false,
      'aria-haspopup': true,
      'aria-expanded': false,
      'data-action': 'table',
      _innerHTML: '<svg><use href="#wysi-table"></use></svg>'
    });
    const menu = createElement('div', {
      tabindex: -1
    });
    wrapper.appendChild(button);
    wrapper.appendChild(menu);
    return wrapper;
  }

  /**
   * Populate the table menu in insert mode (rows/cols form).
   * @param {object} container The menu container div.
   */
  function populateInsertMode(container) {
    const rowsLabel = createElement('label');
    rowsLabel.appendChild(createElement('span', {
      _textContent: getTranslation('table', 'Rows')
    }));
    rowsLabel.appendChild(createElement('input', {
      type: 'number',
      min: 1,
      max: 20,
      value: 3,
      'data-field': 'rows'
    }));
    const colsLabel = createElement('label');
    colsLabel.appendChild(createElement('span', {
      _textContent: getTranslation('table', 'Columns')
    }));
    colsLabel.appendChild(createElement('input', {
      type: 'number',
      min: 1,
      max: 20,
      value: 3,
      'data-field': 'cols'
    }));
    const actions = createElement('div', {
      class: 'wysi-table-insert-actions'
    });
    actions.appendChild(createElement('button', {
      type: 'button',
      _textContent: getTranslation('popover', 'Cancel')
    }));
    actions.appendChild(createElement('button', {
      type: 'button',
      'data-action': 'insertTable',
      _textContent: getTranslation('table', 'Insert')
    }));
    const headerLabel = createElement('label');
    headerLabel.appendChild(createElement('span', {
      _textContent: getTranslation('table', 'Header row')
    }));
    headerLabel.appendChild(createElement('input', {
      type: 'checkbox',
      checked: true,
      'data-field': 'header'
    }));
    container.appendChild(rowsLabel);
    container.appendChild(colsLabel);
    container.appendChild(headerLabel);
    container.appendChild(actions);
  }

  /**
   * Populate the table menu in operations mode (action buttons).
   * @param {object} container The menu container div.
   */
  function populateOperationsMode(container) {
    const items = [{
      action: 'tableAddRowAbove',
      label: 'Add row above'
    }, {
      action: 'tableAddRowBelow',
      label: 'Add row below'
    }, {
      action: 'tableRemoveRow',
      label: 'Delete row'
    }, {
      separator: true
    }, {
      action: 'tableAddColLeft',
      label: 'Add column left'
    }, {
      action: 'tableAddColRight',
      label: 'Add column right'
    }, {
      action: 'tableRemoveCol',
      label: 'Delete column'
    }, {
      separator: true
    }, {
      action: 'tableDelete',
      label: 'Delete table'
    }];
    items.forEach(item => {
      if (item.separator) {
        container.appendChild(createElement('hr'));
      } else {
        container.appendChild(createElement('button', {
          type: 'button',
          'data-action': item.action,
          _textContent: getTranslation('table', item.label)
        }));
      }
    });
  }

  /**
   * Open the table menu.
   * @param {object} button The table menu button.
   */
  function openTableMenu(button) {
    const selection = document.getSelection();
    const anchorNode = selection.anchorNode;

    // Save current selection for later restore
    if (selection.rangeCount) {
      tableMenuSelection = selection.getRangeAt(0).cloneRange();
    }

    // Check if cursor is inside a table cell
    const cell = anchorNode ? getCurrentCell(anchorNode) : null;

    // Populate menu based on context
    const menuContent = button.nextElementSibling;
    menuContent.innerHTML = '';
    if (cell) {
      populateOperationsMode(menuContent);
    } else {
      populateInsertMode(menuContent);
    }

    // Open the menu
    toggleButton(button, true);

    // Focus the first interactive element
    const firstFocusable = menuContent.querySelector('input, button');
    if (firstFocusable) firstFocusable.focus();
  }

  /**
   * Close the table menu if open.
   */
  function closeTableMenu() {
    const button = document.querySelector('.wysi-table-menu [aria-expanded="true"]');
    if (button) {
      toggleButton(button, false);
    }
  }

  /**
   * Execute a table menu action.
   * @param {string} action The action name.
   * @param {object} editor The editor element.
   */
  function execTableAction(action, editor) {
    // Focus editor first
    if (editor) editor.focus();

    // Restore saved selection
    if (tableMenuSelection) {
      const selection = document.getSelection();
      selection.removeAllRanges();
      selection.addRange(tableMenuSelection);
      tableMenuSelection = null;
    }
    switch (action) {
      case 'insertTable':
        {
          const menu = document.querySelector('.wysi-table-menu > div');
          const rows = parseInt(menu.querySelector('[data-field="rows"]').value) || 3;
          const cols = parseInt(menu.querySelector('[data-field="cols"]').value) || 3;
          const header = menu.querySelector('[data-field="header"]').checked;
          insertTable(rows, cols, header);
          break;
        }
      case 'tableAddRowAbove':
        addRow('above');
        break;
      case 'tableAddRowBelow':
        addRow('below');
        break;
      case 'tableRemoveRow':
        removeRow();
        break;
      case 'tableAddColLeft':
        addColumn('left');
        break;
      case 'tableAddColRight':
        addColumn('right');
        break;
      case 'tableRemoveCol':
        removeColumn();
        break;
      case 'tableDelete':
        deleteTable();
        break;
    }

    // Sync editor content to textarea
    syncEditor(editor);
  }

  // ============ CONTEXT MENU ============

  let contextMenu = null;
  let contextMenuEditor = null;
  function closeContextMenu() {
    if (contextMenu && contextMenu.parentNode) {
      contextMenu.remove();
    }
    contextMenu = null;
    contextMenuEditor = null;
  }

  // Right-click inside a table cell
  addListener(document, 'contextmenu', '.wysi-editor td, .wysi-editor th', event => {
    const cell = getCurrentCell(event.target);
    if (!cell) return;
    event.preventDefault();
    closeContextMenu();
    closeTableMenu();

    // Save selection
    const selection = document.getSelection();
    if (selection.rangeCount) {
      tableMenuSelection = selection.getRangeAt(0).cloneRange();
    }
    const _findInstance2 = findInstance(cell),
      editor = _findInstance2.editor;
    contextMenuEditor = editor;

    // Create menu
    contextMenu = createElement('div', {
      class: 'wysi-table-ctx'
    });
    populateOperationsMode(contextMenu);

    // Position at click using fixed positioning
    contextMenu.style.left = event.clientX + 'px';
    contextMenu.style.top = event.clientY + 'px';
    document.body.appendChild(contextMenu);
  });

  // Execute action from context menu
  addListener(document, 'click', '.wysi-table-ctx button[data-action]', event => {
    const action = event.target.dataset.action;
    execTableAction(action, contextMenuEditor);
    closeContextMenu();
  });

  // Close context menu on outside click or escape
  addListener(document, 'mousedown', event => {
    if (contextMenu && !contextMenu.contains(event.target)) {
      closeContextMenu();
    }
  });
  addListener(document, 'keydown', event => {
    if (event.key === 'Escape' && contextMenu) {
      closeContextMenu();
    }
  });

  // ============ EVENT LISTENERS ============

  // Open/close table menu on button click
  addListener(document, 'click', '.wysi-table-menu > button', event => {
    const button = event.target;
    const wasOpen = button.getAttribute('aria-expanded') === 'true';
    closeTableMenu();
    if (!wasOpen) {
      openTableMenu(button);
    }
  });

  // Keyboard open for table menu button
  addListener(document, 'keydown', '.wysi-table-menu > button', event => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        closeTableMenu();
        openTableMenu(event.target);
        event.preventDefault();
        break;
    }
  });

  // Execute action from menu
  addListener(document, 'click', '.wysi-table-menu > div button[data-action]', event => {
    const _findInstance3 = findInstance(event.target),
      editor = _findInstance3.editor;
    execTableAction(event.target.dataset.action, editor);
    closeTableMenu();
  });

  // Cancel button in menu
  addListener(document, 'click', '.wysi-table-menu > div button:not([data-action])', event => {
    closeTableMenu();
  });

  // Stop propagation on non-button clicks inside menu (keep menu open)
  addListener(document, 'click', '.wysi-table-menu *:not(button)', event => {
    event.stopImmediatePropagation();
  });

  // Keyboard navigation inside the menu
  addListener(document, 'keydown', '.wysi-table-menu > div *', event => {
    switch (event.key) {
      case 'Escape':
        closeTableMenu();
        event.stopImmediatePropagation();
        break;
      case 'Enter':
        if (event.target.tagName === 'INPUT') {
          const insertButton = event.target.closest('.wysi-table-menu > div').querySelector('[data-action="insertTable"]');
          if (insertButton) insertButton.click();
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        break;
      case 'Tab':
        {
          const container = event.target.closest('.wysi-table-menu > div');
          const focusable = container.querySelectorAll('input, button');
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && event.target === first) {
            last.focus();
            event.preventDefault();
          } else if (!event.shiftKey && event.target === last) {
            first.focus();
            event.preventDefault();
          }
          event.stopImmediatePropagation();
          break;
        }
    }
  });

  // Close menu on outside click
  addListener(document, 'mousedown', '.wysi-table-menu > button', () => {
    isTableMenuOpening = true;
  });
  addListener(document, 'mouseup', () => {
    setTimeout(() => {
      isTableMenuOpening = false;
    });
  });
  addListener(document, 'click', event => {
    if (!isTableMenuOpening) {
      closeTableMenu();
    }
  });

  // Tab key navigation inside tables
  addListener(document, 'keydown', event => {
    if (event.key !== 'Tab') return;

    // Don't interfere with table menu
    if (event.target.closest && event.target.closest('.wysi-table-menu')) return;
    const selection = document.getSelection();
    if (!selection.anchorNode) return;
    const _findInstance4 = findInstance(selection.anchorNode),
      editor = _findInstance4.editor;
    if (!editor) return;
    const cell = getCurrentCell(selection.anchorNode);
    if (!cell) return;
    event.preventDefault();
    const row = cell.parentNode;
    if (event.shiftKey) {
      // Move to previous cell
      const prevCell = cell.previousElementSibling;
      if (prevCell) {
        focusCell(prevCell);
      } else {
        const prevRow = row.previousElementSibling;
        if (prevRow && prevRow.lastElementChild) {
          focusCell(prevRow.lastElementChild);
        }
      }
    } else {
      // Move to next cell
      const nextCell = cell.nextElementSibling;
      if (nextCell) {
        focusCell(nextCell);
      } else {
        const nextRow = row.nextElementSibling;
        if (nextRow && nextRow.firstElementChild) {
          focusCell(nextRow.firstElementChild);
        } else {
          // Last cell — add a new row and move to it
          addRow('below');
          const newRow = row.nextElementSibling;
          if (newRow && newRow.firstElementChild) {
            focusCell(newRow.firstElementChild);
          }
          syncEditor(editor);
        }
      }
    }
  });

  /**
   * Render the toolbar.
   * @param {array} tools The list of tools in the toolbar.
   * @return {string} The toolbars HTML string.
   */
  function renderToolbar(tools) {
    const toolbar = createElement('div', {
      class: 'wysi-toolbar'
    });

    // Generate toolbar buttons
    tools.forEach(toolName => {
      switch (toolName) {
        // Toolbar separator
        case '|':
          toolbar.appendChild(createElement('div', {
            class: 'wysi-separator'
          }));
          break;

        // Toolbar new line
        case '-':
          toolbar.appendChild(createElement('div', {
            class: 'wysi-newline'
          }));
          break;

        // The format tool renders as a list box
        case 'format':
          toolbar.appendChild(renderFormatTool());
          break;

        // The table tool renders with its own menu
        case 'table':
          toolbar.appendChild(renderTableTool());
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
      _innerHTML: "<svg><use href=\"#wysi-" + name + "\"></use></svg>"
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
      return {
        label,
        icon,
        action
      };
    });
    return renderListBox({
      label,
      items
    });
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
      const label = tag === 'p' ? paragraphLabel : headingLabel + " " + tag.substring(1);
      const action = 'format';
      return {
        name,
        label,
        action
      };
    });
    return renderListBox({
      label,
      items,
      classes
    });
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
    const _findInstance = findInstance(selectedNode),
      toolbar = _findInstance.toolbar,
      editor = _findInstance.editor,
      nodes = _findInstance.nodes;
    const tags = nodes.map(node => node.tagName.toLowerCase());

    // Abort if the selection is not within an editor instance
    if (!editor) {
      return;
    }

    // Check for an element with the selection class (likely an image)
    const selectedObject = editor.querySelector("." + selectedClass);

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
          const format = toolbar.querySelector("[data-action=\"format\"][data-option=\"" + tag + "\"]");
          const textAlign = nodes[i].style.textAlign || nodes[i].getAttribute('align');
          if (format) {
            selectListBoxItem(format);
          }

          // Check for text align
          if (textAlign) {
            const action = 'align' + textAlign.charAt(0).toUpperCase() + textAlign.slice(1);
            const button = toolbar.querySelector("[data-action=\"" + action + "\"]");
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
            const button = toolbar.querySelector("[data-action=\"" + action + "\"]");
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
    const icons = '<svg id="wysi-svg-icons" xmlns="http://www.w3.org/2000/svg"><defs><symbol id="wysi-bold" viewBox="0 0 24 24"><path d="M16.5,9.5A3.5,3.5,0,0,0,13,6H8.5a1,1,0,0,0-1,1V17a1,1,0,0,0,1,1H13a3.49,3.49,0,0,0,2.44-6A3.5,3.5,0,0,0,16.5,9.5ZM13,16H9.5V13H13a1.5,1.5,0,0,1,0,3Zm0-5H9.5V8H13a1.5,1.5,0,0,1,0,3Z"></path></symbol><symbol id="wysi-italic" viewBox="0 0 24 24"><path d="M17,6H11a1,1,0,0,0,0,2h1.52l-3.2,8H7a1,1,0,0,0,0,2h6a1,1,0,0,0,0-2H11.48l3.2-8H17a1,1,0,0,0,0-2Z"></path></symbol><symbol id="wysi-underline" viewBox="0 0 24 24"><path d="M12,15.5a5,5,0,0,0,5-5v-5a1,1,0,0,0-2,0v5a3,3,0,0,1-6,0v-5a1,1,0,0,0-2,0v5A5,5,0,0,0,12,15.5Zm5,2H7a1,1,0,0,0,0,2H17a1,1,0,0,0,0-2Z"></path></symbol><symbol id="wysi-strike" viewBox="0 0 24 24"><path d="M12 6C9.33 6 7.5 7.34 7.5 9.5c0 .58.12 1.07.35 1.5H13c-1.49-.34-3.49-.48-3.5-1.5 0-1.03 1.08-1.75 2.5-1.75s2.5.83 2.5 1.75h2C16.5 7.4 14.67 6 12 6zm-5.5 6c-.67 0-.67 1 0 1h4.35c.5.17 1.04.34 1.65.5.58.15 1.75.23 1.75 1s-.66 1.75-2.25 1.75-2.5-1.01-2.5-1.75h-2c0 1.64 1.33 3.5 4.5 3.5s4.5-2.08 4.5-3.5c0-.58-.05-1.07-.2-1.5h1.2c.67 0 .67-1 0-1z"></path></symbol><symbol id="wysi-alignLeft" viewBox="0 0 24 24"><path d="m4 8h16c1.33 0 1.33-2 0-2h-16c-1.33 0-1.33 2 0 2zm0 5h12c1.33 0 1.33-2 0-2h-12c-1.33 0-1.33 2 0 2zm16 3h-16c-1.33 0-1.33 2 0 2h16c1.34 0 1.29-2 0-2z"></path></symbol><symbol id="wysi-alignCenter" viewBox="0 0 24 24"><path d="m20 8h-16c-1.33 0-1.33-2 0-2h16c1.33 0 1.33 2 0 2zm-4 5h-8c-1.33 0-1.33-2 0-2h8c1.33 0 1.33 2 0 2zm-12 3h16c1.33 0 1.33 2 0 2h-16c-1.34 0-1.29-2 0-2z"></path></symbol><symbol id="wysi-alignRight" viewBox="0 0 24 24"><path d="m20 8h-16c-1.33 0-1.33-2 0-2h16c1.33 0 1.33 2 0 2zm0 5h-12c-1.33 0-1.33-2 0-2h12c1.33 0 1.33 2 0 2zm-16 3h16c1.33 0 1.33 2 0 2h-16c-1.34 0-1.29-2 0-2z"></path></symbol><symbol id="wysi-alignJustify" viewBox="0 0 24 24"><path d="m20 8h-16c-1.33 0-1.33-2 0-2h16c1.33 0 1.33 2 0 2zm0 5h-16c-1.33 0-1.33-2 0-2h16c1.33 0 1.33 2 0 2zm-16 3h16c1.33 0 1.33 2 0 2h-16c-1.34 0-1.29-2 0-2z"></path></symbol><symbol id="wysi-ul" viewBox="0 0 24 24"><path d="M3 6a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1zm4 0a1 1 0 0 0 0 2h14a1 1 0 0 0 0-2H7zm-4 5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1zm4 0a1 1 0 0 0 0 2h14a1 1 0 0 0 0-2H7zm-4 5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1zm4 0a1 1 0 0 0 0 2h14a1 1 0 0 0 0-2H7z"></path></symbol><symbol id="wysi-ol" viewBox="0 0 24 24"><path d="M4 5c-.25 0-.5.17-.5.5v3c0 .67 1 .67 1 0v-3c0-.33-.25-.5-.5-.5zm4.5 1c-1.33 0-1.33 2 0 2h12c1.33 0 1.33-2 0-2zm-6 5.5h.75c0-.43.34-.75.75-.75.4 0 .75.28.75.75L2.5 13.25V14h3v-.75H3.75L5.5 12v-.5c0-.9-.73-1.49-1.5-1.5-.77 0-1.5.59-1.5 1.5zm6-.5c-1.33 0-1.33 2 0 2h12c1.33 0 1.33-2 0-2zM4 15c-.83 0-1.5.63-1.5 1.25h.75c0-.28.34-.5.75-.5s.75.22.75.5-.34.5-.75.5v.5c.41 0 .75.22.75.5s-.34.5-.75.5-.75-.22-.75-.5H2.5c0 .62.67 1.25 1.5 1.25s1.5-.5 1.5-1.12c0-.34-.2-.66-.56-.88.35-.2.56-.53.56-.87 0-.62-.67-1.12-1.5-1.12zm4.5 1c-1.33 0-1.33 2 0 2h12c1.33 0 1.33-2 0-2z"></path></symbol><symbol id="wysi-indent" viewBox="0 0 24 24"><path d="m20 8h-15.9c-1.33 0-1.33-2 0-2h15.9c1.33 0 1.33 2 0 2zm2.86e-4 5h-9.08c-1.33 0-1.33-2 0-2h9.08c1.33 0 1.33 2 0 2zm-16.7-3.31c0.356-0.423 0.988-0.477 1.41-0.12l2 1.66c0.483 0.4 0.483 1.14 0 1.54l-2 1.66c-0.179 0.153-0.405 0.238-0.64 0.24-0.297 4.83e-4 -0.58-0.131-0.77-0.36-0.354-0.425-0.296-1.06 0.13-1.41l1.08-0.9-1.08-0.9c-0.426-0.353-0.484-0.985-0.13-1.41zm0.77 6.31h15.9c1.33 0 1.33 2 0 2h-15.9c-1.33 0-1.33-2 0-2z"></path></symbol><symbol id="wysi-outdent" viewBox="0 0 24 24"><path d="m4.1 6c-1.33 0-1.33 2 0 2h15.9c1.33 0 1.33-2 0-2h-15.9zm1.96 3.33c-0.224 0.00238-0.448 0.0803-0.633 0.236l-2 1.66c-0.483 0.4-0.483 1.14 0 1.54l2 1.66c0.179 0.153 0.404 0.238 0.639 0.24 0.297 4.83e-4 0.581-0.131 0.771-0.359 0.354-0.425 0.295-1.06-0.131-1.41l-1.08-0.9 1.08-0.9c0.426-0.353 0.485-0.985 0.131-1.41-0.2-0.238-0.489-0.359-0.777-0.355zm4.88 1.67c-1.33 0-1.33 2 0 2h9.08c1.33 0 1.33-2 0-2h-9.08zm-6.87 5c-1.33 0-1.33 2 0 2h15.9c1.33 0 1.33-2 0-2h-15.9z"></path></symbol><symbol id="wysi-link" viewBox="0 0 24 24"><path d="M8,12a1,1,0,0,0,1,1h6a1,1,0,0,0,0-2H9A1,1,0,0,0,8,12Zm2,3H7A3,3,0,0,1,7,9h3a1,1,0,0,0,0-2H7A5,5,0,0,0,7,17h3a1,1,0,0,0,0-2Zm7-8H14a1,1,0,0,0,0,2h3a3,3,0,0,1,0,6H14a1,1,0,0,0,0,2h3A5,5,0,0,0,17,7Z"></path></symbol><symbol id="wysi-image" viewBox="0 0 24 24"><path d="M6 5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6zm0 2h12a1 1 0 0 1 1 1v5.73l-.88-.88a3.06 3.06 0 0 0-4.24 0l-.88.88-2.88-2.88A3.06 3.06 0 0 0 8 10a3.06 3.06 0 0 0-2.12.85l-.88.88V8a1 1 0 0 1 1-1zm1.85 4.98a1 1 0 0 1 .85.27L13.45 17H6a1 1 0 0 1-.98-.92H5v-1.53l2.3-2.3a1 1 0 0 1 .55-.26zm8 2a1 1 0 0 1 .85.27l2.17 2.16c-.19.33-.55.59-.86.59h-1.72l-1.86-1.87.88-.88a1 1 0 0 1 .54-.28z"></path></symbol><symbol id="wysi-quote" viewBox="0 0 24 24"><path d="m9 6c-2.2 0-4 1.96-4 4.36v6c0 0.903 0.672 1.64 1.5 1.64h3c0.828 0 1.5-0.733 1.5-1.64v-3.27c0-0.903-0.672-1.64-1.5-1.64h-1.75c-0.414 0-0.75-0.367-0.75-0.818v-0.273c0-1.2 0.899-2.18 2-2.18h0.5c0.274 0 0.5-0.246 0.5-0.545v-1.09c0-0.298-0.226-0.545-0.5-0.545zm8 0c-2.2 0-4 1.96-4 4.36v6c0 0.903 0.672 1.64 1.5 1.64h3c0.828 0 1.5-0.733 1.5-1.64v-3.27c0-0.903-0.672-1.64-1.5-1.64h-1.75c-0.414 0-0.75-0.367-0.75-0.818v-0.273c0-1.2 0.899-2.18 2-2.18h0.5c0.274 0 0.5-0.246 0.5-0.545v-1.09c0-0.298-0.226-0.545-0.5-0.545z"></path></symbol><symbol id="wysi-hr" viewBox="0 0 24 24"><path d="m20 11h-16c-1.33 0-1.33 2 0 2 0 0 16-0.018 16 0 1.33 0 1.33-2 0-2z"></path></symbol><symbol id="wysi-removeFormat" viewBox="0 0 24 24"><path d="M7 6C5.67 6 5.67 8 7 8h3l-2 7c0 .02 2 0 2 0l2-7h3c1.33 0 1.33-2 0-2H7zm7.06 7c-.79-.04-1.49.98-.75 1.72l.78.78-.78.79c-.94.93.47 2.35 1.4 1.4l.79-.78.78.79c.94.93 2.35-.47 1.41-1.41l-.78-.79.78-.78c.94-.94-.47-2.35-1.4-1.41l-.8.79-.77-.79a.99.99 0 0 0-.66-.3zM7 16c-1.33 0-1.33 2 0 2 .02-.02 4 0 4 0 1.33 0 1.33-2 0-2H7z"></path></symbol><symbol id="wysi-table" viewBox="0 0 24 24"><path d="M5 4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H5zm0 2h14v3H5V6zm0 5h4v3H5v-3zm6 0h3v3h-3v-3zm5 0h3v3h-3v-3zM5 16h4v2H5v-2zm6 0h3v2h-3v-2zm5 0h3v2h-3v-2z"></path></symbol><symbol id="wysi-delete" viewBox="0 0 24 24"><path d="M10,18a1,1,0,0,0,1-1V11a1,1,0,0,0-2,0v6A1,1,0,0,0,10,18ZM20,6H16V5a3,3,0,0,0-3-3H11A3,3,0,0,0,8,5V6H4A1,1,0,0,0,4,8H5V19a3,3,0,0,0,3,3h8a3,3,0,0,0,3-3V8h1a1,1,0,0,0,0-2ZM10,5a1,1,0,0,1,1-1h2a1,1,0,0,1,1,1V6H10Zm7,14a1,1,0,0,1-1,1H8a1,1,0,0,1-1-1V8H17Zm-3-1a1,1,0,0,0,1-1V11a1,1,0,0,0-2,0v6A1,1,0,0,0,14,18Z"></path></symbol></defs></svg>';
    const svgElement = buildFragment(icons);
    document.body.appendChild(svgElement);
  }

  // Deselect selected element when clicking outside
  addListener(document, 'mousedown', '.wysi-editor, .wysi-editor *', event => {
    const selected = document.querySelector("." + selectedClass);
    if (selected && selected !== event.target) {
      selected.classList.remove(selectedClass);
    }
  });

  // Drag-to-resize images from the bottom-right corner
  let resizeState = null;
  const CORNER_SIZE = 16;
  function isNearCorner(event, image) {
    const rect = image.getBoundingClientRect();
    return rect.right - event.clientX < CORNER_SIZE && rect.bottom - event.clientY < CORNER_SIZE;
  }

  // Show resize cursor when hovering near bottom-right corner of a selected image
  addListener(document, 'mousemove', '.wysi-editor img', event => {
    const image = event.target;
    image.style.cursor = image.classList.contains(selectedClass) && isNearCorner(event, image) ? 'nwse-resize' : '';
  });

  // Start resize if mousedown on corner of selected image
  addListener(document, 'mousedown', '.wysi-editor img', event => {
    const image = event.target;
    if (image.classList.contains(selectedClass) && isNearCorner(event, image)) {
      event.preventDefault();
      document.getSelection().removeAllRanges();
      resizeState = {
        image,
        startW: image.offsetWidth,
        startX: event.clientX
      };
      return;
    }

    // Normal image selection
    const range = document.createRange();
    image.classList.add(selectedClass);
    range.setStartAfter(image);
    range.collapse(true);
    setSelection(range);
  });
  addListener(document, 'mousemove', event => {
    if (!resizeState) return;
    event.preventDefault();
    const _resizeState = resizeState,
      image = _resizeState.image,
      startW = _resizeState.startW,
      startX = _resizeState.startX;
    let newW = Math.max(20, startW + event.clientX - startX);
    const editor = image.closest('.wysi-editor');
    if (editor) newW = Math.min(newW, editor.clientWidth);
    image.style.width = Math.round(newW) + "px";
    image.style.height = 'auto';
  });
  addListener(document, 'mouseup', () => {
    if (!resizeState) return;
    const _resizeState2 = resizeState,
      image = _resizeState2.image;
    resizeState = null;
    const editor = image.closest('.wysi-editor');
    if (editor) {
      editor.dispatchEvent(new Event('input', {
        bubbles: true
      }));
    }
  });

  // Toolbar button click
  addListener(document, 'click', '.wysi-toolbar > button', event => {
    const button = event.target;
    const action = button.dataset.action;
    const _findInstance2 = findInstance(button),
      editor = _findInstance2.editor;
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

  const STYLE_ATTRIBUTE = 'style';
  const ALIGN_ATTRIBUTE = 'align';

  /**
   * Enable HTML tags belonging to a set of tools.
   * @param {array} tools A array of tool objects.
   * @return {object} The list of allowed tags.
   */
  function enableTags(tools) {
    const allowedTags = cloneObject(settings.allowedTags);
    tools.forEach(toolName => {
      const tool = cloneObject(toolset[toolName]);
      if (!tool || !tool.tags) {
        return;
      }
      const isEmpty = !!tool.isEmpty;
      const extraTags = tool.extraTags || [];
      const aliasList = tool.alias || [];
      const alias = aliasList.length ? tool.tags[0] : undefined;
      const tags = [...tool.tags, ...extraTags, ...aliasList];
      const attributes = tool.attributes || [];
      const styles = tool.styles || [];
      tags.forEach(tag => {
        allowedTags[tag] = {
          attributes,
          styles,
          alias,
          isEmpty
        };
        if (!extraTags.includes(tag)) {
          allowedTags[tag].toolName = toolName;
        }
      });
    });
    return allowedTags;
  }

  /**
   * Prepare raw content for editing.
   * @param {string} content The raw content.
   * @param {array} allowedTags The list of allowed tags.
   * @param {boolean} filterOnly If true, only filter the content, without further cleaning.
   * @return {string} The filtered HTML content.
   */
  function prepareContent(content, allowedTags, filterOnly) {
    const container = createElement('div');
    const fragment = buildFragment(content);
    filterContent(fragment, allowedTags);
    if (!filterOnly) {
      wrapTextNodes(fragment);
      cleanContent(fragment, allowedTags);
    }
    container.appendChild(fragment);
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
        newElement.setAttribute(attributes[i].name, attributes[i].value);
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
    const styleAttribute = node.getAttribute(STYLE_ATTRIBUTE);
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

      // Remove text-align: left
      .filter(style => style.name !== 'text-align' || style.value.trim() !== 'left')

      // Only allow percentage- or pixel-based widths (keeps the size set in render mode / drag-resize)
      .filter(style => style.name !== 'width' || style.value && /(%|px)$/.test(style.value.trim()))

      // Convert back to a style string
      .map(_ref => {
        let name = _ref.name,
          value = _ref.value;
        return name + ": " + value.trim() + ";";
      }).join('');
      if (styles !== '') {
        node.setAttribute(STYLE_ATTRIBUTE, styles);
      } else {
        node.removeAttribute(STYLE_ATTRIBUTE);
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
        // Filter recursively (deeper nodes first)
        filterContent(childNode, allowedTags);

        // Check if the current element is allowed
        const tag = childNode.tagName.toLowerCase();
        const allowedTag = allowedTags[tag];
        const attributes = Array.from(childNode.attributes);

        // Check for the deprecated align attribute (mainly in Firefox)
        const deprecatedAlignAttribute = childNode.getAttribute(ALIGN_ATTRIBUTE);
        if (allowedTag) {
          const allowedAttributes = allowedTag.attributes || [];
          const allowedStyles = allowedTag.styles || [];

          // Remove attributes that are not allowed
          for (let i = 0; i < attributes.length; i++) {
            const attributeName = attributes[i].name;
            if (!allowedAttributes.includes(attributes[i].name)) {
              // Replace deprecated align attribute with text-align style
              if (attributeName === ALIGN_ATTRIBUTE) {
                if (deprecatedAlignAttribute !== 'left') {
                  childNode.style.textAlign = deprecatedAlignAttribute;
                }
              }
              if (attributeName === STYLE_ATTRIBUTE && allowedStyles.length) {
                filterStyles(childNode, allowedStyles);
              } else {
                childNode.removeAttribute(attributes[i].name);
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
            node.removeChild(childNode);

            // And unwrap the other nodes
          } else {
            // Fix bad alignment handling on Firefox
            if (deprecatedAlignAttribute !== null) {
              if (childNode.parentNode && childNode.parentNode.tagName === 'LI') {
                childNode.parentNode.style.textAlign = deprecatedAlignAttribute;
              } else {
                for (const divChild of childNode.childNodes) {
                  divChild.style.textAlign = deprecatedAlignAttribute;
                }
              }
            }
            childNode.replaceWith(...childNode.childNodes);
          }
        }

        // Remove comment nodes
      } else if (childNode.nodeType === 8) {
        node.removeChild(childNode);
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
        // Filter recursively (deeper nodes first)
        cleanContent(childNode, allowedTags);

        // Check if the element can be empty
        const tag = childNode.tagName.toLowerCase();
        const allowedTag = allowedTags[tag];
        const isTableCell = tag === 'td' || tag === 'th';
        if (allowedTag && !allowedTag.isEmpty && !isTableCell && trimText(childNode.innerHTML) === '') {
          node.removeChild(childNode);
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
    let appendToPrev = false;
    children.forEach(childNode => {
      if (childNode.nodeType !== 3 && blockElements.includes(childNode.tagName)) {
        appendToPrev = false;
        return;
      }

      // Remove empty text node
      /*if (trimText(childNode.textContent) === '') {
        node.removeChild(childNode);
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

  // Next available instance id
  let nextId = 0;

  /**
   * Init WYSIWYG editor instances.
   * @param {object} options Configuration options.
   */
  function init(options) {
    const globalTranslations = window.wysiGlobalTranslations || {};
    const translations = Object.assign({}, globalTranslations, options.translations || {});

    // Store translated strings
    storeTranslations(translations);
    const tools = options.tools || settings.tools;
    const selector = options.el || settings.el;
    const targetEls = getTargetElements(selector);
    const toolbar = renderToolbar(tools);
    const allowedTags = enableTags(tools);
    const customTags = options.customTags || [];

    // Add custom tags if any to the allowed tags list
    customTags.forEach(custom => {
      if (custom.tags) {
        const attributes = custom.attributes || [];
        const styles = custom.styles || [];
        const isEmpty = !!custom.isEmpty;
        custom.tags.forEach(tag => {
          allowedTags[tag] = {
            attributes,
            styles,
            isEmpty
          };
        });
      }
    });

    // Append an editor instance to target elements
    targetEls.forEach(field => {
      const sibling = field.previousElementSibling;
      if (!sibling || !hasClass(sibling, 'wysi-wrapper')) {
        const instanceId = nextId++;

        // Store the instance's options 
        instances[instanceId] = options;

        // Cache the list of allowed tags in the instance
        instances[instanceId].allowedTags = cloneObject(allowedTags);

        // Wrapper
        const wrapper = createElement('div', {
          class: 'wysi-wrapper'
        });

        // Editable region
        const editor = createElement('div', {
          class: 'wysi-editor',
          contenteditable: true,
          role: 'textbox',
          'aria-multiline': true,
          'aria-label': getTextAreaLabel(field),
          'data-wid': instanceId,
          _innerHTML: prepareContent(field.value, allowedTags)
        });

        // Insert the editor instance in the document
        wrapper.appendChild(toolbar.cloneNode(true));
        wrapper.appendChild(editor);
        field.before(wrapper);

        // Add column resize handles to existing tables
        addResizeHandlesToAll(editor);

        // Apply configuration
        configure(wrapper, options);

        // Reconfigure instance
      } else {
        configure(sibling, options);
      }
    });
  }

  /**
   * Configure a WYSIWYG editor instance.
   * @param {object} instance The editor instance to configure.
   * @param {object} options The configuration options.
   */
  function configure(instance, options) {
    if (typeof options !== 'object') {
      return;
    }
    for (const key in options) {
      switch (key) {
        case 'darkMode':
        case 'autoGrow':
        case 'autoHide':
          instance.classList.toggle("wysi-" + key.toLowerCase(), !!options[key]);
          break;
        case 'height':
          const height = options.height;
          if (!isNaN(height)) {
            const editor = instance.lastChild;
            editor.style.minHeight = height + "px";
            editor.style.maxHeight = height + "px";
          }
          break;
      }
    }
  }

  /**
   * Update the content of a WYSIWYG editor instance.
   * @param {object} textarea The textarea eleement.
   * @param {object} editor The editable region.
   * @param {string} instanceId The id of the instance.
   * @param {string} rawContent The new unfiltered content of the instance.
   * @param {boolean} setEditorContent Whether to update the content of the editable region.
   */
  function updateContent(textarea, editor, instanceId, rawContent, setEditorContent) {
    const instance = instances[instanceId];
    const content = prepareContent(rawContent, instance.allowedTags);
    const onChange = instance.onChange;
    if (setEditorContent === true) {
      editor.innerHTML = content;
      addResizeHandlesToAll(editor);
    }
    textarea.value = content;
    dispatchEvent(textarea, 'change');
    if (onChange) {
      onChange(content);
    }
  }

  /**
   * Destroy a WYSIWYG editor instance.
   * @param {string} selector One or more selectors pointing to textarea fields.
   */
  function destroy(selector) {
    const editorInstances = findEditorInstances(selector);
    for (const editorInstance of editorInstances) {
      const instanceId = editorInstance.instanceId,
        wrapper = editorInstance.wrapper;
      delete instances[instanceId];
      wrapper.remove();
    }
  }

  /**
   * Set the content of a WYSIWYG editor instance programmatically.
   * @param {string} selector One or more selectors pointing to textarea fields.
   */
  function setContent(selector, content) {
    const editorInstances = findEditorInstances(selector);
    for (const editorInstance of editorInstances) {
      const textarea = editorInstance.textarea,
        editor = editorInstance.editor,
        instanceId = editorInstance.instanceId;
      updateContent(textarea, editor, instanceId, content, true);
    }
  }

  /**
   * Clean up content before pasting it in an editor.
   * @param {object} event The browser's paste event.
   */
  function handlePastedImage(event) {
    const _findInstance = findInstance(event.target),
      editor = _findInstance.editor;
    const clipboardData = event.clipboardData;
    if (!editor || !clipboardData) return false;
    const imageFile = Array.from(clipboardData.files).find(f => f.type.startsWith('image/'));
    if (!imageFile) return false;
    event.preventDefault();
    const reader = new FileReader();
    reader.onload = () => {
      editor.focus();
      execCommand('insertHTML', "<img src=\"" + reader.result + "\" alt=\"\">");
    };
    reader.readAsDataURL(imageFile);
    return true;
  }
  function cleanPastedContent(event) {
    const _findInstance2 = findInstance(event.target),
      editor = _findInstance2.editor,
      nodes = _findInstance2.nodes;
    const clipboardData = event.clipboardData;
    if (handlePastedImage(event)) return;
    if (!editor) return;
    const instanceId = getInstanceId(editor);
    const allowedTags = instances[instanceId].allowedTags;
    if (clipboardData.types.includes('text/html')) {
      const pasted = clipboardData.getData('text/html');
      let content = prepareContent(pasted, allowedTags);

      // Detect a heading tag in the current selection
      const splitHeadingTag = nodes.filter(n => headingElements.includes(n.tagName)).length > 0;

      // Force split the heading tag if any.
      // This fixes a bug in Webkit/Blink browsers where the whole content is converted to a heading
      if (splitHeadingTag && !isFirefox) {
        const splitter = "<h1 class=\"" + placeholderClass + "\"><br></h1><p class=\"" + placeholderClass + "\"><br></p>";
        content = splitter + content + splitter;
      }

      // Manually paste the cleaned content
      execCommand('insertHTML', content);
      if (splitHeadingTag && !isFirefox) {
        // Remove placeholder elements if any
        editor.querySelectorAll("." + placeholderClass).forEach(fragment => {
          fragment.remove();
        });

        // Unwrap nested heading elements to fix a bug in Webkit/Blink browsers
        editor.querySelectorAll(headingElements.join()).forEach(heading => {
          const firstChild = heading.firstElementChild;
          if (firstChild && blockElements.includes(firstChild.tagName)) {
            heading.replaceWith(...heading.childNodes);
          }
        });
      }

      // Add resize handles to pasted tables
      addResizeHandlesToAll(editor);

      // Prevent the default paste action
      event.preventDefault();

      // Handle plain text paste — detect markdown tables
    } else if (allowedTags['table'] && clipboardData.types.includes('text/plain')) {
      const plainText = clipboardData.getData('text/plain');
      if (isMarkdownTable(plainText)) {
        const tableHtml = parseMarkdownTable(plainText);
        const content = prepareContent(tableHtml, allowedTags);
        execCommand('insertHTML', content);
        addResizeHandlesToAll(editor);
        event.preventDefault();
      }
    }
  }

  /**
   * Bootstrap the WYSIWYG editor.
   */
  function bootstrap() {
    // Configure editable regions
    execCommand('styleWithCSS', false);
    execCommand('enableObjectResizing', false);
    execCommand('enableInlineTableEditing', false);
    execCommand('defaultParagraphSeparator', 'p');

    // Update the textarea value when the editor's content changes
    addListener(document, 'input', '.wysi-editor', event => {
      const editor = event.target;
      const textarea = editor.parentNode.nextElementSibling;
      const instanceId = getInstanceId(editor);
      const content = editor.innerHTML;
      updateContent(textarea, editor, instanceId, content);
    });

    // Clean up pasted content
    addListener(document, 'paste', cleanPastedContent);
  }

  // Expose Wysi to the global scope
  window.Wysi = (() => {
    const methods = {
      destroy,
      setContent
    };
    function Wysi(options) {
      DOMReady(() => {
        init(options || {});
      });
    }
    for (const key in methods) {
      Wysi[key] = function () {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        DOMReady(methods[key], args);
      };
    }
    return Wysi;
  })();

  // Bootstrap Wysi when the DOM is ready
  DOMReady(bootstrap);

})(window, document);
