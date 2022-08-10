import { micromark } from 'Unified/micromark/packages/micromark/dev';
import {defList, defListHtml} from 'micromark-extension-definition-list';
import {defListToMarkdown} from 'Unified/mdast-util-definition-list';
import {definitionListHastToMdast} from 'Unified/hast-util-definition-list';
import {fromHtml as hastFromHtml} from 'hast-util-from-html';
import {toMdast as hastToMdast} from 'hast-util-to-mdast';
import {toMarkdown as mdastToMarkdown} from 'mdast-util-to-markdown';
import { extendedTableSyntax, extendedTableHtml, extendedTableToMarkdown, extendedTable as extendedTableHandler } from 'Unified/mdast-hast-extension-extended-table/src';
import {createEmphasis} from 'Unified/mdast-hast-extension-emphasis-factory/src';

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

    const hast = hastFromHtml(html, {
        fragment: true
    });
/*
    console.log('>>>>>>>>>>>>>>>>')
    console.log(JSON.stringify(hast, null, 1))
    console.log('>>>>>>>>>>>>>>>>')
*/
    const mdast = hastToMdast(hast, {
        handlers: {
            table: extendedTableHandler,
            ...underline.hastHandler,
            ...superscript.hastHandler,
            ...subscript.hastHandler,
            ...strikethrough.hastHandler,
            ...definitionListHastToMdast
        }    
    });
    const md = mdastToMarkdown(mdast, {
        extensions: [
            extendedTableToMarkdown(),
            underline.mdastSerialization,
            superscript.mdastSerialization,
            subscript.mdastSerialization,
            strikethrough.mdastSerialization,
            defListToMarkdown
        ],
        bullet: '-',
        listItemIndent: 'one',
        ruleRepetition: 10,
        tightDefinitions: true
    }); 
    const ord = parse_cloze(md);
    return [md, ord];
}

/////////////////////////////////////////////////////////////////////////////
// Convert markdown to HTML, including postprocessing
const P_TO_BR_RE = new RegExp(String.raw`<\/p>\s*<p>`, 'gsi');
const STRIP_P_RE = new RegExp(String.raw`<\/?p>`, 'gi');
const MOVE_CLOZE_OUT_RE = new RegExp(String.raw`({{c\d+::)(.*?)}}((?:\s*<\/li>\s*<\/(?:ol|ul)>)+)`, 'gsi');
const LIST_END_RE = new RegExp(String.raw`<\/(ol|ul)>`, 'gi');

async function markdown_to_html(md: string): Promise<string> {
    let html = micromark(md, 'utf-8', {
        extensions: [
            extendedTableSyntax,
            underline.markdownSyntax,
            superscript.markdownSyntax,
            subscript.markdownSyntax,
            strikethrough.markdownSyntax,
            defList
        ],
        htmlExtensions: [
            extendedTableHtml,
            underline.micromarkHtml,
            superscript.micromarkHtml,
            subscript.micromarkHtml,
            strikethrough.micromarkHtml,
            defListHtml
        ],
        allowDangerousHtml: true,
        noNonRenderedNewline: true
    });
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
}

export type {Config}
export {html_to_markdown, markdown_to_html, configure}
