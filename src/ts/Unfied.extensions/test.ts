import {fromMarkdown as parseFromMarkdown} from 'mdast-util-from-markdown';
import {toMarkdown as serializeToMarkdown} from 'mdast-util-to-markdown';
import {syntaxFromMarkdown, mdastFromMarkdown, syntaxToHtml, htmlTag as spanHtmlTag, mdastToMarkdown} from './custom_span/index';
import {toHast} from 'mdast-util-to-hast'

const doc = '*Emphasis*, **importance**, and ~strikethrough~.'

const mdast = parseFromMarkdown(doc, {
  extensions: [syntaxFromMarkdown()],
  mdastExtensions: [mdastFromMarkdown]
})
console.log("\n\n\n\n\n");
console.log("==========================================");
console.log(JSON.stringify(mdast, null, 2))
console.log("==========================================");
const out = serializeToMarkdown(mdast, {extensions: [mdastToMarkdown]})
console.log("==========================================");
const hast = toHast(mdast);
console.log(JSON.stringify(hast, null, 2));