import { execCommand } from './shortcuts.js';
import { formatBlock } from './utils.js';

// Supported tools
export default {
  format: {
    tags: ['p', 'h1', 'h2', 'h3', 'h4'],
    styles: ['text-align'],
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
    extraTags: ['li'],
    styles: ['text-align'],
    label: 'Bulleted list',
    command: 'insertUnorderedList'
  },
  ol: {
    tags: ['ol'],
    extraTags: ['li'],
    styles: ['text-align'],
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
    attributes: [/*'id', 'name', */'href', /*'target', 'onclick'*/],
    attributeLabels: ['URL'],
    hasForm: true,
    label: 'Link',
    action: (url) => execCommand('createLink', url)
  },
  image: {
    tags: ['img'],
    attributes: ['src', 'alt'/*, 'title'*/],
    attributeLabels: ['URL', 'Alternative text'],
    isEmpty: true,
    hasForm: true,
    label: 'Image',
    action: (url, text = '', original) => {
      const image = `<img src="${url}" alt="${text}" class="wysi-selected">`;
      const html = original ? original.replace(/<img[^>]+>/i, image) : image;
      execCommand('insertHTML', html);
    }
  },
  hr: {
    tags: ['hr'],
    isEmpty: true,
    label: 'Horizontal line',
    command: 'insertHorizontalRule'
  },
  removeFormat: {
    label: 'Remove format'
  },
  unlink: {
    label: 'Remove link'
  }
};