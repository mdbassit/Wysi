import window from 'window';
import document from 'document';
import settings from './settings.js';
import { renderToolbar } from './toolbar.js';
import { allowedTags, prepareContent } from './filter.js';
import {
  appendChild,
  createElement,
  dispatchEvent,
  execCommand,
  hasClass,
  querySelectorAll,
  addListener,
  DOMReady,
  findEditableRegion,
  getTextAreaLabel
} from './utils.js';

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

    textarea.value = editor.innerHTML;
    dispatchEvent(textarea, 'input');
  });

  // Clean up pasted content
  addListener(document, 'paste', cleanPastedContent);
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
