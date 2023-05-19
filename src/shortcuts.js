import document from 'document';

// Shortcuts
export const appendChild = (parent, child) => parent.appendChild(child);
export const dispatchEvent = (element, event) => element.dispatchEvent(new Event(event, { bubbles: true }));
export const execCommand = (command, value = null) => document.execCommand(command, false, value);
export const hasClass = (element, classes) => element.classList && element.classList.contains(classes);
export const getAttribute = (element, attribute) => element.getAttribute(attribute);
export const querySelector = (selector, context = document) => context.querySelector(selector);
export const querySelectorAll = (selector, context = document) => context.querySelectorAll(selector);
export const removeChild = (parent, child) => parent.removeChild(child);
export const removeAttribute = (element, attribute) => element.removeAttribute(attribute);
export const setAttribute = (element, attribute, value) => element.setAttribute(attribute, value);
export const stopImmediatePropagation = event => event.stopImmediatePropagation();
export const toLowerCase = str => str.toLowerCase();