import type {Element} from 'hast'
import type {Content as MdastContent} from 'mdast'
import type {H as MdastH} from 'mdast-util-to-hast/lib'
import type {H as HastH} from 'hast-util-to-mdast/lib/types'
import {tableCell} from 'hast-util-to-mdast/lib/handlers/table-cell'
import {table} from 'mdast-util-to-hast/lib/handlers/table'
import {u} from 'unist-builder'

function hastToMdastTableNewline(sym: string) {
    return {
        td: newline,
        th: newline
    }

    function newline(h: HastH, nd: Element) {
        replace(nd)
        return tableCell(h, nd)

        function replace(_nd) {
            _nd?.children.forEach((__nd, i) => {
                if (__nd.tagName === 'br')
                    _nd.children[i] = u('text', sym)
                else if (__nd?.children?.length) replace(__nd)
            })
        }
    }
}

function mdastToHastTableNewline(sym: string) {
    const br = u('break')

    return {
        table: newline
    }

    function newline(h: MdastH, nd: any, pt: MdastContent) {
        nd.children.forEach(row => row.children.forEach(cell => replace(cell)))
        return table(h, nd)

        function replace(nd) {
            const cds = []
            nd?.children?.forEach((_nd, i) => {
                if (_nd.type === 'text') {
                    const txts = _nd.value.split(sym)
                    const tlen = txts.length
                    txts.forEach((txt, i) => {
                        cds.push(u('text', txt))
                        if (i !== tlen - 1) cds.push(br)
                    })
                } else {
                    if (_nd.children.length) replace(_nd)
                    cds.push(_nd)
                }
            })
            nd.children = cds
        }
    }
}

export {hastToMdastTableNewline, mdastToHastTableNewline}