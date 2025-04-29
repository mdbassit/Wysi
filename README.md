
# Wysi

![Wysi in light mode](https://mdbassit.github.io/Wysi/images/wysi-light.png)

A lightweight and simple WYSIWYG editor written in vanilla ES6 with no dependencies.

[**View demo**](https://mdbassit.github.io/Wysi)

## Features

* Lightweight (around 10KB minified and gzipped)
* Zero dependencies
* Very easy to use
* Customizable
* Dark mode support
* Auto grow editor instances to fit content
* Filters content when pasting
* Works on all modern browsers

### TODO

(Work in progress)

* Normalize the HTML output across browsers
* Use semantic HTML when possible
* Add support for custom tools (plugins)
* Add support for link target
* Add support for image scaling, positioning and caption
* Add support for custom CSS classes
* Theming

## Getting Started

### Basic usage

Download the [latest version](https://github.com/mdbassit/Wysi/releases/latest), and add the script and style to your page:
```html
<link rel="stylesheet" href="wysi.min.css"/>
<script src="wysi.min.js"></script>
```

Or include from a CDN (not recommended in production):
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mdbassit/Wysi@latest/dist/wysi.min.css"/>
<script src="https://cdn.jsdelivr.net/gh/mdbassit/Wysi@latest/dist/wysi.min.js"></script>
```

Then create an editor instance using a CSS selector pointing to one or more `textarea` elements:
```html
<textarea id="demo1"></textarea>
<script>
Wysi({
  el: '#demo1'
})
</script>
```

This will convert the textarea element to a WYSIWYG editor with the default settings.

### Customizing the editor

The editor can be configured by calling `Wysi()` and passing an options object to it. Here is a list of all the available options:

```js
Wysi({
  
  // A selector pointing to one or more textarea elements to convert into WYSIWYG editors.
  // This can also accept a Node, a NodeList, an HTMLCollection or an array of DOM elements.
  el: '.richtext',

  // Enable dark mode. This only affects the toolbar, not the content area.
  darkMode: false,

  // The height of the editable region.
  height: 200,

  // Grow the editor instance to fit its content automatically.
  // The height option above will serve as the minimum height.
  autoGrow: false,
  
  // Automatically hide the toolbar when the editable region is not focused.
  autoHide: false,

  // A function that is called whenever the content of the editor instance changes.
  // The  new content is passed to the function as an argument.
  onChange: (content) => console.log(content)
});
```

## Building from source

Clone the git repo:
```bash
git clone git@github.com:mdbassit/Wysi.git
```

Enter the Wysi directory and install the development dependencies:
```bash
cd Wysi && npm install
```

Run the build script:
```bash
npm run build
```
The built version will be in the `dist` directory in both minified and full copies.

Alternatively, you can start a gulp watch task to automatically build when the source files are modified:
```bash
npm run watch
```

## Contributing

If you find a bug or would like to implement a missing feature, please create an issue first before submitting a pull request (PR).

When submitting a PR, please do not include the changes to the `dist` directory in your commits.

## License

Copyright (c) 2023 Momo Bassit.  
**Wysi** is licensed under the [MIT license](https://github.com/mdbassit/Wysi/blob/main/LICENSE.txt).
