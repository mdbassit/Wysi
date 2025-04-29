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
    }, '|', 'ul', 'ol', '|', 'indent', 'outdent', '|', 'link', 'image'],
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
      attributes: [/*'id', 'name', */'href' /*'target', 'onclick'*/],
      attributeLabels: ['URL'],
      hasForm: true,
      label: 'Link'
    },
    image: {
      tags: ['img'],
      attributes: ['src', 'alt' /*, 'title'*/],
      attributeLabels: ['URL', 'Alternative text'],
      isEmpty: true,
      hasForm: true,
      label: 'Image'
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
  var instances = {};

  // The CSS class to use for selected elements
  var selectedClass = 'wysi-selected';

  // Placeholder elements CSS class
  var placeholderClass = 'wysi-fragment-placeholder';

  // Heading elements
  var headingElements = ['H1', 'H2', 'H3', 'H4'];

  // Block type HTML elements
  var blockElements = ['BLOCKQUOTE', 'HR', 'P', 'OL', 'UL'].concat(headingElements);

  // Detect Firefox browser
  var isFirefox = navigator.userAgent.search(/Gecko\//) > -1;

  // Shortcuts
  var dispatchEvent = function dispatchEvent(element, event) {
    return element.dispatchEvent(new Event(event, {
      bubbles: true
    }));
  };
  var execCommand = function execCommand(command, value) {
    if (value === void 0) {
      value = null;
    }
    return document.execCommand(command, false, value);
  };
  var hasClass = function hasClass(element, classes) {
    return element.classList && element.classList.contains(classes);
  };

  // Used to store the current DOM selection for later use
  var currentSelection;

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
      context.addEventListener(type, function (event) {
        var target = event.target;
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
    var template = createElement('template');
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
    var element = document.createElement(tag);
    if (attributes) {
      for (var attributeName in attributes) {
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
      fn.apply(void 0, args);
    } else {
      addListener(document, 'DOMContentLoaded', function () {
        fn.apply(void 0, args);
      });
    }
  }

  /**
   * Find the current editor instance.
   * @param {object} currentNode The possible child node of the editor instance.
   * @return {object} The instance's editable region and toolbar, and an array of nodes that lead to it.
   */
  function findInstance(currentNode) {
    var nodes = [];
    var ancestor, toolbar, editor;

    // Find all HTML tags between the current node and the editable ancestor
    while (currentNode && currentNode !== document.body) {
      var tag = currentNode.tagName;
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
      var children = ancestor.children;
      toolbar = children[0];
      editor = children[1];
    }
    return {
      toolbar: toolbar,
      editor: editor,
      nodes: nodes
    };
  }

  /**
   * Get an editor's instance id.
   * @param {object} editor The editor element.
   * @return {string} The instance id.
   */
  function getInstanceId(editor) {
    return editor.getAttribute('data-wid');
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
      return selector.filter(function (el) {
        return el instanceof Node;
      });
    }
    return [];
  }

  /**
   * Try to guess the textarea element's label if any.
   * @param {object} textarea The textarea element.
   * @return {string} The textarea element's label or an empty string.
   */
  function getTextAreaLabel(textarea) {
    var parent = textarea.parentNode;
    var id = textarea.id;
    var labelElement;

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
      var textNodes = [].filter.call(labelElement.childNodes, function (n) {
        return n.nodeType === 3;
      });
      var texts = textNodes.map(function (n) {
        return n.textContent.replace(/\s+/g, ' ').trim();
      });
      var label = texts.filter(function (l) {
        return l !== '';
      })[0];
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
    var selection = document.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
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
    var tool = toolset[action];
    if (tool) {
      var command = tool.command || action;

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
        execCommand('createLink', options[0]);
        break;

      // Images
      case 'image':
        var url = options[0],
          _options$ = options[1],
          text = _options$ === void 0 ? '' : _options$,
          original = options[2];
        var image = "<img src=\"" + url + "\" alt=\"" + text + "\" class=\"wysi-selected\">";
        var html = original ? original.replace(/<img[^>]+>/i, image) : image;
        execCommand('insertHTML', html);
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
    var label = details.label;
    var items = details.items;
    var firstItem = items[0];
    var classes = ['wysi-listbox'].concat(details.classes || []);

    // List box wrapper
    var listBox = createElement('div', {
      class: classes.join(' ')
    });

    // List box button
    var button = createElement('button', {
      type: 'button',
      title: label,
      'aria-label': label + " " + firstItem.label,
      'aria-haspopup': 'listbox',
      'aria-expanded': false,
      _innerHTML: renderListBoxItem(firstItem)
    });

    // List box menu
    var menu = createElement('div', {
      role: 'listbox',
      tabindex: -1,
      'aria-label': label
    });

    // List box items
    items.forEach(function (item) {
      var option = createElement('button', {
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
    var isOpen = button.getAttribute('aria-expanded') === 'true';
    var listBox = button.nextElementSibling;
    var selectedItem = listBox.querySelector('[aria-selected="true"]');
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
    var listBox = item.parentNode;
    var button = listBox.previousElementSibling;
    var selectedItem = listBox.querySelector('[aria-selected="true"]');
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
    var activeListBox = document.querySelector('.wysi-listbox [aria-expanded="true"]');
    if (activeListBox) {
      toggleButton(activeListBox, false);
    }
  }

  // list box button click
  addListener(document, 'click', '.wysi-listbox > button', function (event) {
    closeListBox();
    openListBox(event.target);
    event.stopImmediatePropagation();
  });

  // On key press on the list box button
  addListener(document, 'keydown', '.wysi-listbox > button', function (event) {
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
  addListener(document.documentElement, 'mousemove', '.wysi-listbox > div > button', function (event) {
    event.target.focus();
  });

  // On click on an list box item
  addListener(document, 'click', '.wysi-listbox > div > button', function (event) {
    var item = event.target;
    var action = item.getAttribute('data-action');
    var option = item.getAttribute('data-option');
    var _findInstance = findInstance(item),
      editor = _findInstance.editor;
    var selection = document.getSelection();
    if (selection && editor.contains(selection.anchorNode)) {
      execAction(action, editor, [option]);
    }
    selectListBoxItem(item);
  });

  // On key press on an item
  addListener(document, 'keydown', '.wysi-listbox > div > button', function (event) {
    var item = event.target;
    var listBox = item.parentNode;
    var button = listBox.previousElementSibling;
    var preventDefault = true;
    switch (event.key) {
      case 'ArrowUp':
        var prev = item.previousElementSibling;
        if (prev) {
          prev.focus();
        }
        break;
      case 'ArrowDown':
        var next = item.nextElementSibling;
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
    }
  });

  // Close open popups and dropdowns on click outside
  addListener(document, 'click', function (event) {
    closeListBox();
  });

  /**
   * Render a popover form to set a tool's parameters.
   * @param {string} toolName The tool name.
   * @param {object} button The tool's toolbar button.
   * @param {object} translations The labels translation object.
   * @return {object} A DOM element containing the button and the popover.
   */
  function renderPopover(toolName, button, translations) {
    var tool = toolset[toolName];
    var labels = tool.attributeLabels;
    var fields = tool.attributes.map(function (attribute, i) {
      return {
        name: attribute,
        label: translations[attribute] || labels[i]
      };
    });

    // Popover wrapper
    var wrapper = createElement('div', {
      class: 'wysi-popover'
    });

    // Popover
    var popover = createElement('div', {
      tabindex: -1
    });

    // Toolbar Button
    button.setAttribute('aria-haspopup', true);
    button.setAttribute('aria-expanded', false);
    wrapper.appendChild(button);
    wrapper.appendChild(popover);
    fields.forEach(function (field) {
      var label = createElement('label');
      var span = createElement('span', {
        _textContent: field.label
      });
      var input = createElement('input', {
        type: 'text'
      });
      label.appendChild(span);
      label.appendChild(input);
      popover.appendChild(label);
    });
    var cancel = createElement('button', {
      type: 'button',
      _textContent: translations.cancel || 'Cancel'
    });
    var save = createElement('button', {
      type: 'button',
      'data-action': toolName,
      _textContent: translations.save || 'Save'
    });

    // The link popover needs an extra "Remove link" button
    if (toolName === 'link') {
      var extraTool = 'unlink';
      var label = translations[extraTool] || toolset[extraTool].label;
      popover.appendChild(createElement('button', {
        type: 'button',
        title: label,
        'aria-label': label,
        'data-action': extraTool,
        _innerHTML: "<svg><use href=\"#wysi-delete\"></use></svg>"
      }));
    }
    popover.appendChild(cancel);
    popover.appendChild(save);
    return wrapper;
  }

  /**
   * Open a popover.
   * @param {object} button The popover's button.
   */
  function openPopover(button) {
    var inputs = button.nextElementSibling.querySelectorAll('input');
    var selection = document.getSelection();
    var anchorNode = selection.anchorNode;
    var _findInstance = findInstance(anchorNode),
      editor = _findInstance.editor,
      nodes = _findInstance.nodes;
    var values = [];
    if (editor) {
      // Try to find an existing target of the popover's action from the DOM selection
      var action = button.getAttribute('data-action');
      var tool = toolset[action];
      var target = nodes.filter(function (node) {
        return tool.tags.includes(node.tagName.toLowerCase());
      })[0];
      var selectContents = true;

      // If that fails, look for an element with the selection CSS class
      if (!target) {
        target = editor.querySelector("." + selectedClass);
        selectContents = false;
      }

      // If an existing target is found, we will be in modification mode
      if (target) {
        var range = document.createRange();

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
        tool.attributes.forEach(function (attribute) {
          values.push(target.getAttribute(attribute));
        });

        // If no existing target is found, we are adding new content
      } else if (selection && editor.contains(anchorNode) && selection.rangeCount) {
        // Save the current selection to keep track of where to insert the content
        setCurrentSelection(selection.getRangeAt(0));
      }
    }

    // Populate the form fields with the existing values if any
    inputs.forEach(function (input, i) {
      input.value = values[i] || '';
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
    var action = button.getAttribute('data-action');
    var inputs = button.parentNode.querySelectorAll('input');
    var _findInstance2 = findInstance(button),
      editor = _findInstance2.editor;
    var options = [];
    inputs.forEach(function (input) {
      options.push(input.value);
    });

    // Workaround for links being removed when updating images
    if (action === 'image') {
      var selected = editor.querySelector("." + selectedClass);
      var parent = selected ? selected.parentNode : {};
      if (selected && parent.tagName === 'A') {
        options.push(parent.outerHTML);
      }
    }
    execAction(action, editor, options);
  }

  /**
   * Close the open popover if any.
   * @param {boolean} ignoreSelection If true, do not restore the previous selection.
   */
  function closePopover(ignoreSelection) {
    var popover = document.querySelector('.wysi-popover [aria-expanded="true"]');
    if (popover) {
      toggleButton(popover, false);
    }
    if (!ignoreSelection) {
      restoreSelection();
    }
  }

  // Open a popover
  addListener(document, 'click', '.wysi-popover > button', function (event) {
    closePopover();
    openPopover(event.target);
    event.stopImmediatePropagation();
  });

  // Execute the popover action
  addListener(document, 'click', '.wysi-popover > div > button[data-action]', function (event) {
    execPopoverAction(event.target);
    closePopover(true);
  });

  // Cancel the popover
  addListener(document, 'click', '.wysi-popover > div > button:not([data-action])', function (event) {
    closePopover();
  });

  // Prevent clicks on the popover content to propagate (keep popover open)
  addListener(document, 'click', '.wysi-popover *:not(button)', function (event) {
    event.stopImmediatePropagation();
  });

  // Trap focus inside a popover until it's closed
  addListener(document, 'keydown', '.wysi-popover *', function (event) {
    var target = event.target;
    var parent = target.parentNode;
    var form = parent.tagName === 'DIV' ? parent : parent.parentNode;
    switch (event.key) {
      case 'Tab':
        var firstField = form.querySelector('input');
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
          var actionButton = form.querySelector('[data-action]:last-of-type');
          actionButton.click();
          event.preventDefault();
        }
        break;
      case 'Escape':
        closePopover();
        break;
    }
  });
  var isSelectionInProgress = false;

  // Close open popups and dropdowns on click outside
  addListener(document, 'click', function (event) {
    if (!isSelectionInProgress) {
      closePopover();
    }
  });

  // Text selection within a popover is in progress
  // This helps avoid closing a popover when the end of a text selection is outside it
  addListener(document, 'mousedown', '.wysi-popover, .wysi-popover *', function (event) {
    isSelectionInProgress = true;
  });

  // The text selection ended
  addListener(document, 'mouseup', function (event) {
    setTimeout(function () {
      isSelectionInProgress = false;
    });
  });

  /**
   * Render the toolbar.
   * @param {array} tools The list of tools in the toolbar.
   * @param {object} translations The labels translation object.
   * @return {string} The toolbars HTML string.
   */
  function renderToolbar(tools, translations) {
    var toolbar = createElement('div', {
      class: 'wysi-toolbar'
    });

    // Generate toolbar buttons
    tools.forEach(function (toolName) {
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
          toolbar.appendChild(renderFormatTool(translations));
          break;

        // All the other tools render as buttons
        default:
          if (typeof toolName === 'object') {
            if (toolName.items) {
              toolbar.appendChild(renderToolGroup(toolName, translations));
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
    var tool = toolset[name];
    var label = translations[name] || tool.label;
    var button = createElement('button', {
      type: 'button',
      title: label,
      'aria-label': label,
      'aria-pressed': false,
      'data-action': name,
      _innerHTML: "<svg><use href=\"#wysi-" + name + "\"></use></svg>"
    });

    // Tools that require parameters (e.g: image, link) need a popover
    if (tool.hasForm) {
      var popover = renderPopover(name, button, translations);
      toolbar.appendChild(popover);

      // The other tools only display a button
    } else {
      toolbar.appendChild(button);
    }
  }

  /**
   * Render a tool group.
   * @param {object} details The group's properties.
   * @param {object} translations The labels translation object.
   * @return {object} A DOM element containing the tool group.
   */
  function renderToolGroup(details, translations) {
    var label = details.label || translations.select || 'Select an item';
    var options = details.items;
    var items = options.map(function (option) {
      var tool = toolset[option];
      var label = translations[option] || tool.label;
      var icon = option;
      var action = option;
      return {
        label: label,
        icon: icon,
        action: action
      };
    });
    return renderListBox({
      label: label,
      items: items
    });
  }

  /**
   * Render format tool.
   * @param {object} translations The labels translation object.
   * @return {object} A DOM element containing the format tool.
   */
  function renderFormatTool(translations) {
    var label = translations['format'] || toolset.format.label;
    var paragraphLabel = translations['paragraph'] || toolset.format.paragraph;
    var headingLabel = translations['heading'] || toolset.format.heading;
    var classes = 'wysi-format';
    var items = toolset.format.tags.map(function (tag) {
      var name = tag;
      var label = tag === 'p' ? paragraphLabel : headingLabel + " " + tag.substring(1);
      var action = 'format';
      return {
        name: name,
        label: label,
        action: action
      };
    });
    return renderListBox({
      label: label,
      items: items,
      classes: classes
    });
  }

  /**
   * Update toolbar buttons state.
   */
  function updateToolbarState() {
    var _findInstance = findInstance(document.getSelection().anchorNode),
      toolbar = _findInstance.toolbar,
      editor = _findInstance.editor,
      nodes = _findInstance.nodes;
    var tags = nodes.map(function (node) {
      return node.tagName.toLowerCase();
    });

    // Abort if the selection is not within an editor instance
    if (!editor) {
      return;
    }

    // Get the list of allowed tags in the current editor instance
    var instanceId = getInstanceId(editor);
    var allowedTags = instances[instanceId].allowedTags;

    // Reset the state of all buttons
    toolbar.querySelectorAll('[aria-pressed="true"]').forEach(function (button) {
      return button.setAttribute('aria-pressed', 'false');
    });

    // Reset the state of all list boxes
    toolbar.querySelectorAll('.wysi-listbox > div > button:first-of-type').forEach(function (button) {
      return selectListBoxItem(button);
    });

    // Update the buttons states
    tags.forEach(function (tag, i) {
      switch (tag) {
        case 'p':
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'li':
          var format = toolbar.querySelector("[data-action=\"format\"][data-option=\"" + tag + "\"]");
          var textAlign = nodes[i].style.textAlign;
          if (format) {
            selectListBoxItem(format);
          }

          // Check for text align
          if (textAlign) {
            var _action = 'align' + textAlign.charAt(0).toUpperCase() + textAlign.slice(1);
            var button = toolbar.querySelector("[data-action=\"" + _action + "\"]");
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
          var allowedTag = allowedTags[tag];
          var action = allowedTag ? allowedTag.toolName : undefined;
          if (action) {
            var _button = toolbar.querySelector("[data-action=\"" + action + "\"]");
            _button.setAttribute('aria-pressed', 'true');
          }
      }
    });
  }

  /**
   * Embed SVG icons in the HTML document.
   */
  function embedSVGIcons() {
    // The icons will be included during the build process
    var icons = '<svg id="wysi-svg-icons" xmlns="http://www.w3.org/2000/svg"><defs><symbol id="wysi-bold" viewBox="0 0 24 24"><path d="M16.5,9.5A3.5,3.5,0,0,0,13,6H8.5a1,1,0,0,0-1,1V17a1,1,0,0,0,1,1H13a3.49,3.49,0,0,0,2.44-6A3.5,3.5,0,0,0,16.5,9.5ZM13,16H9.5V13H13a1.5,1.5,0,0,1,0,3Zm0-5H9.5V8H13a1.5,1.5,0,0,1,0,3Z"></path></symbol><symbol id="wysi-italic" viewBox="0 0 24 24"><path d="M17,6H11a1,1,0,0,0,0,2h1.52l-3.2,8H7a1,1,0,0,0,0,2h6a1,1,0,0,0,0-2H11.48l3.2-8H17a1,1,0,0,0,0-2Z"></path></symbol><symbol id="wysi-underline" viewBox="0 0 24 24"><path d="M12,15.5a5,5,0,0,0,5-5v-5a1,1,0,0,0-2,0v5a3,3,0,0,1-6,0v-5a1,1,0,0,0-2,0v5A5,5,0,0,0,12,15.5Zm5,2H7a1,1,0,0,0,0,2H17a1,1,0,0,0,0-2Z"></path></symbol><symbol id="wysi-strike" viewBox="0 0 24 24"><path d="M12 6C9.33 6 7.5 7.34 7.5 9.5c0 .58.12 1.07.35 1.5H13c-1.49-.34-3.49-.48-3.5-1.5 0-1.03 1.08-1.75 2.5-1.75s2.5.83 2.5 1.75h2C16.5 7.4 14.67 6 12 6zm-5.5 6c-.67 0-.67 1 0 1h4.35c.5.17 1.04.34 1.65.5.58.15 1.75.23 1.75 1s-.66 1.75-2.25 1.75-2.5-1.01-2.5-1.75h-2c0 1.64 1.33 3.5 4.5 3.5s4.5-2.08 4.5-3.5c0-.58-.05-1.07-.2-1.5h1.2c.67 0 .67-1 0-1z"></path></symbol><symbol id="wysi-alignLeft" viewBox="0 0 24 24"><path d="m4 8h16c1.33 0 1.33-2 0-2h-16c-1.33 0-1.33 2 0 2zm0 5h12c1.33 0 1.33-2 0-2h-12c-1.33 0-1.33 2 0 2zm16 3h-16c-1.33 0-1.33 2 0 2h16c1.34 0 1.29-2 0-2z"></path></symbol><symbol id="wysi-alignCenter" viewBox="0 0 24 24"><path d="m20 8h-16c-1.33 0-1.33-2 0-2h16c1.33 0 1.33 2 0 2zm-4 5h-8c-1.33 0-1.33-2 0-2h8c1.33 0 1.33 2 0 2zm-12 3h16c1.33 0 1.33 2 0 2h-16c-1.34 0-1.29-2 0-2z"></path></symbol><symbol id="wysi-alignRight" viewBox="0 0 24 24"><path d="m20 8h-16c-1.33 0-1.33-2 0-2h16c1.33 0 1.33 2 0 2zm0 5h-12c-1.33 0-1.33-2 0-2h12c1.33 0 1.33 2 0 2zm-16 3h16c1.33 0 1.33 2 0 2h-16c-1.34 0-1.29-2 0-2z"></path></symbol><symbol id="wysi-alignJustify" viewBox="0 0 24 24"><path d="m20 8h-16c-1.33 0-1.33-2 0-2h16c1.33 0 1.33 2 0 2zm0 5h-16c-1.33 0-1.33-2 0-2h16c1.33 0 1.33 2 0 2zm-16 3h16c1.33 0 1.33 2 0 2h-16c-1.34 0-1.29-2 0-2z"></path></symbol><symbol id="wysi-ul" viewBox="0 0 24 24"><path d="M3 6a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1zm4 0a1 1 0 0 0 0 2h14a1 1 0 0 0 0-2H7zm-4 5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1zm4 0a1 1 0 0 0 0 2h14a1 1 0 0 0 0-2H7zm-4 5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1zm4 0a1 1 0 0 0 0 2h14a1 1 0 0 0 0-2H7z"></path></symbol><symbol id="wysi-ol" viewBox="0 0 24 24"><path d="M4 5c-.25 0-.5.17-.5.5v3c0 .67 1 .67 1 0v-3c0-.33-.25-.5-.5-.5zm4.5 1c-1.33 0-1.33 2 0 2h12c1.33 0 1.33-2 0-2zm-6 5.5h.75c0-.43.34-.75.75-.75.4 0 .75.28.75.75L2.5 13.25V14h3v-.75H3.75L5.5 12v-.5c0-.9-.73-1.49-1.5-1.5-.77 0-1.5.59-1.5 1.5zm6-.5c-1.33 0-1.33 2 0 2h12c1.33 0 1.33-2 0-2zM4 15c-.83 0-1.5.63-1.5 1.25h.75c0-.28.34-.5.75-.5s.75.22.75.5-.34.5-.75.5v.5c.41 0 .75.22.75.5s-.34.5-.75.5-.75-.22-.75-.5H2.5c0 .62.67 1.25 1.5 1.25s1.5-.5 1.5-1.12c0-.34-.2-.66-.56-.88.35-.2.56-.53.56-.87 0-.62-.67-1.12-1.5-1.12zm4.5 1c-1.33 0-1.33 2 0 2h12c1.33 0 1.33-2 0-2z"></path></symbol><symbol id="wysi-indent" viewBox="0 0 24 24"><path d="m20 8h-15.9c-1.33 0-1.33-2 0-2h15.9c1.33 0 1.33 2 0 2zm2.86e-4 5h-9.08c-1.33 0-1.33-2 0-2h9.08c1.33 0 1.33 2 0 2zm-16.7-3.31c0.356-0.423 0.988-0.477 1.41-0.12l2 1.66c0.483 0.4 0.483 1.14 0 1.54l-2 1.66c-0.179 0.153-0.405 0.238-0.64 0.24-0.297 4.83e-4 -0.58-0.131-0.77-0.36-0.354-0.425-0.296-1.06 0.13-1.41l1.08-0.9-1.08-0.9c-0.426-0.353-0.484-0.985-0.13-1.41zm0.77 6.31h15.9c1.33 0 1.33 2 0 2h-15.9c-1.33 0-1.33-2 0-2z"></path></symbol><symbol id="wysi-outdent" viewBox="0 0 24 24"><path d="m4.1 6c-1.33 0-1.33 2 0 2h15.9c1.33 0 1.33-2 0-2h-15.9zm1.96 3.33c-0.224 0.00238-0.448 0.0803-0.633 0.236l-2 1.66c-0.483 0.4-0.483 1.14 0 1.54l2 1.66c0.179 0.153 0.404 0.238 0.639 0.24 0.297 4.83e-4 0.581-0.131 0.771-0.359 0.354-0.425 0.295-1.06-0.131-1.41l-1.08-0.9 1.08-0.9c0.426-0.353 0.485-0.985 0.131-1.41-0.2-0.238-0.489-0.359-0.777-0.355zm4.88 1.67c-1.33 0-1.33 2 0 2h9.08c1.33 0 1.33-2 0-2h-9.08zm-6.87 5c-1.33 0-1.33 2 0 2h15.9c1.33 0 1.33-2 0-2h-15.9z"></path></symbol><symbol id="wysi-link" viewBox="0 0 24 24"><path d="M8,12a1,1,0,0,0,1,1h6a1,1,0,0,0,0-2H9A1,1,0,0,0,8,12Zm2,3H7A3,3,0,0,1,7,9h3a1,1,0,0,0,0-2H7A5,5,0,0,0,7,17h3a1,1,0,0,0,0-2Zm7-8H14a1,1,0,0,0,0,2h3a3,3,0,0,1,0,6H14a1,1,0,0,0,0,2h3A5,5,0,0,0,17,7Z"></path></symbol><symbol id="wysi-image" viewBox="0 0 24 24"><path d="M6 5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6zm0 2h12a1 1 0 0 1 1 1v5.73l-.88-.88a3.06 3.06 0 0 0-4.24 0l-.88.88-2.88-2.88A3.06 3.06 0 0 0 8 10a3.06 3.06 0 0 0-2.12.85l-.88.88V8a1 1 0 0 1 1-1zm1.85 4.98a1 1 0 0 1 .85.27L13.45 17H6a1 1 0 0 1-.98-.92H5v-1.53l2.3-2.3a1 1 0 0 1 .55-.26zm8 2a1 1 0 0 1 .85.27l2.17 2.16c-.19.33-.55.59-.86.59h-1.72l-1.86-1.87.88-.88a1 1 0 0 1 .54-.28z"></path></symbol><symbol id="wysi-quote" viewBox="0 0 24 24"><path d="m9 6c-2.2 0-4 1.96-4 4.36v6c0 0.903 0.672 1.64 1.5 1.64h3c0.828 0 1.5-0.733 1.5-1.64v-3.27c0-0.903-0.672-1.64-1.5-1.64h-1.75c-0.414 0-0.75-0.367-0.75-0.818v-0.273c0-1.2 0.899-2.18 2-2.18h0.5c0.274 0 0.5-0.246 0.5-0.545v-1.09c0-0.298-0.226-0.545-0.5-0.545zm8 0c-2.2 0-4 1.96-4 4.36v6c0 0.903 0.672 1.64 1.5 1.64h3c0.828 0 1.5-0.733 1.5-1.64v-3.27c0-0.903-0.672-1.64-1.5-1.64h-1.75c-0.414 0-0.75-0.367-0.75-0.818v-0.273c0-1.2 0.899-2.18 2-2.18h0.5c0.274 0 0.5-0.246 0.5-0.545v-1.09c0-0.298-0.226-0.545-0.5-0.545z"></path></symbol><symbol id="wysi-hr" viewBox="0 0 24 24"><path d="m20 11h-16c-1.33 0-1.33 2 0 2 0 0 16-0.018 16 0 1.33 0 1.33-2 0-2z"></path></symbol><symbol id="wysi-removeFormat" viewBox="0 0 24 24"><path d="M7 6C5.67 6 5.67 8 7 8h3l-2 7c0 .02 2 0 2 0l2-7h3c1.33 0 1.33-2 0-2H7zm7.06 7c-.79-.04-1.49.98-.75 1.72l.78.78-.78.79c-.94.93.47 2.35 1.4 1.4l.79-.78.78.79c.94.93 2.35-.47 1.41-1.41l-.78-.79.78-.78c.94-.94-.47-2.35-1.4-1.41l-.8.79-.77-.79a.99.99 0 0 0-.66-.3zM7 16c-1.33 0-1.33 2 0 2 .02-.02 4 0 4 0 1.33 0 1.33-2 0-2H7z"></path></symbol><symbol id="wysi-delete" viewBox="0 0 24 24"><path d="M10,18a1,1,0,0,0,1-1V11a1,1,0,0,0-2,0v6A1,1,0,0,0,10,18ZM20,6H16V5a3,3,0,0,0-3-3H11A3,3,0,0,0,8,5V6H4A1,1,0,0,0,4,8H5V19a3,3,0,0,0,3,3h8a3,3,0,0,0,3-3V8h1a1,1,0,0,0,0-2ZM10,5a1,1,0,0,1,1-1h2a1,1,0,0,1,1,1V6H10Zm7,14a1,1,0,0,1-1,1H8a1,1,0,0,1-1-1V8H17Zm-3-1a1,1,0,0,0,1-1V11a1,1,0,0,0-2,0v6A1,1,0,0,0,14,18Z"></path></symbol></defs></svg>';
    var svgElement = buildFragment(icons);
    document.body.appendChild(svgElement);
  }

  // Deselect selected element when clicking outside
  addListener(document, 'click', '.wysi-editor, .wysi-editor *', function (event) {
    var selected = document.querySelector("." + selectedClass);
    if (selected && selected !== event.target) {
      selected.classList.remove(selectedClass);
    }
  });

  // Select an image when it's clicked
  addListener(document, 'click', '.wysi-editor img', function (event) {
    var image = event.target;
    var range = document.createRange();
    image.classList.add(selectedClass);
    range.selectNode(image);
    setSelection(range);
  });

  // Toolbar button click
  addListener(document, 'click', '.wysi-toolbar > button', function (event) {
    var button = event.target;
    var action = button.getAttribute('data-action');
    var _findInstance2 = findInstance(button),
      editor = _findInstance2.editor;
    var selection = document.getSelection();
    if (selection && editor.contains(selection.anchorNode)) {
      execAction(action, editor);
    }
  });

  // Update the toolbar buttons state
  addListener(document, 'selectionchange', updateToolbarState);

  // include SVG icons
  DOMReady(embedSVGIcons);

  var STYLE_ATTRIBUTE = 'style';

  /**
   * Enable HTML tags belonging to a set of tools.
   * @param {array} tools A array of tool objects.
   * @return {object} The list of allowed tags.
   */
  function enableTags(tools) {
    var allowedTags = cloneObject(settings.allowedTags);
    tools.forEach(function (toolName) {
      var tool = cloneObject(toolset[toolName]);
      if (!tool || !tool.tags) {
        return;
      }
      var isEmpty = !!tool.isEmpty;
      var extraTags = tool.extraTags || [];
      var aliasList = tool.alias || [];
      var alias = aliasList.length ? tool.tags[0] : undefined;
      var tags = [].concat(tool.tags, extraTags, aliasList);
      var attributes = tool.attributes || [];
      var styles = tool.styles || [];
      tags.forEach(function (tag) {
        allowedTags[tag] = {
          attributes: attributes,
          styles: styles,
          alias: alias,
          isEmpty: isEmpty
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
   * @return {string} The filter HTML content.
   */
  function prepareContent(content, allowedTags) {
    var container = createElement('div');
    var fragment = buildFragment(content);
    filterContent(fragment, allowedTags);
    wrapTextNodes(fragment);
    cleanContent(fragment, allowedTags);
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
    var newElement = createElement(tag);
    var parentNode = node.parentNode;
    var attributes = node.attributes;

    // Copy the original element's content
    newElement.innerHTML = node.innerHTML || node.textContent || node.outerHTML;

    // Copy the original element's attributes
    if (copyAttributes && attributes) {
      for (var i = 0; i < attributes.length; i++) {
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
    var styleAttribute = node.getAttribute(STYLE_ATTRIBUTE);
    if (styleAttribute) {
      // Parse the styles
      var styles = styleAttribute.split(';').map(function (style) {
        var prop = style.split(':');
        return {
          name: prop[0].trim(),
          value: prop[1]
        };
      })
      // Filter the styles
      .filter(function (style) {
        return allowedStyles.includes(style.name);
      })

      // Convert back to a style string
      .map(function (_ref) {
        var name = _ref.name,
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
    var children = Array.from(node.childNodes);
    if (!children || !children.length) {
      return;
    }
    children.forEach(function (childNode) {
      // Element nodes
      if (childNode.nodeType === 1) {
        // Filter recursively (deeper nodes firest)
        filterContent(childNode, allowedTags);

        // Check if the current element is allowed
        var tag = childNode.tagName.toLowerCase();
        var allowedTag = allowedTags[tag];
        var attributes = Array.from(childNode.attributes);
        if (allowedTag) {
          var allowedAttributes = allowedTag.attributes || [];
          var allowedStyles = allowedTag.styles || [];

          // Remove attributes that are not allowed
          for (var i = 0; i < attributes.length; i++) {
            var attributeName = attributes[i].name;
            if (!allowedAttributes.includes(attributes[i].name)) {
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
            childNode.replaceWith.apply(childNode, childNode.childNodes);
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
    var children = Array.from(node.childNodes);
    if (!children || !children.length) {
      return;
    }
    children.forEach(function (childNode) {
      // Remove empty element nodes
      if (childNode.nodeType === 1) {
        // Filter recursively (deeper nodes firest)
        cleanContent(childNode, allowedTags);

        // Check if the element can be empty
        var tag = childNode.tagName.toLowerCase();
        var allowedTag = allowedTags[tag];
        if (allowedTag && !allowedTag.isEmpty && trimText(childNode.innerHTML) === '') {
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
    var children = Array.from(node.childNodes);
    if (!children || !children.length) {
      return;
    }
    var appendToPrev = false;
    children.forEach(function (childNode) {
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
        var prev = childNode.previousElementSibling;
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
  var nextId = 0;

  /**
   * Init WYSIWYG editor instances.
   * @param {object} options Configuration options.
   */
  function init(options) {
    var globalTranslations = window.wysiGlobalTranslations || {};
    var translations = Object.assign({}, globalTranslations, options.translations || {});
    var tools = options.tools || settings.tools;
    var selector = options.el || settings.el;
    var targetEls = getTargetElements(selector);
    var toolbar = renderToolbar(tools, translations);
    var allowedTags = enableTags(tools);
    var customTags = options.customTags || [];

    // Add custom tags if any to the allowed tags list
    customTags.forEach(function (custom) {
      if (custom.tags) {
        var attributes = custom.attributes || [];
        var styles = custom.styles || [];
        var isEmpty = !!custom.isEmpty;
        custom.tags.forEach(function (tag) {
          allowedTags[tag] = {
            attributes: attributes,
            styles: styles,
            isEmpty: isEmpty
          };
        });
      }
    });

    // Append an editor instance to target elements
    targetEls.forEach(function (field) {
      var sibling = field.previousElementSibling;
      if (!sibling || !hasClass(sibling, 'wysi-wrapper')) {
        var instanceId = nextId++;

        // Store the instance's options 
        instances[instanceId] = options;

        // Cache the list of allowed tags in the instance
        instances[instanceId].allowedTags = cloneObject(allowedTags);

        // Wrapper
        var wrapper = createElement('div', {
          class: 'wysi-wrapper'
        });

        // Editable region
        var editor = createElement('div', {
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
    for (var key in options) {
      switch (key) {
        case 'darkMode':
        case 'autoGrow':
        case 'autoHide':
          instance.classList.toggle("wysi-" + key.toLowerCase(), !!options[key]);
          break;
        case 'height':
          var height = options.height;
          if (!isNaN(height)) {
            var editor = instance.lastChild;
            editor.style.minHeight = height + "px";
            editor.style.maxHeight = height + "px";
          }
          break;
      }
    }
  }

  /**
   * Destroy a WYSIWYG editor instance.
   * @param {string} selector One or more selectors pointing to textarea fields.
   */
  function destroy(selector) {
    document.querySelectorAll(selector).forEach(function (field) {
      var sibling = field.previousElementSibling;
      if (sibling && hasClass(sibling, 'wysi-wrapper')) {
        var instanceId = getInstanceId(sibling.lastChild);
        delete instances[instanceId];
        sibling.remove();
      }
    });
  }

  /**
   * Clean up content before pasting it in an editor.
   * @param {object} event The browser's paste event.
   */
  function cleanPastedContent(event) {
    var _findInstance = findInstance(event.target),
      editor = _findInstance.editor,
      nodes = _findInstance.nodes;
    var clipboardData = event.clipboardData;
    if (editor && clipboardData.types.includes('text/html')) {
      var pasted = clipboardData.getData('text/html');
      var instanceId = getInstanceId(editor);
      var allowedTags = instances[instanceId].allowedTags;
      var content = prepareContent(pasted, allowedTags);

      // Detect a heading tag in the current selection
      var splitHeadingTag = nodes.filter(function (n) {
        return headingElements.includes(n.tagName);
      }).length > 0;

      // Force split the heading tag if any.
      // This fixes a bug in Webkit/Blink browsers where the whole content is converted to a heading
      if (splitHeadingTag && !isFirefox) {
        var splitter = "<h1 class=\"" + placeholderClass + "\"><br></h1><p class=\"" + placeholderClass + "\"><br></p>";
        content = splitter + content + splitter;
      }

      // Manually paste the cleaned content
      execCommand('insertHTML', content);
      if (splitHeadingTag && !isFirefox) {
        // Remove placeholder elements if any
        editor.querySelectorAll("." + placeholderClass).forEach(function (fragment) {
          fragment.remove();
        });

        // Unwrap nested heading elements to fix a bug in Webkit/Blink browsers
        editor.querySelectorAll(headingElements.join()).forEach(function (heading) {
          var firstChild = heading.firstElementChild;
          if (firstChild && blockElements.includes(firstChild.tagName)) {
            heading.replaceWith.apply(heading, heading.childNodes);
          }
        });
      }

      // Prevent the default paste action
      event.preventDefault();
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
    addListener(document, 'input', '.wysi-editor', function (event) {
      var editor = event.target;
      var textarea = editor.parentNode.nextElementSibling;
      var instanceId = getInstanceId(editor);
      var onChange = instances[instanceId].onChange;
      var content = editor.innerHTML;
      textarea.value = content;
      dispatchEvent(textarea, 'change');
      if (onChange) {
        onChange(content);
      }
    });

    // Clean up pasted content
    addListener(document, 'paste', cleanPastedContent);
  }

  // Expose Wysi to the global scope
  window.Wysi = function () {
    var methods = {
      destroy: destroy
    };
    function Wysi(options) {
      DOMReady(function () {
        init(options || {});
      });
    }
    var _loop = function _loop(key) {
      Wysi[key] = function () {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        DOMReady(methods[key], args);
      };
    };
    for (var key in methods) {
      _loop(key);
    }
    return Wysi;
  }();

  // Bootstrap Wysi when the DOM is ready
  DOMReady(bootstrap);

})(window, document);
