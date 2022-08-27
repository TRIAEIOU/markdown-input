import {get} from "svelte/store"
// @ts-ignore FIXME: how to import correctly?
import {NoteEditorAPI} from "@anki/ts/editor/NoteEditor.svelte"
declare var NoteEditor: {
    context: any,
    lifecycle: any,
    instances: NoteEditorAPI[]
}
import {paste_html, select_all} from './utils'

// For whatever reason TS ShadowRoot does not contain getSelection()
interface _ShadowRoot extends ShadowRoot { getSelection(): Selection }

function get_current_html(index: number): string {
    const editor = NoteEditor.instances[0]
    return get(editor?.fields[index]?.editingArea?.content) as string || ""
}

function set_current_html(index: number, html: string) {
    const editor = NoteEditor.instances[0]
    const ed_area = editor?.fields[index]?.editingArea
    ed_area?.content.set(html)
    ed_area?.refocus()
}

// This is an ugly hack as I can't figure out how to "flatten" promises
function get_selected_html(index: number): string {
    // Expand selection to complete HTML tags
    const sr = document.activeElement.shadowRoot as _ShadowRoot
    const ae = sr.activeElement
    const sel = sr.getSelection()
    let rng = sel.getRangeAt(0)

    let root = rng.commonAncestorContainer
    if (root !== ae)
        while (root.parentElement !== ae) root = root.parentElement
    let start = rng.startContainer
    if (start !== root)
        while (start.parentElement !== root) start = start.parentElement
    let end = rng.endContainer
    if (end !== root)
        while (end.parentElement !== root) end = end.parentElement

    sel.removeAllRanges()
    rng = new Range()
    rng.setStartBefore(start)
    rng.setEndAfter(end)
    sel.addRange(rng)

    // Get expanded selection
    const tmp = document.createElement('div')
    tmp.append(rng.cloneContents())
    return tmp.innerHTML
}

// This is an ugly hack as I can't figure out how to "flatten" promises
function set_selected_html(index: number, html: string) {
/*    const sr = document.activeElement?.shadowRoot as _ShadowRoot
    let nd = sr?.querySelector('anki-editable')
    if (nd.firstChild && nd.firstChild.nodeName.toLowerCase() !== '#text') {
        const sel = sr.getSelection()
        let usr_rng = sel.getRangeAt(0)
        select_all()
        let all_rng = sel.getRangeAt(0)
        if (usr_rng.toString() === all_rng.toString()) {
            nd.innerHTML = '<br>' + nd.innerHTML + '<br>'
            select_all()
        } else {
            sel.removeAllRanges()
            sel.addRange(usr_rng)
        }
    }
*/    paste_html(html)
}

export {get_current_html, set_current_html, get_selected_html, set_selected_html}