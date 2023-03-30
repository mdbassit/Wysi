/*!
 * Copyright (c) 2023 Momo Bassit.
 * Licensed under the MIT License (MIT)
 * https://github.com/mdbassit/Wysi
 */

((window, document, undefined) => {
  // Shortcuts
  const appendChild = (parent, child) => parent.appendChild(child);
  const createElement = tag => document.createElement(tag);
  const dispatchEvent = (element, event) => element.dispatchEvent(new Event(event, { bubbles: true }));
  const execCommand = (command, value = null) => document.execCommand(command, false, value);
  const hasClass = (element, classes) => element.classList && element.classList.contains(classes);
  const querySelector = (selector, context = document) => context.querySelector(selector);
  const querySelectorAll = (selector, context = document) => context.querySelectorAll(selector);

  // Default settings
  const settings = {
    el: '[data-wysi], .wysi-field',
    tools: [
      'formatting', 'separator', 'bold', 'italic', 'separator', 'alignLeft', 'alignCenter', 'alignRight', 'separator',
      'ul', 'ol', 'separator', 'indent', 'outdent', 'separator', 'link', 'image'
    ],
    customTags: []
  };

  // Default allowed tags
  const allowedTags = {
    br: {
      attributes: [],
      isEmpty: true
    }
  };

  // Supported tools
  const toolset = {
    paragraph: {
      tags: ['p'],
      label: 'Paragraph',
      action: () => execCommand('formatBlock', '<p>')
    },
    quote: {
      tags: ['blockquote'],
      label: 'Quote',
      action: () => execCommand('formatBlock', '<blockquote>')
    },
    heading: {
      tags: ['h1', 'h2', 'h3', 'h4'],
      label: 'Heading',
      action: (level) => execCommand('formatBlock', `<h${level}>`)
    },
    bold: {
      tags: ['strong'],
      alias: ['b'],
      label: 'Bold',
      action: () => execCommand('bold')
    },
    italic: {
      tags: ['em'],
      alias: ['i'],
      label: 'Italic',
      action: () => execCommand('italic')
    },
    underline: {
      tags: ['u'],
      label: 'Underline',
      action: () => execCommand('underline')
    },
    strikeThrough: {
      tags: ['s'],
      alias: ['del', 'strike'],
      label: 'Strike-through',
      action: () => execCommand('strikeThrough')
    },
    alignLeft: {
      label: 'Align left',
      action: () => execCommand('justifyLeft')
    },
    alignCenter: {
      label: 'Align center',
      action: () => execCommand('justifyCenter')
    },
    alignRight: {
      label: 'Align right',
      action: () => execCommand('justifyRight')
    },
    justify: {
      label: 'Justify',
      action: () => execCommand('justifyFull')
    },
    ul: {
      tags: ['ul'],
      subTags: ['li'],
      label: 'Bulleted list',
      action: () => execCommand('insertUnorderedList')
    },
    ol: {
      tags: ['ol'],
      subTags: ['li'],
      label: 'Numbered list',
      action: () => execCommand('insertOrderedList')
    },
    indent: {
      label: 'Increase indent',
      action: () => execCommand('indent')
    },
    outdent: {
      label: 'Decrease indent',
      action: () => execCommand('outdent')
    },
    link: {
      tags: ['a'],
      attributes: ['id', 'name', 'href', 'target', 'onclick'],
      label: 'Link',
      action: (url) => execCommand('createLink', url)
    },
    image: {
      tags: ['img'],
      attributes: ['src', 'alt', 'title'],
      isEmpty: true,
      label: 'Image',
      action: (url, text = '') => execCommand('insertHTML', `<img src="${url}" alt="${text}">`)
    },
    hr: {
      tags: ['hr'],
      isEmpty: true,
      label: 'Horizontal line',
      action: () => execCommand('insertHorizontalRule')
    },
    removeFormat: {
      label: 'Remove format',
      action: () => execCommand('removeFormat')
    },
    formatting: {
      tags: ['h1', 'h2', 'h3', 'h4', 'p'],
      label: 'Select formatting'
    }
  };

  /**
   * Init a WYSIWYG editor instance.
   * @param {object} options Configuration options.
   */
  function init(options) {
    const tools = options.tools || settings.tools;
    const selector = options.el || settings.el;
    const buttons = renderToolbar(tools, options);


    // Add custom tags if any to the allowed tags list
    settings.customTags.forEach(custom => {
      const attributes = custom.attributes ? custom.attributes.slice() : [];

      if (custom.tags) {
        custom.tags.forEach(tag => {
          allowedTags[tag] = { attributes };
        });
      }
    });

    // Append an editable region
    querySelectorAll(selector).forEach(field => {
      const sibling = field.previousElementSibling;

      if (!sibling || !hasClass(sibling, 'wysi-wrapper')) {
        const parentNode = field.parentNode;
        const wrapper = createElement('div');
        const toolbar = createElement('div');
        const editor = createElement('div');

        // Set CSS classes
        wrapper.className = 'wysi-wrapper';
        toolbar.className = 'wysi-toolbar';
        editor.className = 'wysi-editor';

        // Set the toolbar buttons
        toolbar.innerHTML = buttons;

        // Set the editable region
        editor.innerHTML = prepareContent(field.value);
        editor.contentEditable = true;

        // Add accessibility attributes
        editor.setAttribute('role', 'textbox');
        editor.setAttribute('aria-multiline', 'true');
        editor.setAttribute('aria-label', getTextAreaLabel(field));

        // Insert the editable region in the document
        appendChild(wrapper, toolbar);
        appendChild(wrapper, editor);
        parentNode.insertBefore(wrapper, field);
      }
    });
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
   * Render the toolbar.
   * @param {array} tools The list of tools in the toolbar.
   * @param {object} options Configuration options.
   * @return {string} The toolbars HTML string.
   */
  function renderToolbar(tools, options) {
    const globalTranslations = window.wysiGlobalTranslations || {};
    const translations = options.translations || globalTranslations || {};
    const buttons = [];

    // Generate toolbar buttons
    tools.forEach(toolName => {
      switch (toolName) {
        case 'separator':
          buttons.push('<div class="wysi-separator"></div>');
          break;
        case 'formatting':
          const paragraphLabel = translations['paragraph'] || toolset.paragraph.label;
          const headingLabel = translations['heading'] || toolset.heading.label;
          const formattingLabel = translations['formatting'] || toolset.formatting.label;

          buttons.push(
            '<div class="wysi-listbox">'+
              `<button type="button" aria-haspopup="listbox" aria-expanded="false" title="${formattingLabel}">`+
                paragraphLabel+
              '</button>'+
              `<div role="listbox" tabindex="-1" aria-label="${formattingLabel}">`+
                `<button type="button" role="option" tabindex="-1" aria-selected="false" data-action="paragraph">${paragraphLabel}</button>`+
                [1, 2, 3, 4].map(level => 
                `<button type="button" role="option" tabindex="-1" aria-selected="false" data-action="heading" data-level="${level}">${headingLabel} ${level}</button>`
                ).join('')+
              '</div>'+
            '</div>'
          );
          break;
        default:
          const tool = toolset[toolName];
          const label = translations[toolName] || tool.label;

          buttons.push(
            `<button type="button" aria-label="${label}" aria-pressed="false" title="${label}" data-action="${toolName}">`+
              `<svg><use href="#wysi-${toolName}"></use></svg>`+
            '</button>'
          );
      }

      // Add the current tool's tags to the list of allowed tags
      enableTags(toolName);
    });

    return buttons.join('');
  }

  /**
   * Destroy a WYSIWYG editor instance.
   * @param {string} selector One or more selectors pointing to textarea fields.
   */
  function destroy(selector) {
    querySelectorAll(selector).forEach(field => {
      const sibling = field.previousElementSibling;

      if (sibling && hasClass(sibling, 'wysi-wrapper')) {
        sibling.remove();
      }
    });
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
      // Focus the editable region
      region.focus();

      // Execute the button's action
      tool.action(...options);
    }
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
    container.appendChild(fragment);

    return container.innerHTML;
  }

  /**
   * Clean up content before pasting it in an editable region.
   * @param {object} event The browser's paste event.
   */
  function cleanPastedContent(event) {
    const { region } = findEditableRegion(event.target);
    const clipboardData = event.clipboardData;

    if (region && clipboardData.types.includes('text/html')) {
      const pasted = clipboardData.getData('text/html');
      const content = prepareContent(pasted);

      // Manually paste the cleaned content
      execCommand('insertHTML', content);

      console.log(content);

      // Prevent the default paste action
      event.preventDefault();
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
   * Trim whitespace from the start and end of a text.
   * @param {string} text The text to trim.
   * @return {string} The trimmed text.
   */
  function trimText(text) {
    return text.replace(/^\s+|\s+$/g, '').trim();
  }

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
    const subTags = tool.subTags || [];
    const aliasList = tool.alias || [];
    const alias = aliasList.length ? tool.tags[0] : undefined;
    const tags = [...tool.tags, ...subTags, ...aliasList];
    const attributes = tool.attributes ? tool.attributes.slice() : [];

    tags.forEach(tag => {
      allowedTags[tag] = { attributes, alias, isEmpty };
      
      if (!subTags.includes(tag)) {
        allowedTags[tag].toolName = toolName;
      }
    });
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
        newElement.setAttribute(attributes[i].name, attributes[i].value);
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
          // Unwrap node
          childNode.replaceWith(...childNode.childNodes);
        }
      }
    });
  }

  /**
   * Remove empty and comment nodes.
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
          node.removeChild(childNode);
        }

      // Remove comment nodes
      } else if (childNode.nodeType === 8) {
        node.removeChild(childNode);
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
          node.removeChild(childNode);

        // Wrap text node in a paragraph
        } else {
          replaceNode(childNode, 'p');
        }
      }
    });
  }

  /**
   * Update toolbar buttons state.
   */
  function updateToolbarState() {
    const { region, tags } = findEditableRegion(document.getSelection().anchorNode);

    // Abort if the selection is not within an editable region
    if (!region) {
      return;
    }

    // Get the current editable regions toolbar
    const toolbar = region.previousElementSibling;

    // Reset the state of all buttons
    querySelectorAll('[aria-pressed="true"]', toolbar).forEach(button => button.setAttribute('aria-pressed', 'false'));

    // Update the buttons states
    tags.forEach(tag => {
      let listBoxItem;

      switch (tag) {
        case 'p':
          listBoxItem = querySelector('[data-action="paragraph"]', toolbar);
          break;
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
          listBoxItem = querySelector(`[data-action="heading"][data-level="${tag.replace('h', '')}"]`, toolbar);
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
   * Open a list box.
   * @param {object} button The list box's button.
   */
  function openListBox(button) {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    const listBox = button.nextElementSibling;
    let selectedItem = querySelector('[aria-selected="true"]', listBox);

    if (!selectedItem) {
      selectedItem = listBox.firstElementChild;
    }

    button.setAttribute('aria-expanded', !isOpen);
    selectedItem.focus();
  }

  /**
   * Close a list box.
   * @param {object} button The list box's button.
   */
  function closeListBox(button) {
    button.setAttribute('aria-expanded', 'false');
  }

  /**
   * Select a list box item.
   * @param {object} item The list box item.
   */
  function selectListBoxItem(item) {
    const listBox = item.parentNode;
    const button = listBox.previousElementSibling;
    const selectedItem = querySelector('[aria-selected="true"]', listBox);

    if (selectedItem) {
      selectedItem.setAttribute('aria-selected', 'false');
    }

    item.setAttribute('aria-selected', 'true');
    button.innerHTML = item.innerHTML;
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

    // Toolbar button click
    addListener(document, 'click', '.wysi-toolbar > button', event => {
      const button = event.target;
      const action = button.getAttribute('data-action');
      const region = button.parentNode.nextElementSibling;
      
      execAction(action, region);
    });

    // Update the textarea value when the editor's content changes
    addListener(document, 'input', '.wysi-editor', event => {
      const editor = event.target;
      const textarea = editor.parentNode.nextElementSibling;

      textarea.value = editor.innerHTML;
      dispatchEvent(textarea, 'input');
    });

    // Clean up pasted content
    addListener(document, 'paste', cleanPastedContent);

    // Update the toolbar buttons state
    addListener(document, 'selectionchange', updateToolbarState);

    // list box button click
    addListener(document, 'click', '.wysi-listbox > button', event => {
      openListBox(event.target);

      event.preventDefault();
      event.stopImmediatePropagation();
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
      const action = item.getAttribute('data-action');
      const level = item.getAttribute('data-level');
      const region = item.parentNode.parentNode.parentNode.nextElementSibling;
      const options = [];

      if (level) {
        options.push(level);
      }
      
      //selectListBoxItem(item);
      execAction(action, region, options);
    });

    // On key press on an item
    addListener(document, 'keydown', '.wysi-listbox > div > button', event => {
      const item = event.target;
      const listBox = item.parentNode;
      const button = listBox.previousElementSibling;
      let preventDefault = true;

      switch (event.key) {
        case 'ArrowUp':
          if (item.previousElementSibling) {
            item.previousElementSibling.focus();
          }
          break;
        case 'ArrowDown':
          if (item.nextElementSibling) {
            item.nextElementSibling.focus();
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
          closeListBox(button);
          break;
        default:
          preventDefault = false;
      }

      if (preventDefault) {
        event.preventDefault();
      }
    });

    // Close list boxes on click outside
    addListener(document, 'click', event => {
      querySelectorAll('.wysi-listbox [aria-expanded="true"]').forEach(button => closeListBox(button));
    });
  }

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

  // Polyfill for Nodelist.forEach
  if (NodeList !== undefined && NodeList.prototype && !NodeList.prototype.forEach) {
      NodeList.prototype.forEach = Array.prototype.forEach;
  }

  // Expose the WYSIWYG editor to the global scope
  window.Wysi = (() => {
    const methods = {
      destroy: destroy
    };

    function Wysi(options) {
      DOMReady(() => {
        init(options || {});
      });
    }

    for (const key in methods) {
      Wysi[key] = (...args) => {
        DOMReady(methods[key], args);
      };
    }

    return Wysi;
  })();

  // Bootstrap the WYSIWYG editor when the DOM is ready
  DOMReady(bootstrap);

})(window, document);