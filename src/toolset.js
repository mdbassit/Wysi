// Supported tools
export default {
  format: {
    tags: ['p', 'h1', 'h2', 'h3', 'h4'],
    styles: ['text-align'],
    label: 'Select block format',
    paragraph: 'Paragraph',
    heading: 'Heading'
  },
  quote: {
    tags: ['blockquote'],
    label: 'Quote'
  },
  bold: {
    tags: ['strong'],
    alias: ['b'],
    label: 'Bold'
  },
  italic: {
    tags: ['em'],
    alias: ['i'],
    label: 'Italic'
  },
  underline: {
    tags: ['u'],
    label: 'Underline'
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
  alignJustify: {
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
    label: 'Increase indent'
  },
  outdent: {
    label: 'Decrease indent'
  },
  link: {
    tags: ['a'],
    attributes: ['href', 'target'],
    attributeLabels: ['URL', 'Open link in'],
    hasForm: true,
    formOptions: {
      target: [
        {
          label: 'Current tab',
          value: ''
        },
        {
          label: 'New tab',
          value: '_blank'
        }
      ]
    },
    label: 'Link'
  },
  image: {
    tags: ['img'],
    attributes: ['src', 'alt'],
    attributeLabels: ['URL', 'Alternative text'],
    extraSettings: ['size', 'position'],
    extraSettingLabels: ['Image size', 'Image position'],
    styles: ['width', 'display', 'margin', 'float'],
    isEmpty: true,
    hasForm: true,
    formOptions: {
      size: [
        {
          label: 'None',
          value: '',
          criterion: null 
        },
        {
          label: '100%',
          value: '100%',
          criterion: { width: '100%' }
        },
        {
          label: '50%',
          value: '50%',
          criterion: { width: '50%' }
        },
        {
          label: '25%',
          value: '25%',
          criterion: { width: '25%' }
        }
      ],
      position: [
        {
          label: 'None',
          value: '',
          criterion: null 
        },
        {
          label: 'Left',
          value: 'left',
          criterion: { float: 'left' }
        },
        {
          label: 'Center',
          value: 'center',
          criterion: { margin: 'auto' }
        },
        {
          label: 'Right',
          value: 'right',
          criterion: { float: 'right' }
        }
      ]
    },
    label: 'Image'
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