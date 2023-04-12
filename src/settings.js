// Default settings
export default {

  // Default selector
  el: '[data-wysi], .wysi-field',

  // Default tools in the toolbar
  tools: [
    'format', '|', 'bold', 'italic', '|', 'alignLeft', 'alignCenter', 'alignRight', '|',
    'ul', 'ol', '|', 'indent', 'outdent', '|', 'link', 'image'
  ],

  //Custom tags to allow when filtering inserted content
  customTags: [
    /* Example:

    {
      tags: ['table', 'thead', 'tbody', 'tr', 'td', 'th'], // Tags to allow
      attributes: ['id', 'class'] // These attributes will be permitted for all the tags above
    }

    */
  ]
};