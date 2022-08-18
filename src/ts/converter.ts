import type {Element as HastElement, ElementContent as HastElementContent} from 'hast';
import {fromMarkdown as markdownToMdast} from 'mdast-util-from-markdown';
//import {toHast as mdastToHast} from './Unified/mdast-util-to-hast';
import {toHast as mdastToHast} from 'mdast-util-to-hast';
import {toHtml as hastToHtml} from 'hast-util-to-html';
import {fromHtml as hastFromHtml} from 'hast-util-from-html';
import {toMdast as hastToMdast} from './Unified/hast-util-to-mdast';
import {toMarkdown as mdastToMarkdown} from 'mdast-util-to-markdown';
import {defListToMarkdown} from './Unified/mdast-util-definition-list';
import {defListFromMarkdown} from './Unified/mdast-util-definition-list';
import {defListHastHandlers} from './Unified/mdast-util-definition-list';
import {definitionListHastToMdast} from './Unified/hast-util-definition-list';
import {extendedTableSyntax, extendedTableFromMarkdown, extendedTableToMarkdown, extendedTable as extendedTableHandler, extendedTableToHast} from './Unified/mdast-hast-extension-extended-table/src';
import {createEmphasis} from './Unified/mdast-hast-extension-emphasis-factory/src';
import {directive} from 'micromark-extension-directive';
import {directiveFromMarkdown, directiveToMarkdown} from 'mdast-util-directive';
'micromark-extension-directive/lib/html';
import {inlineMediaHastHandler, inlineMediaMdastHandler} from './Unified/inline-media'
import {defList} from 'micromark-extension-definition-list';
import {emStrongToIB, iBToEmStrong} from './Unified/em-strong-swap-i-b';
import {phrasing as hastPhrasing} from 'hast-util-phrasing';
import {u} from 'unist-builder';

const underline = createEmphasis({
    markdownSymbol: '_',
    mdastNode: 'underline',
    htmlNode: 'u'
});
const superscript = createEmphasis({
    markdownSymbol: '^',
    mdastNode: 'superscript',
    htmlNode: 'sup'
});
const subscript = createEmphasis({
    markdownSymbol: '~',
    mdastNode: 'subscript',
    htmlNode: 'sub'
});
const strikethrough = createEmphasis({
    markdownSymbol: '~~',
    mdastNode: 'strikethrough',
    htmlNode: 'del'
});

type Config = {
    table_newline?: string
}

interface Paragraph {
    start: number;
    end: number;
    br: number;
}

// Module scope configuration
const _config = {};

