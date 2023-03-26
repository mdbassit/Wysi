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
  const hasClass = (element, classes) => element.classList.contains(classes);
  const querySelector = (selector, context = document) => context.querySelector(selector);
  const querySelectorAll = (selector, context = document) => context.querySelectorAll(selector);

  // Default settings
  const settings = {
    el: '[data-wysi], .wysi-field',
    tools: ['bold', 'italic', 'underline']
  };

  // Supported tools
  const toolset = {
    paragraph: {
      label: 'Paragraph',
      action: () => execCommand('formatBlock', '<p>')
    },
    quote: {
      label: 'Quote',
      action: () => execCommand('formatBlock', '<blockquote>')
    },
    heading: {
      label: 'Heading',
      action: (level) => execCommand('formatBlock', `<h${level}>`)
    },
    bold: {
      label: 'Bold',
      action: () => execCommand('bold')
    },
    italic: {
      label: 'Italic',
      action: () => execCommand('italic')
    },
    underline: {
      label: 'Underline',
      action: () => execCommand('underline')
    },
    strikeThrough: {
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
      label: 'Bulleted list',
      action: () => execCommand('insertUnorderedList')
    },
    ol: {
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
      label: 'Link',
      action: (url) => execCommand('createLink', url)
    },
    image: {
      label: 'Image',
      action: (url, text = '') => execCommand('insertHTML', `<img src="${url}" alt="${text}">`)
    },
    hr: {
      label: 'Horizontal line',
      action: () => execCommand('insertHorizontalRule')
    },
    removeFormat: {
      label: 'Remove format',
      action: () => execCommand('removeFormat')
    },
    formatting: {
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
        editor.innerHTML = field.value; // TODO: wrap text in paragraphs
        editor.contentEditable = true;

        // Insert the editable region in the document
        appendChild(wrapper, toolbar);
        appendChild(wrapper, editor);
        parentNode.insertBefore(wrapper, field);
      }
    });
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
            `<button type="button" aria-label="${label}" title="${label}" data-action="${toolName}">`+
              `<svg><use href="#wysi-${toolName}"></use></svg>`+
            '</button>'
          );
      }
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
      const listBox = item.parentNode;
      const button = listBox.previousElementSibling;
      const selectedItem = querySelector('[aria-selected="true"]', listBox);
      const action = item.getAttribute('data-action');
      const level = item.getAttribute('data-level');
      const region = item.parentNode.parentNode.parentNode.nextElementSibling;
      const options = [];

      if (selectedItem) {
        selectedItem.setAttribute('aria-selected', 'false');
      }

      item.setAttribute('aria-selected', 'true');
      button.innerHTML = item.innerHTML;

      if (level) {
        options.push(level);
      }
      
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