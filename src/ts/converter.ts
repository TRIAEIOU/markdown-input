import type {Element as HastElement} from 'hast';
import {fromMarkdown as markdownToMdast} from 'mdast-util-from-markdown';
import {toHast as mdastToHast} from 'mdast-util-to-hast';
import {toHtml as hastToHtml} from 'hast-util-to-html';
import {fromHtml as hastFromHtml} from 'hast-util-from-html';
import {toMdast as hastToMdast} from 'hast-util-to-mdast';
import {toMarkdown as mdastToMarkdown} from 'mdast-util-to-markdown';
import {defListToMarkdown, defListFromMarkdown, defListHastHandlers} from 'mdast-util-definition-list';
import {definitionListHastToMdast} from 'hast-util-definition-list';
import {extendedTableSyntax, extendedTableFromMarkdown, extendedTableToMarkdown, extendedTable as extendedTableHandler, extendedTableToHast} from 'mdast-hast-extension-extended-table';
import {createInline} from 'mdast-hast-extension-inline-factory';
import {directive} from 'micromark-extension-directive';
import {directiveFromMarkdown, directiveToMarkdown} from 'mdast-util-directive';
'micromark-extension-directive/lib/html';
import {inlineMediaHastHandler, inlineMediaMdastHandler} from './Unified/inline-media'
import {defList} from 'micromark-extension-definition-list';
import {emStrongToIB, iBToEmStrong} from './Unified/em-strong-swap-i-b';
import {breakSpaces} from './Unified/break-spaces';
import {mdastParagraphToHastBr, hastBrToMdastParagraph} from './Unified/paragraph-break-swap';
import {hastToMdastCorrectList, mdastToHastCorrectList} from './Unified/correct-list'
import {hastToMdastTableNewline, mdastToHastTableNewline} from './Unified/table-newline';
import {remove} from 'unist-util-remove'

const underline = createInline({
    markdownSymbol: '_',
    mdastNode: 'underline',
    htmlNode: 'u'
});
const superscript = createInline({
    markdownSymbol: '^',
    mdastNode: 'superscript',
    htmlNode: 'sup'
});
const subscript = createInline({
    markdownSymbol: '~',
    mdastNode: 'subscript',
    htmlNode: 'sub'
});
const strikethrough = createInline({
    markdownSymbol: '~~',
    mdastNode: 'strikethrough',
    htmlNode: 'del'
});
const NEWLINE = 'Table newline'
const HARDBREAK = 'Hard break'

type Config = {
    'Table newline'?: string,
    'Hard break'?: 'spaces'|'backslash'
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
    html = trailing_cloze(html);
    const hast = hastFromHtml(html);
    const mdast = hastToMdast(hast, {
        handlers: {
            table: extendedTableHandler,
            ...underline.hastHandler,
            ...superscript.hastHandler,
            ...subscript.hastHandler,
            ...strikethrough.hastHandler,
            ...definitionListHastToMdast,
            ...inlineMediaHastHandler,
            ...iBToEmStrong,
            ...hastBrToMdastParagraph,
            ...hastToMdastCorrectList,
            ...(_config[NEWLINE]
                ? hastToMdastTableNewline(_config[NEWLINE])
                : {})
        }
    });
    const extensions = [
        extendedTableToMarkdown(),
        underline.mdastSerialization,
        superscript.mdastSerialization,
        subscript.mdastSerialization,
        strikethrough.mdastSerialization,
        defListToMarkdown,
        directiveToMarkdown,
    ];
    if (_config[HARDBREAK] === "spaces") extensions.push(breakSpaces);
    const md = mdastToMarkdown(mdast, {
        extensions: extensions,
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
            ...inlineMediaMdastHandler,
            ...mdastParagraphToHastBr,
            ...mdastToHastCorrectList,
            ...(_config[NEWLINE]
                ? mdastToHastTableNewline(_config[NEWLINE])
                : {})
        },
        allowDangerousHtml: true
    });
    // Strip out newlines
    remove(hast, (nd) => {
        return !nd.position && nd.type === 'text' && nd.value === '\n'
    })
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