/////////////////////////////////////////////////////////////////////////////
// Parse out current cloze ordinal from string, 0 if none (i.e. increment one for next)
const CLOZE_ORD_RE = new RegExp(String.raw`{{c(\d+)::`, 'g');
function parse_cloze(str:string): number {
    let ord: number = 0;
    let match: RegExpExecArray | null;
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
    function trailing_cloze(html: string) {
        return html.replace(MOVE_CLOZE_IN_RE, (match, cont, tail) => {
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
    }

    // Go through hast changing <br> to <p> and newline symbol as needed
    function morph_hast(node: HastElement, opts: object = {}) {
        const paras: Paragraph[] = [];
        let para_start = -1;
        let br_cnt = 0;
        // Find paragraph breaks, and parse <br> to newline symbols in tables
        const len = node.children?.length;
        for (let i = 0; i < len; i++) {
            const child = <any>node.children[i];
            // Recurse
            if (child.children?.length) {
                const _opts = {...opts};
                if (child.tagName === 'th' || child.tagName === 'td')
                    _opts['table_cell'] = true;
                morph_hast(child, _opts);
            }
            // Replace <br> with newline symbols in table cells
            // (and we can skip <p> parsing)
            if (_config['table_newline']
                && opts['table_cell']
                && child.tagName === 'br') {
                    child.type = 'text';
                    child.value = _config['table_newline'];
                    delete child.children;
                    delete child.tagName;
            } else { // Mark spacing between <p>'s
                if (hastPhrasing(child)) {
                    if (para_start < 0) para_start = i;
                    if (child.tagName === 'br') {
                        br_cnt++;
                    }
                    else {
                        if (br_cnt > 1) {
                            paras.push({start: para_start, end: i, br: br_cnt});
                            para_start = i;
                        }
                        br_cnt = 0;

                        if (child.type === 'text' && opts['table_cell']) {
                            const txt = child.value.split('¨');

                        }
                    }
                } else {
                    if (para_start > -1) {
                        paras.push({start: para_start, end: i, br: br_cnt});
                        para_start = -1;
                    }
                    br_cnt = 0;
                }
            }
        }

        const nd = <any>node;
        // Special case: close root node last child
        if (para_start > -1 && nd.type === 'root')
            paras.push({start: para_start, end: nd.children.length, br: br_cnt});

        // Modify found paragraphs and splice with rest
        if (paras.length) {
            const output: HastElementContent[] = [];
            let last_end = 0;
            let brs = 2;
            const len = paras.length;
            for (let i = 0; i < len; i++) {
                // Last node
                if (i === len - 1 && nd.tagName !== 'li') brs = 0;
                output.push(
                    ...node.children.slice(last_end, paras[i].start),
                    {
                        type: 'element',
                        tagName: 'p',
                        children: node.children.slice(
                            paras[i].start,
                            paras[i].end - (paras[i].br >= brs
                                ? brs
                                : 0)
                        )
                    }
                );
                last_end = paras[i].end;
            }
            if (paras[paras.length - 1].end < node.children.length)
                output.push(...node.children.slice(paras[paras.length - 1].end));
            node.children = output;
        }
    }

    html = trailing_cloze(html);
    const hast = hastFromHtml(html);
    // Convert <br> to <p> in hast as appropriate for proper mdast conversion
    morph_hast(<any>hast);
    const mdast = hastToMdast(hast, {
        handlers: {
            table: extendedTableHandler,
            ...underline.hastHandler,
            ...superscript.hastHandler,
            ...subscript.hastHandler,
            ...strikethrough.hastHandler,
            ...definitionListHastToMdast,
            ...inlineMediaHastHandler,
            ...iBToEmStrong
        }    
    });
    const md = mdastToMarkdown(mdast, {
        extensions: [
            extendedTableToMarkdown(),
            underline.mdastSerialization,
            superscript.mdastSerialization,
            subscript.mdastSerialization,
            strikethrough.mdastSerialization,
            defListToMarkdown,
            directiveToMarkdown
        ],
        bullet: '-',
        listItemIndent: 'one',
        ruleRepetition: 10,
        tightDefinitions: true,
        fences: true
    }); 
    return [md, parse_cloze(md)];
}

/////////////////////////////////////////////////////////////////////////////
// Convert markdown to HTML, including postprocessing
const MOVE_CLOZE_OUT_RE = new RegExp(String.raw`({{c\d+::)(.*?)}}((?:\s*<\/li>\s*<\/(?:ol|ul)>)+)`, 'gsi');
const LIST_END_RE = new RegExp(String.raw`<\/(ol|ul)>`, 'gi');

async function markdown_to_html(md: string): Promise<string> {
    // Recursively remove `\n` and change `<p>` to `<br><br>`,
    // `<br>` to newline symbol in tables
    function morph_hast(nd: HastElement, opts: object = {}) {
        if(!nd.children.length) return;

        // Strip `\n` children (for easier `<br>` logic)
        nd.children = nd.children.filter(child => {
            return !(child.type === 'text' && child.value === '\n'); 
        });
        const len = nd.children.length;
        if (!len) return;

        const out: HastElementContent[] = [];
        const br: HastElement = { type: 'element', tagName: 'br', children: [] };
        const blocks = ['p', 'hr']
        if (nd.tagName === 'li') blocks.push('ul', 'ol');

        for (let i = 0; i < len; i++) {
            const child = <any>nd.children[i];
            if (child.type === 'element') {
                // Recurse
                if (child.children.length) {
                    const _opts = {...opts};
                    if(child.tagName === 'th' || child.tagName === 'td')
                        _opts['table_cell'] = true;
                    morph_hast(child, _opts);
                }
                // Insert <br>'s if prev was <p>
                if (i && (<HastElement>nd.children[i-1])?.tagName === 'p'
                    && blocks.includes(child.tagName))
                        out.push(br, br);
                // Special case, also insert <br> if last el and <p>
                if (child.tagName === 'p') {
                    out.push(...child.children);
                    if (i === len - 1 && nd.tagName === 'li')
                        out.push(br, br);
                } else out.push(child);
              // Replace newline symbol for <br> in tables
            } else if (_config['table_newline']
                        && child.type === 'text'
                        && opts['table_cell']) {
                const txt = child.value.split(_config['table_newline']);
                const last = txt.length - 1;
                txt.forEach((el: string, i: number) => {
                    out.push(u('text', el));
                    if (i < last) out.push(br);
                });
            } else out.push(child);
        }
        nd.children = out;
    }

    const mdast = markdownToMdast(md, 'utf-8', {
        extensions: [
            extendedTableSyntax,
            underline.markdownSyntax,
            superscript.markdownSyntax,
            subscript.markdownSyntax,
            strikethrough.markdownSyntax,
            defList,
            directive()
        ],
        mdastExtensions: [
            extendedTableFromMarkdown,
            underline.mdastNodeInsertion,
            superscript.mdastNodeInsertion,
            subscript.mdastNodeInsertion,
            strikethrough.mdastNodeInsertion,
            defListFromMarkdown,
            directiveFromMarkdown
        ]
    });
    const hast = <HastElement>mdastToHast(mdast, {
        handlers: {
            ...extendedTableToHast,
            ...underline.mdastHandler,
            ...superscript.mdastHandler,
            ...subscript.mdastHandler,
            ...strikethrough.mdastHandler,
            ...defListHastHandlers,
            ...emStrongToIB,
            ...inlineMediaMdastHandler
        },
        allowDangerousHtml: true
    });
    morph_hast(hast); // Strip newlines and convert <p> to <br>
    let html = hastToHtml(hast, {
        allowDangerousHtml: true,
        allowDangerousCharacters: true
    });

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
    for (const k in cfg) _config[k] = cfg[k];
}

export type {Config}
export {html_to_markdown, markdown_to_html, configure}
