import { execCommand, formatBlock } from './utils.js';

// Supported tools
export default {
  format: {
    tags: ['p', 'h1', 'h2', 'h3', 'h4'],
    label: 'Select block format',
    paragraph: 'Paragraph',
    heading: 'Heading',
    action: (format) => formatBlock(format)
  },
  quote: {
    tags: ['blockquote'],
    label: 'Quote',
    action: () => formatBlock('blockquote')
  },
  bold: {
    tags: ['strong'],
    alias: ['b'],
    label: 'Bold',
  },
  italic: {
    tags: ['em'],
    alias: ['i'],
    label: 'Italic',
  },
  underline: {
    tags: ['u'],
    label: 'Underline',
  },
  strike: {
    tags: ['s'],
    alias: ['del', 'strike'],
    label: 'Strike-through',
    command: 'strikeThrough'
  },
  alignLeft: {
    label: 'Align left',
    command: 'justifyLeft'
  },
  alignCenter: {
    label: 'Align center',
    command: 'justifyCenter'
  },
  alignRight: {
    label: 'Align right',
    command: 'justifyRight'
  },
  justify: {
    label: 'Justify',
    command: 'justifyFull'
  },
  ul: {
    tags: ['ul'],
    subTags: ['li'],
    label: 'Bulleted list',
    command: 'insertUnorderedList'
  },
  ol: {
    tags: ['ol'],
    subTags: ['li'],
    label: 'Numbered list',
    command: 'insertOrderedList'
  },
  indent: {
    label: 'Increase indent',
  },
  outdent: {
    label: 'Decrease indent',
  },
  link: {
    tags: ['a'],
    attributes: ['id', 'name', 'href', 'target'/*, 'onclick'*/],
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
    command: 'insertHorizontalRule'
  },
  removeFormat: {
    label: 'Remove format',
  }
};