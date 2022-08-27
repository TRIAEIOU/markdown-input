import type {Parent} from 'unist'
import type {Paragraph as MdastParagraph} from 'mdast'
import type {Element as HastElement, ElementContent as HastElementContent,
    Root as HastRoot} from 'hast'
import type {H as MdastH} from 'mdast-util-to-hast'
import type {H as HastH} from 'hast-util-to-mdast'
import {root} from 'hast-util-to-mdast/lib/handlers/root'
import {li} from 'hast-util-to-mdast/lib/handlers/li'
import {paragraph as mdastParagraph} from 'mdast-util-to-hast/lib/handlers/paragraph'
import {phrasing as hastPhrasing} from 'hast-util-phrasing'

// Call core handler and modify returned hast
// replacing `p-(p)` with `children - br - br - (p)`
// and `(p) - end` with `children`
function paragraphToBr(h: MdastH, nd: MdastParagraph, pt: Parent): HastElementContent[] {
    const br: HastElement = {type: 'element', tagName: 'br', children: []}
    const hast = (<HastElement>mdastParagraph(h, nd)).children
    let nxt = 0
    while(pt.children[nxt++] !== nd) ;
    if (nxt < pt.children.length && pt.children[nxt].type === 'paragraph')
        hast.push(br, br)
    return hast
}

// Called with both root and hast list items and mutates children
function brToP(nd: HastElement, paraLast: boolean) {
    const cds = []
    let buf = []
    let pstart = -1
    let brs = 0

    // Parse out paragraphs
    const len = nd.children.length
    nd.children.forEach((cd, i) => {
        if (hastPhrasing(cd)) {
            if (pstart < 0) pstart = i
            if ((<HastElement>cd).tagName === 'br') brs++
            else {
                if (brs > 1) {
                    flush()
                    pstart = i
                }
                brs = 0
            }
            buf.push(cd)
        } else {
            if (pstart > -1) flush()
            brs = 0
            cds.push(cd)
        }
    })
    // Push any open paragraph
    if (pstart > -1) {
        if (paraLast) flush()
        else cds.push(...buf)
    }
    nd.children = cds

    // Append and reset buffer and counters
    function flush() {
        cds.push({
            type: 'element', tagName: 'p',
            children: buf.slice(0, brs ? -brs : undefined)
        })
        buf = [], pstart = -1
    }
}

const hastBrToMdastParagraph = {
    root: (h: HastH, nd: HastRoot) => {
            // @ts-expect-error - casting makes code unreadable
        brToP(nd.children[0]?.tagName === 'html'
            // @ts-expect-error - casting makes code unreadable
            ? nd.children[0].children[1]
            : nd,
            true)
        return root(h, nd)
    },
    li: (h: HastH, nd: HastElement) => {
        brToP(nd, false)
        return li(h, nd)
    }
}

const mdastParagraphToHastBr = {
    paragraph: paragraphToBr
}


export {mdastParagraphToHastBr, hastBrToMdastParagraph}