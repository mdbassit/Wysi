import window from 'window';
import document from 'document';
import settings from './settings.js';
import { instances } from './common.js';
import { renderToolbar } from './toolbar.js';
import { enableTags, prepareContent } from './filter.js';
import { 
  addListener,
  cloneObject,
  createElement,
  DOMReady,
  findInstance,
  getInstanceId,
  getTextAreaLabel
} from './utils.js';
import {
  appendChild,
  dispatchEvent,
  execCommand,
  getAttribute,
  hasClass,
  querySelectorAll,
  toLowerCase
} from './shortcuts.js';


// Next available instance id
let nextId = 0;

/**
 * Init WYSIWYG editor instances.
 * @param {object} options Configuration options.
 */
function init(options) {
  const globalTranslations = window.wysiGlobalTranslations || {};
  const translations = Object.assign({}, globalTranslations, options.translations || {});
  const tools = options.tools || settings.tools;
  const selector = options.el || settings.el;
  const toolbar = renderToolbar(tools, translations);
  const allowedTags = enableTags(tools);
  const customTags = options.customTags || [];

  // Add custom tags if any to the allowed tags list
  customTags.forEach(custom => {
    if (custom.tags) {
      const attributes = custom.attributes || [];
      const styles = custom.styles || [];
      const isEmpty = !!custom.isEmpty;

      custom.tags.forEach(tag => {
        allowedTags[tag] = { attributes, styles, isEmpty };
      });
    }
  });

  // Append an editor instance
  querySelectorAll(selector).forEach(field => {
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
      appendChild(wrapper, toolbar.cloneNode(true));
      appendChild(wrapper, editor);
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

  for (const key in options) {
    switch (key) {
      case 'darkMode':
      case 'autoGrow':
      case 'autoHide':
        instance.classList.toggle(`wysi-${toLowerCase(key)}`, !!options[key]);
        break;
      case 'height':
        const height = options.height;

        if (!isNaN(height)) {
          const editor = instance.lastChild;

          editor.style.minHeight = `${height}px`;
          editor.style.maxHeight = `${height}px`;
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
  querySelectorAll(selector).forEach(field => {
    const sibling = field.previousElementSibling;

    if (sibling && hasClass(sibling, 'wysi-wrapper')) {
      const instanceId = getInstanceId(sibling.lastChild);

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
  const { editor } = findInstance(event.target);
  const clipboardData = event.clipboardData;

  if (editor && clipboardData.types.includes('text/html')) {
    const pasted = clipboardData.getData('text/html');
    const instanceId = getInstanceId(editor);
    const allowedTags = instances[instanceId].allowedTags;
    const content = prepareContent(pasted, allowedTags);

    // Manually paste the cleaned content
    execCommand('insertHTML', content);

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
  addListener(document, 'input', '.wysi-editor', event => {
    const editor = event.target;
    const textarea = editor.parentNode.nextElementSibling;
    const instanceId = getInstanceId(editor);
    const onChange = instances[instanceId].onChange;
    const content = editor.innerHTML;

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

// Bootstrap Wysi when the DOM is ready
DOMReady(bootstrap);
