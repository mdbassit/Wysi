import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { rollup } from 'rollup';

const bundle = await rollup({ input: 'src/filter.js', external: ['document'] });
const { output } = await bundle.generate({
  format: 'iife', name: 'WysiFilter', globals: { document: 'document' }
});
await bundle.close();
const dom = new JSDOM('', { runScripts: 'outside-only' });
dom.window.eval(output[0].code);
after(() => dom.window.close());
const { enableTags, prepareContent } = dom.window.WysiFilter;
const allowed = enableTags(['format', 'bold', 'italic', 'ul', 'ol']);

const cases = [
  ['plain text', '<div align="center">Some text</div>', '<p style="text-align: center;">Some text</p>'],
  ['mixed text and inline content', '<div align="center">Some text <strong>bold</strong></div>', '<p style="text-align: center;">Some text <strong>bold</strong></p>'],
  ['leading inline content', '<div align="right"><b>bold</b> and <em>italic</em></div>', '<p style="text-align: right;"><strong>bold</strong> and <em>italic</em></p>'],
  ['mixed blocks', '<div align="center">before<p>middle</p>after <strong>end</strong></div>', '<p style="text-align: center;">before</p><p style="text-align: center;">middle</p><p style="text-align: center;">after <strong>end</strong></p>'],
  ['comments', '<div align="center">before<!-- ignored -->after</div>', '<p style="text-align: center;">beforeafter</p>'],
  ['existing blocks', '<div align="right"><p>one</p><p>two</p></div>', '<p style="text-align: right;">one</p><p style="text-align: right;">two</p>'],
  ['list items', '<ul><li><div align="center">item <strong>bold</strong></div></li></ul>', '<ul><li style="text-align: center;">item <strong>bold</strong></li></ul>'],
  ['inline wrapper inside a paragraph', '<p><span align="center">Some <strong>text</strong></span></p>', '<p style="text-align: center;">Some <strong>text</strong></p>'],
  ['empty wrapper', '<div align="center"></div>', ''],
];

for (const [name, input, expected] of cases) {
  test(`preserves alignment for ${name}`, () => {
    assert.equal(prepareContent(input, allowed), expected);
  });
}

test('filter-only mode preserves the aligned inline run', () => {
  assert.equal(prepareContent('<div align="center">text <strong>bold</strong></div>', allowed, true),
    '<p style="text-align: center;">text <strong>bold</strong></p>');
});

test('continues filtering unsupported tags and attributes inside the aligned wrapper', () => {
  assert.equal(prepareContent('<div align="center"><strong onclick="bad()">bold</strong><span> text</span><style>bad</style></div>', allowed),
    '<p style="text-align: center;"><strong>bold</strong> text</p>');
});

test('leaves ordinary paragraph content intact', () => {
  assert.equal(prepareContent('<p>text <strong>bold</strong></p>', allowed), '<p>text <strong>bold</strong></p>');
});
