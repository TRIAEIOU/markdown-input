import type {Element as HastElement} from 'hast'
import {fromMarkdown as markdownToMdast} from 'mdast-util-from-markdown'
import {toHast as mdastToHast} from 'mdast-util-to-hast'
import {toHtml as hastToHtml} from 'hast-util-to-html'
import {fromHtml as hastFromHtml} from 'hast-util-from-html'
import {toMdast as hastToMdast} from 'hast-util-to-mdast'
import {toMarkdown as mdastToMarkdown} from 'mdast-util-to-markdown'
import {defListToMarkdown, defListFromMarkdown, defListHastHandlers} from 'mdast-util-definition-list'
import {definitionListHastToMdast} from 'hast-util-definition-list'
import {extendedTableSyntax, extendedTableFromMarkdown, extendedTableToMarkdown, extendedTable as extendedTableHandler, extendedTableToHast} from 'mdast-hast-extension-extended-table'
import {gfmTableFromMarkdown, gfmTableToMarkdown} from 'mdast-util-gfm-table'
import {gfmTable} from 'micromark-extension-gfm-table'
import {Configuration, createInline} from 'mdast-hast-extension-inline-factory'
import {directive} from 'micromark-extension-directive';
import {directiveFromMarkdown, directiveToMarkdown} from 'mdast-util-directive'
'micromark-extension-directive/lib/html'
import {inlineMediaHastHandler, inlineMediaMdastHandler} from './Unified/inline-media'
import {defList} from 'micromark-extension-definition-list'
import {emStrongToIB, iBToEmStrong} from './Unified/em-strong-swap-i-b'
import {breakSpaces} from './Unified/break-spaces'
import {mdastParagraphToHastBr, hastBrToMdastParagraph} from './Unified/paragraph-break-swap'
import {hastToMdastCorrectList, mdastToHastCorrectList} from './Unified/correct-list'
import {hastToMdastTableNewline, hastCellTableNewline} from './Unified/table-newline'
import {remove} from 'unist-util-remove'
import {table as gfmTableHandler} from 'mdast-util-to-hast/lib/handlers/table'

const HARDBREAK = 'Hard break'
const TABLE_STYLE = "Table style"
const NEWLINE = 'Table newline'
const DEF_LIST = "Definition lists"
const INLINE_MEDIA = "Inline media"
const INLINES = "Inlines"
const MARKDOWN = "Markdown format"

// Module scope configuration
const config = {
    hast_to_mdast: {
        handlers: {
            ...iBToEmStrong,
            ...hastBrToMdastParagraph,
            ...hastToMdastCorrectList
        }
    },
    mdast_to_markdown: {
        extensions: []
    },
    markdown_to_mdast: {
        extensions: [],
        mdastExtensions: []
    },
    mdast_to_hast: {
        handlers: {
            ...emStrongToIB,
            ...mdastParagraphToHastBr,
            ...mdastToHastCorrectList    
        }
    }
};

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

function html_to_markdown(html:string): [string, number] {
    if (!html) return ['', 0]
    const hast = hastFromHtml(html);
    const mdast = hastToMdast(hast, { handlers: config.hast_to_mdast.handlers });
    const md = mdastToMarkdown(mdast, config.mdast_to_markdown); 
    return [md, parse_cloze(md)];
}

/////////////////////////////////////////////////////////////////////////////
// Convert markdown to HTML, including postprocessing
const MOVE_CLOZE_OUT_RE = new RegExp(String.raw`({{c\d+::)(.*?)}}((?:\s*<\/li>\s*<\/(?:ol|ul)>)+)`, 'gsi');
const LIST_END_RE = new RegExp(String.raw`<\/(ol|ul)>`, 'gi');

