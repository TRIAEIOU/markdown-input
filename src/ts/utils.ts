/**
 * Wrappers around browser calls that may change
 */

declare function pasteHTML(html: string, e: boolean): void

function paste_html(html: string) {
    pasteHTML(html, true)
}

function select_all() {
    document.execCommand('selectAll')
}

export {paste_html, select_all}
