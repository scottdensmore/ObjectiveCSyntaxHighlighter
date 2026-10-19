const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const core = fs.readFileSync(path.join(root, 'scripts/shCore.js'), 'utf8');
const brush = fs.readFileSync(path.join(root, 'scripts/shBrushObjC.js'), 'utf8');

function load(commonJS = false) {
  // Contain the legacy core's RegExp/String extensions in their own realm.
  // HTML rendering needs no DOM, browser, package or network access.
  const context = vm.createContext({ window: {}, navigator: { userAgent: 'node' } });
  if (commonJS) context.exports = {};
  vm.runInContext(core, context, { timeout: 1000 });
  if (commonJS) context.require = (name) => {
    assert.equal(name, 'shCore');
    return context.exports;
  };
  vm.runInContext(brush, context, { timeout: 1000 });
  return context;
}

function render(source, context = load()) {
  context.source = source;
  return vm.runInContext(`
    var b = new SyntaxHighlighter.brushes.Objc();
    b.init({ brush: 'objc', toolbar: false, gutter: false, 'auto-links': false });
    b.getHtml(source);
  `, context, { timeout: 1000 });
}

function tokens(html) {
  return Array.from(html.matchAll(/<code class="objc ([^"]+)">([\s\S]*?)<\/code>/g),
    ([, css, text]) => ({ css, text }));
}
function has(actual, css, text) {
  assert.ok(actual.some((token) => token.css === css && token.text === text), `Missing ${css}: ${text}`);
}

test('browser registration retains both documented Objective-C aliases', () => {
  const context = load();
  assert.deepEqual(Array.from(context.SyntaxHighlighter.brushes.Objc.aliases), ['obj-c', 'objc']);
  has(tokens(render('@end', context)), 'keyword bold', '@end');
});
test('CommonJS brush uses the actual bundled core', () => {
  const context = load(true);
  assert.equal(context.exports.Brush, context.SyntaxHighlighter.brushes.Objc);
  has(tokens(render('BOOL ready = YES;', context)), 'keyword bold', 'BOOL');
});
test('renders preprocessor, declarations, Cocoa types and C calls', () => {
  const actual = tokens(render('#import <UIKit/UIKit.h>\n@interface Example : NSObject\n@property (nonatomic, retain) IBOutlet UIWindow *window;\nprintf("ok");\n@end'));
  has(actual, 'preprocessor', '#import &lt;UIKit/UIKit.h>');
  for (const word of ['@interface', 'NSObject', '@property', 'nonatomic', 'retain', 'IBOutlet', 'UIWindow', '@end']) has(actual, 'keyword bold', word);
  has(actual, 'functions bold', 'printf');
});
test('comments and strings suppress nested keyword highlighting', () => {
  const actual = tokens(render('// return NSString\n/* @interface NSObject */\nconst char *s = "return NSString";'));
  has(actual, 'comments', '// return NSString');
  has(actual, 'comments', '/* @interface NSObject */');
  has(actual, 'string', '"return NSString"');
  assert.equal(actual.filter((t) => t.css.includes('keyword') && t.text === 'NSString').length, 0);
});
test('keyword boundaries preserve ordinary identifiers', () => {
  const actual = tokens(render('privateMember returnValue MYNSString; return YES;'));
  assert.equal(actual.filter((t) => t.css.includes('keyword')).map((t) => t.text).join(','), 'return,YES');
});
test('source markup is rendered as escaped text', () => {
  const html = render('<script>alert("x")</script>\n<img src=x onerror=alert(1)>');
  assert.doesNotMatch(html, /<(?:script|img)\b/i);
  assert.match(html, /&lt;script>/);
  assert.match(html, /&lt;img/);
});
test('sample assets and brush aliases resolve to the bundled implementation', () => {
  const sample = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const assets = Array.from(sample.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"/g), (m) => m[1]);
  assert.equal(assets.length, 3);
  for (const asset of assets) {
    const file = path.resolve(root, asset);
    assert.ok(file.startsWith(root + path.sep));
    assert.ok(fs.statSync(file).isFile(), asset);
  }
  const aliases = Array.from(load().SyntaxHighlighter.brushes.Objc.aliases);
  const samples = Array.from(sample.matchAll(/<pre class="brush: ([^;]+);">([\s\S]*?)<\/pre>/g));
  assert.equal(samples.length, 2);
  for (const [, alias, source] of samples) {
    assert.ok(aliases.includes(alias));
    assert.match(render(source.replaceAll('&lt;', '<').replaceAll('&gt;', '>')), /class="objc keyword bold"/);
  }
});
