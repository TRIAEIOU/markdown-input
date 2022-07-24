import "./Showdown.extensions/extendedTables.js";
import "./Showdown.extensions/asteriskHr.js";
import "./Showdown.extensions/superscript.js";
import "./Showdown.extensions/mediaTags.js"
import "./Showdown.extensions/flattenSpanDiv.js"
import showdown from "./showdown.js";

type Config = {
    table_newline?: string
}

const converter = new showdown.Converter({extensions: ['extendedTables', 'superscript', 'asteriskHr', 'mediaTags', 'flattenSpanDiv']});
converter.setFlavor('github');
converter.setOption('underline', true);
converter.setOption('strikethrough', true);
converter.setOption('simpleLineBreaks', true);
converter.setOption('tablesHeaderId', false);
converter.setOption('noHeaderId', true);

/////////////////////////////////////////////////////////////////////////////
// Remove all non-rendering spaces
const TAGS = ['!--.*?--', '!DOCTYPE', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'col', 'colgroup', 'data', 'datalist', 'dd', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h\\d', 'head', 'header', 'hr', 'html', 'iframe', 'img', 'input', 'label', 'legend', 'li', 'link', 'main', 'map', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture', 'progress', 'rp', 'ruby', 'script', 'section', 'select',  'source', 'style', 'summary', 'svg', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'ul', 'var', 'video'].join('|');
const TAG_ATTRIBUTE = String.raw`[^\t\n\f />"'=]`;
const MINIFY_RE = RegExp(String.raw`[\s\n]*(<[/]?(${TAGS})(?:[ \t]*${TAG_ATTRIBUTE}+="(?:[^"\\]+|\.)*")*\s*(?:\/\s*)?>)[\s\n]*`, 'gsi');
function minify(html: string): string {
    return html.replace(MINIFY_RE, '$1');
}

/////////////////////////////////////////////////////////////////////////////
// Parse out current cloze ordinal from HTML, 0 if none (i.e. increment one for next)
const CLOZE_ORD_RE = new RegExp(String.raw`{{c(\d+)::`, 'g');
function parse_cloze(html:string): number {
    let ord: number = 0;
    let match: RegExpExecArray;
    while ((match = CLOZE_ORD_RE.exec(html)) !== null) {
        const o = parseInt(match[1]);
        if (o > ord) ord = o;
    }
    return ord;
}

/////////////////////////////////////////////////////////////////////////////
// Convert HTML to markdown, including preparsing
const MOVE_TAG_AFTER_BR_RE = new RegExp(String.raw`((?:<(?:b|u|i|del|sup|sub|h\d)(?:[ ][^>]*)?>)+)<br>`, 'gi');
const MOVE_TAG_BEFORE_BR_RE = new RegExp(String.raw`<br>((<\/(?:b|u|i|del|sup|sub|h\d)(?:[][^>]*)?>)+)`, 'gi');
const MOVE_CLOZE_IN_RE = new RegExp(`({{c\d+::)(.*?)}}`, 'gsi');
const TAIL_OPEN_RE = new RegExp(String.raw`<(?:ol|ul)[^>]*>`, 'gi');
const TAIL_CLOSE_RE = new RegExp(String.raw`<\/(?:ol|ul)[^>]*>`, 'gi');
const TAIL_LIST_SEARCH_RE = new RegExp(String.raw`((?:<\/li>\s*<\/(?:ul|ol)>\s*)+)$`, 'si');
function html_to_markdown(html:string): [string, number] {
    html = minify(html);
    html = html.replace(MOVE_TAG_AFTER_BR_RE, '<br>$1');
    html = html.replace(MOVE_TAG_BEFORE_BR_RE, '$1<br>');
    /*
    We should convert html to "markdown appropriate"
    Convert divs in block display
      - in <td>, <th>, <li> to <br>
      - outside tables to <p></p>, well, in the end maybe <br>
    Convert spans depending on style bold etc to <e><i><b> etc
    */
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
    return [converter.makeMarkdown(html), parse_cloze(html)];
}

const P_TO_BR_RE = new RegExp(String.raw`<\/p>\s*<p>`, 'gsi');
const STRIP_P_RE = new RegExp(String.raw`<\/?p>`, 'gi');
const MOVE_CLOZE_OUT_RE = new RegExp(String.raw`({{c\d+::)(.*?)}}((?:\s*<\/li>\s*<\/(?:ol|ul)>)+)`, 'gsi');
const LIST_END_RE = new RegExp(String.raw`<\/(ol|ul)>`, 'gi');
/////////////////////////////////////////////////////////////////////////////
// Convert markdown to HTML, including postprocessing
function markdown_to_html(md: string): string {
    let html = converter.makeHtml(md);
    html = minify(html);
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

function configure(cfg: Config) {
    converter.setOption('tableNewline', cfg?.table_newline);
}

export type {Config}
export {html_to_markdown, markdown_to_html, configure}
