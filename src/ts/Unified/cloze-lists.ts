import {Node} from 'unist'
import {phrasing as mdastPhrasing} from 'mdast-util-phrasing'
import {u} from 'unist-builder'

/////////////////////////////////////////////////////////////////////////////
// Move trailing list item cloze out
function expand_cloze(node: Node): Node {
    const nd = node as any
    const cds:any[] = []
    nd.children?.forEach((cnd: any) => {
        cds.push(cnd)
        if ((cnd.tagName === 'ol' || cnd.tagName === 'ul')
            && expand_list(cnd)) {
                // Append }} outside list, inside is already truncated
            cds.push(u('text', '}}'))
        }
    })
    return node;

    function expand_list(node: Node): boolean {
        const nd = node as any
        const listlen = nd.children.length
        const litm = nd.children[listlen - 1]
        const litmlen = litm.children?.length
        if (litmlen && litm.children[litmlen - 1].value?.endsWith('}}')
            && !litm.children.some(_nd => search_phrasing(_nd))) {
                // Truncate away trailing }}
                const tmp = litm.children[litmlen - 1].value
                litm.children[litmlen - 1].value = tmp.subString(0, tmp.length - 2)
                return true
        }

        return false
    }

    function search_phrasing(node: Node): boolean {
        if (!mdastPhrasing(node)) return false
        const nd = node as any
        if (nd.value?.match(/{{c\d+::/)) return true
        return nd.children.some(_nd => search_phrasing(_nd))
    }
}

/////////////////////////////////////////////////////////////////////////////
// Move trailing list item cloze out
function collapse_cloze(node: Node): Node {
    return node
}

export {expand_cloze, collapse_cloze}