import {toHtml} from 'hast-util-to-html'
import {list as _list} from 'hast-util-to-mdast/lib/handlers/list'
import type {Content as MdastContent} from 'mdast'
import type {H as HastH} from 'hast-util-to-mdast'

/** 
 * Convert inline media (audio/video) hast node to mdast
 */
function listHastToMdast(h: HastH, node: any): void | MdastContent | MdastContent[] {
    return h.inTable
        ? h(node, 'html', toHtml(node, {allowDangerousHtml: true}))
        : _list(h, node)
}

const tableBlockInlineHtmlHastHandler = {
    ul: listHastToMdast,
    ol: listHastToMdast
}

export {tableBlockInlineHtmlHastHandler}