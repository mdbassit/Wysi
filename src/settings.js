// Default settings
export default {

  // Default selector
  el: '[data-wysi], .wysi-field',

  // Default tools in the toolbar
  tools: [
    'format', '|', 'bold', 'italic', '|', 
    {
      label: 'Text alignment',
      items: ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']
    }, '|',
    'ul', 'ol', '|', 'indent', 'outdent', '|', 'link', 'image'
  ],

  // Enable dark mode (toolbar only)
  darkMode: false,

  // Height of the editable region
  height: 200,

  // Grow the editable region's height to fit its content
  autoGrow: false,

  // Hide the toolbar when the editable region is out of focus
  autoHide: false,

  // Default list of allowed tags
  // These tags are always allowed regardless of the instance options
  allowedTags: {
    br: {
      attributes: [],
      styles: [],
      isEmpty: true
    }
  },

  // Custom tags to allow when filtering inserted content
  customTags: [
    /* Example:

    {
      tags: ['table', 'thead', 'tbody', 'tr', 'td', 'th'], // Tags to allow
      attributes: ['id', 'class'], // These attributes will be permitted for all the tags above
      styles: ['width'],
      isEmpty: false
    }

    */
  ]
};