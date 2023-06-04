import document from 'document';

// Shortcuts
export const dispatchEvent = (element, event) => element.dispatchEvent(new Event(event, { bubbles: true }));
export const execCommand = (command, value = null) => document.execCommand(command, false, value);
export const hasClass = (element, classes) => element.classList && element.classList.contains(classes);