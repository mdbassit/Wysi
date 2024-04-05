// Instances storage
export const instances = {};

// The CSS class to use for selected elements
export const selectedClass = 'wysi-selected';

// Placeholder elements CSS class
export const placeholderClass = 'wysi-fragment-placeholder';

// Heading elements
export const headingElements = ['H1', 'H2', 'H3', 'H4'];

// Block type HTML elements
export const blockElements = ['BLOCKQUOTE', 'HR', 'P', 'OL', 'UL'].concat(headingElements);

// Detect Firefox browser
export const isFirefox = navigator.userAgent.search(/Gecko\//) > -1;