function markdown_to_html(md: string): string {
    if (!md) return ''

    const mdast = markdownToMdast(md, 'utf-8', {
        extensions: config.markdown_to_mdast.extensions,
        mdastExtensions: config.markdown_to_mdast.mdastExtensions
    });
    const hast = <HastElement>mdastToHast(mdast, {
        handlers: config.mdast_to_hast.handlers,
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

    return html;
}

/////////////////////////////////////////////////////////////////////////////
// Setup converter MD ⇔ HTML from config.json input
function init(cfg: {}) {
    // Setup converters
    if (cfg[MARKDOWN]) {
        for (const [k, v] of Object.entries(cfg[MARKDOWN]))
            config.mdast_to_markdown[k] = v
    }
    if (cfg[DEF_LIST]) {
        for (const [k, v] of Object.entries(definitionListHastToMdast))
            config.hast_to_mdast.handlers[k] = v
        for (const [k, v] of Object.entries(defListHastHandlers))
            config.mdast_to_hast.handlers[k] = v
        config.mdast_to_markdown.extensions.push(defListToMarkdown)
        config.markdown_to_mdast.extensions.push(defList)
        config.markdown_to_mdast.mdastExtensions.push(defListFromMarkdown)
    }
    if (cfg[INLINE_MEDIA]) {
        for (const [k, v] of Object.entries(inlineMediaHastHandler))
            config.hast_to_mdast.handlers[k] = v
        for (const [k, v] of Object.entries(inlineMediaMdastHandler))
            config.mdast_to_hast.handlers[k] = v
        config.mdast_to_markdown.extensions.push(directiveToMarkdown)
        config.markdown_to_mdast.extensions.push(directive())
        config.markdown_to_mdast.mdastExtensions.push(directiveFromMarkdown)
    }
    if (cfg[HARDBREAK]?.toLowerCase() === "spaces")
        config.mdast_to_markdown.extensions.push(breakSpaces)
    if (cfg[TABLE_STYLE]?.toLowerCase() === 'extended') {
        config.mdast_to_hast.handlers['table'] = cfg[NEWLINE]
            ?   (h, nd) => {
                    const el = extendedTableToHast(h, nd)
                    hastCellTableNewline(el, cfg[NEWLINE])
                    return el
                }
            :   extendedTableToHast
        if (cfg[NEWLINE]) {
            for (const [k, v] of Object.entries(hastToMdastTableNewline(cfg[NEWLINE])))
                config.hast_to_mdast.handlers[k] = v
        }
        config.hast_to_mdast.handlers['table'] = extendedTableHandler
        config.mdast_to_markdown.extensions.push(extendedTableToMarkdown())
        config.markdown_to_mdast.extensions.push(extendedTableSyntax)
        config.markdown_to_mdast.mdastExtensions.push(extendedTableFromMarkdown)
    } else if (cfg[TABLE_STYLE]?.toLowerCase() === 'gfm') {
        if (cfg[NEWLINE]) {
            config.mdast_to_hast.handlers['table'] = (h, nd) => {
                const el = gfmTableHandler(h, nd)
                hastCellTableNewline(el, cfg[NEWLINE])
                return el
            }
            for (const [k, v] of Object.entries(hastToMdastTableNewline(cfg[NEWLINE])))
                config.hast_to_mdast.handlers[k] = v
        }
        config.mdast_to_markdown.extensions.push(gfmTableToMarkdown())
        config.markdown_to_mdast.extensions.push(gfmTable)
        config.markdown_to_mdast.mdastExtensions.push(gfmTableFromMarkdown)
    }
    
    for (const inline of cfg[INLINES]) {
        const ext = createInline(<Configuration>inline)
        for (const [k, v] of Object.entries(ext.hastHandler))
            config.hast_to_mdast.handlers[k] = v
        config.mdast_to_markdown.extensions.push(ext.mdastSerialization)
        config.markdown_to_mdast.extensions.push(ext.markdownSyntax)
        config.markdown_to_mdast.mdastExtensions.push(ext.mdastNodeInsertion)
        for (const [k, v] of Object.entries(ext.mdastHandler))
            config.mdast_to_hast.handlers[k] = v
    }

}

export {html_to_markdown, markdown_to_html, init}
