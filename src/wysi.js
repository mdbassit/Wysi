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
  const querySelectorAll = selector => document.querySelectorAll(selector);

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
      action: () => execCommand('alignRight')
    },
    justify: {
      label: 'Justify',
      action: () => execCommand('alignFull')
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
    }
  };

  /**
   * Init a WYSIWYG editor instance.
   */
  function init(options) {
    const globalTranslations = window.wysiGlobalTranslations || {};
    const translations = options.translations || {};
    const tools = options.tools || settings.tools;
    const selector = options.el || settings.el;
    const buttons = [];

    // Generate toolbar buttons
    tools.forEach(toolName => {
      if (toolName === 'separator') {
        buttons.push('<div class="wysi-separator"></div>');
      } else {
        const tool = toolset[toolName];
        const label = translations[toolName] || globalTranslations[toolName] || tool.label;

        buttons.push(
          `<button type="button" aria-label="${label}" title="${label}" data-action="${toolName}">`+
            `<svg><use href="#wysi-${toolName}"></use></svg>`+
          '</button>'
        );
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
        toolbar.innerHTML = buttons.join('');

        // Set the editable region
        editor.innerHTML = field.value;
        editor.contentEditable = true;

        // Insert the editable region in the document
        appendChild(wrapper, toolbar);
        appendChild(wrapper, editor);
        parentNode.insertBefore(wrapper, field);
      }
    });
  }

  /**
   * Destroy a WYSIWYG editor instance.
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
   * Bootstrap the WYSIWYG editor.
   */
  function bootstrap() {
    // Configure editable regions
    execCommand('styleWithCSS', false);
    execCommand('enableObjectResizing', false);
    execCommand('enableInlineTableEditing', false);
    execCommand('defaultParagraphSeparator', 'p');

    // Toolbar button click
    addListener(document, 'click', '.wysi-toolbar button', event => {
      const button = event.target;
      const action = button.getAttribute('data-action');
      const tool = toolset[action];
      
      if (tool) {
        // Execute the button's action
        tool.action();

        // Focus the editable region
        button.parentNode.nextElementSibling.focus();
      }
    });

    // Update the textarea value when the editor's content changes
    addListener(document, 'input', '.wysi-editor', event => {
      const editor = event.target;
      const textarea = editor.parentNode.nextElementSibling;

      textarea.value = editor.innerHTML;
      dispatchEvent(textarea, 'input');
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