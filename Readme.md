#Objective C Syntax Highlighter
The Objective C Syntax Highlighter is an extension to [Syntax Highlighter](http://alexgorbatchev.com/SyntaxHighlighter/). This will allow you to push Objective C code to your blog and have it colorize it.

## Setup
Copy shBrushObjC.js to your Syntax Highlighter directory and add the brush in your code.

## Samples
I updated the index.html to show how you can use the new highlighter.

## External Code
* [Syntax Highlighter](http://alexgorbatchev.com/SyntaxHighlighter/)

## Tests and CI

Run `node --test tests/brush.test.cjs` with existing Node 18 or later; no package installation is needed. CI uses the preinstalled Node on Ubuntu 24.04. Tests load the actual bundled core and brush in isolated JavaScript realms, render HTML, and check both module registrations, token classes/precedence/boundaries, markup escaping and sample asset/alias integration. Existing library and sample files are unchanged.

This verifies generated highlighting HTML; actual browser DOM insertion, CSS appearance and interactive toolbar behavior are outside coverage. The workflow does not publish the sample site.
