import toolset from './toolset.js';
import { restoreSelection } from './utils.js';
import { execCommand } from './shortcuts.js';

/**
 * Execute an action.
 * @param {string} action The action to execute.
 * @param {object} editor The editor instance.
 * @param {array} [options] Optional action parameters.
 */
export function execAction(action, editor, options = []) {
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
export function execEditorCommand(command, options) {
  switch (command) {
    // Block level formatting
    case 'quote':
      options[0] = 'blockquote';
    case 'format':
      execCommand('formatBlock', `<${options[0]}>`);
      break;

    // Links
    case 'link':
      const [linkUrl, linkTarget = '', linkText] = options;

      if (linkText) {
        const targetAttr = linkTarget !== '' ? ` target="${linkTarget}"` : '';
        const linkTag = `<a href="${linkUrl}"${targetAttr}>${linkText}</a>`;

        execCommand('insertHTML', linkTag);
      }
      break;

    // Images
    case 'image':
      const [imageUrl, altText = '', originalHtml] = options;
      const image = `<img src="${imageUrl}" alt="${altText}" class="wysi-selected" style="max-width: 100%;">`;
      const imageTag = originalHtml ? originalHtml.replace(/<img[^>]+>/i, image) : image;

      execCommand('insertHTML', imageTag);
      break;

    // All the other commands
    default:
      execCommand(command);
  }
}