import {FrozenProcessor, unified} from 'unified';
import rehypeDomParse from 'rehype-dom-parse'; // Parse HTML to a syntax tree using DOM
import rehypeRemark from 'rehype-remark'; // Turn HTML syntax tree to markdown syntax tree
import remarkStringify from 'remark-stringify'; // Serialize markdown syntax tree
import remarkParse from 'remark-parse'; // Parse markdown to a syntax tree
import remarkRehype from 'remark-rehype'; // Turn markdown syntax tree into HTML syntax tree
import rehypeMinifyWhitespace from 'rehype-minify-whitespace'; // Remove HTML whitespace
import rehypeStringify from 'rehype-stringify'; // Serialize syntax tree to HTML
//import './Unfied.extensions/strike_underline_sub_super';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import {fromHtml as hastFromHtml} from 'hast-util-from-html';
import {toMdast as hastToMdast} from 'hast-util-to-mdast';
import {toMarkdown as mdastToMarkdown} from 'mdast-util-to-markdown';
import {fromMarkdown as underlineFromMarkdown, toHtml as underlineToHtml} from 'Unfied.extensions/underline'
import {fromMarkdown as mdastFromMarkdown} from 'mdast-util-from-markdown';
import {toHast as mdastToHast} from 'mdast-util-to-hast';
import {toHtml as hastToHtml} from 'hast-util-to-html';
import {} from 

type Config = {
    table_newline?: string
}

let _md_to_html: FrozenProcessor<any>;
let _html_to_md: FrozenProcessor<any>;

/////////////////////////////////////////////////////////////////////////////
// Parse out current cloze ordinal from string, 0 if none (i.e. increment one for next)
const CLOZE_ORD_RE = new RegExp(String.raw`{{c(\d+)::`, 'g');
function parse_cloze(str:string): number {
    let ord: number = 0;
    let match: RegExpExecArray;
    while ((match = CLOZE_ORD_RE.exec(str)) !== null) {
        const o = parseInt(match[1]);
        if (o > ord) ord = o;
    }
    return ord;
}

/////////////////////////////////////////////////////////////////////////////
// Convert HTML to markdown, including preparsing
const MOVE_CLOZE_IN_RE = new RegExp(`({{c\d+::)(.*?)}}`, 'gsi');
const TAIL_OPEN_RE = new RegExp(String.raw`<(?:ol|ul)[^>]*>`, 'gi');
const TAIL_CLOSE_RE = new RegExp(String.raw`<\/(?:ol|ul)[^>]*>`, 'gi');
const TAIL_LIST_SEARCH_RE = new RegExp(String.raw`((?:<\/li>\s*<\/(?:ul|ol)>\s*)+)$`, 'si');
async function html_to_markdown(html:string): Promise<[string, number]> {
    // Move trailing list close-clozes to last item
    html = html.replace(MOVE_CLOZE_IN_RE, (match, cont, tail) => {
        const opn = tail.match(TAIL_OPEN_RE)?.length || -1;
        const close = tail.match(TAIL_CLOSE_RE)?.length || -1;
        if (opn > 0 && opn === close) {
            const search = tail.search(TAIL_LIST_SEARCH_RE);
            if (search > -1) {
                const pre = tail.slice(0, search);
                const post = search < tail.length ? tail.slice(search) : '';
                return `${cont}${pre}}}${post}`
            }
        }
        return match;
    });
//    const md = String(await _html_to_md().process(html));
    const hast = hastFromHtml(html);
    const dast = hastToMdast(hast);
    const md = mdastToMarkdown(dast); 
    const ord = parse_cloze(md);
    return [md, ord];
}

const P_TO_BR_RE = new RegExp(String.raw`<\/p>\s*<p>`, 'gsi');
const STRIP_P_RE = new RegExp(String.raw`<\/?p>`, 'gi');
const MOVE_CLOZE_OUT_RE = new RegExp(String.raw`({{c\d+::)(.*?)}}((?:\s*<\/li>\s*<\/(?:ol|ul)>)+)`, 'gsi');
const LIST_END_RE = new RegExp(String.raw`<\/(ol|ul)>`, 'gi');
/////////////////////////////////////////////////////////////////////////////
// Convert markdown to HTML, including postprocessing
async function markdown_to_html(md: string): Promise<string> {
    const mdast = mdastFromMarkdown(md, {
        extensions: [gfmStrikethrough()],
        mdastExtensions: [gfmStrikethroughFromMarkdown]
    });
    console.log(JSON.stringify(mdast, null, 2))
    const hast = mdastToHast(mdast, {
        allowDangerousHtml: true,
        handlers: {
            u: underlineToHtml
        }
    });
    let html = hastToHtml(hast);

    html = html.replace(P_TO_BR_RE, '<br><br>');
    html = html.replace(STRIP_P_RE, '');
    // Fix clozes that look like they should surround an entire list
    html = html.replace(MOVE_CLOZE_OUT_RE, (repl: string, cloze: string, cont: string, tail: string) => {
        const opn = cont.match(TAIL_OPEN_RE)?.length || -1;
        const close = cont.match(TAIL_CLOSE_RE)?.length || -1;
        if (opn > close) {
            const n: number = close - opn + 1;
            let res: string = repl;
            let match: RegExpExecArray;
            while ((match = LIST_END_RE.exec(tail)) !== null) {
                if (match.index === n) {
                    const nn = (match.index || 0) + match[0].length;
                    const pre = tail.slice(0, nn);
                    const post = nn < tail.length ? tail.slice(nn) : '';
                    res = `${cloze}${cont}${pre}}}<br>${post}`;
                    break;
                }
            }
            return res;
        }
        return repl;
    });
    return html;
}

async function configure(cfg: Config) {
    _md_to_html = unified()
        .use(remarkParse) // Parse md to a syntax tree
        .use(remarkBreaks) // Insert <br> w/o needing trailing spaces
        .use(remarkGfm)
        .use(remarkRehype, {allowDangerousHtml: true}) // Convert syntax tree from md to HTML
        .use(rehypeMinifyWhitespace) // Plugin to remove HTML non-rendering whitespace
        .use(rehypeStringify, {
            allowDangerousHtml: true
        }) // Serialize syntax tree to HTML
        .freeze();
    _html_to_md = unified()
        .use(rehypeDomParse) // Parse HTML to a syntax tree using DOM
        .use(rehypeRemark) // Convert syntax tree from HTML to markdown
        .use(remarkGfm)
        .use(remarkStringify, {
            bullet: '-',
            listItemIndent: 'one',
            ruleRepetition: 10,
            tightDefinitions: true,
        }) // Serialize syntax tree to md
        .freeze();
}

export type {Config}
export {html_to_markdown, markdown_to_html, configure}
