import fs from 'fs';
import { src, dest, parallel, series, watch } from 'gulp';
import { rollup } from 'rollup';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';
import rename from 'gulp-rename';
import cleanCSS from 'gulp-clean-css';

const files = {
  js: './src/**/*.js',
  css: './src/css/wysi.css',
  icons: './assets/icons.svg',
  dist: './dist',
  bundle: {
    input: './src/core.js',
    output: './dist/wysi.js',
    minified: './dist/wysi.min.js',
  }
};

const fileHeader = '/*!\n'+
' * Copyright (c) 2023 Momo Bassit.\n'+
' * Licensed under the MIT License (MIT)\n'+
' * https://github.com/mdbassit/Wysi\n'+
' */';

const rollupInput = {
  input: files.bundle.input,
  external: ['window', 'document'],
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        _SVGIcons_: fs.readFileSync(files.icons).toString().replace(/>\s+</g,'><').trim()
      }
    }),
    babel({
      babelHelpers: 'bundled'
    })
  ]
};

const rollupOuputs = [
  // Normal output
  {
    file: files.bundle.output,
    format: 'iife',
    banner: fileHeader,
    globals: {
      window: 'window',
      document: 'document',
    }
  },

  // Minified output
  {
    file: files.bundle.minified,
    plugins: [terser()],
    format: 'iife',
    sourcemap: true,
    banner: fileHeader,
    globals: {
      window: 'window',
      document: 'document',
    }
  }
];

function bundleJS() {
  return rollup(rollupInput).then(bundle => {
    return new Promise(async function (resolve, reject) {
      for (const output of rollupOuputs) {
        await bundle.write(output);
      }
      resolve();
    });
  });
}

function minifyCSS() {
  return src(files.css)
    .pipe(cleanCSS())
    .pipe(rename(function (path) {
      path.basename += '.min';
    }))
    .pipe(dest(`./${files.dist}`));
}

function copySourceCSS() {
    return src(files.css).pipe(dest(files.dist));
}

function watchFiles() {
  return new Promise(function (resolve, reject) {
    watch(files.js, bundleJS);
    watch(files.css, parallel(minifyCSS, copySourceCSS));
    resolve();
  });
}

export const build = parallel(bundleJS, minifyCSS, copySourceCSS);
export default series(build, watchFiles);