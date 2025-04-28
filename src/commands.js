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
      execCommand('createLink', options[0]);
      break;

    // Images
    case 'image':
      const [url, text = '', original] = options;
      const image = `<img src="${url}" alt="${text}" class="wysi-selected">`;
      const html = original ? original.replace(/<img[^>]+>/i, image) : image;

      execCommand('insertHTML', html);
      break;

    // All the other commands
    default:
      execCommand(command);
  }
}