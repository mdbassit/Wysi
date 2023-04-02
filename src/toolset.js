import { execCommand } from './utils.js';

// Supported tools
export default {
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
  strike: {
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