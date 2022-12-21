import { get } from "svelte/store"
// @ts-ignore FIXME: how to import correctly?
import type { NoteEditorAPI } from "anki/ts/editor/NoteEditor.svelte"
// @ts-ignore FIXME: how to import correctly?
import type { EditorFieldAPI, EditingInputAPI } from "anki/ts/editor/EditorField.svelte"
// @ts-ignore FIXME: how to import correctly?
import type { RichTextInputAPI } from "anki/ts/editor/rich-text-input"
// @ts-ignore FIXME: how to import correctly?
import type { PlainTextInputAPI } from "anki/ts/editor/plain-text-input"
import { create_editor, get_selections, set_selections } from "./editor"
import type { MDIEditorView } from "./editor"
import { html_to_markdown, markdown_to_html } from "./converter"
import { SelectionRange } from "@codemirror/state"

const FIELD_DEFAULT = 'Default field state'
const MD = '<svg style="vertical-align:baseline;margin-right:5px;" height="12" fill="none" viewBox="0 0 208 128" xmlns="http://www.w3.org/2000/svg"><g fill="currentColor"><path clip-rule="evenodd" d="m15 10c-2.7614 0-5 2.2386-5 5v98c0 2.761 2.2386 5 5 5h178c2.761 0 5-2.239 5-5v-98c0-2.7614-2.239-5-5-5zm-15 5c0-8.28427 6.71573-15 15-15h178c8.284 0 15 6.71573 15 15v98c0 8.284-6.716 15-15 15h-178c-8.28427 0-15-6.716-15-15z" fill-rule="evenodd"/><path d="m30 98v-68h20l20 25 20-25h20v68h-20v-39l-20 25-20-25v39zm125 0-30-33h20v-35h20v35h20z"/></g></svg>'
const MD_SOLID = '<svg style="vertical-align:baseline;margin-right:5px;" height="12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 208 128"><g fill="currentColor"><path d="M193 128H15a15 15 0 0 1-15-15V15A15 15 0 0 1 15 0h178a15 15 0 0 1 15 15v98a15 15 0 0 1-15 15zM50 98V59l20 25 20-25v39h20V30H90L70 55 50 30H30v68zm134-34h-20V30h-20v34h-20l30 35z"/></g></svg>'

const _config = {
    'Default field state': 'rich text',
    'Cycle rich text/Markdown': false
}

/////////////////////////////////////////////////////////////////////////////
// Add Markdown Input data to editor field
interface MDInputAPI {
    container: HTMLElement,
    editor: MDIEditorView,
    badge: HTMLSpanElement,
    refocus: readonly SelectionRange[],
    toggle(): void
}

interface MDInputElement extends HTMLElement {
    markdown_input: MDInputAPI
}

/////////////////////////////////////////////////////////////////////////////
// Get NoteEditor
const editor = (): {
    context: any,
    lifecycle: any,
    instances: NoteEditorAPI[]
} => {
    return require('anki/NoteEditor')
}

/////////////////////////////////////////////////////////////////////////////
// Get the rich text input of a field
function rich_edit(field: EditorFieldAPI): RichTextInputAPI | undefined {
    return  (get(field.editingArea.editingInputs) as EditingInputAPI[])
            .find(input => input?.name === "rich-text")
}

/////////////////////////////////////////////////////////////////////////////
// Get the plain text input of a field
function plain_edit(field: EditorFieldAPI): PlainTextInputAPI | undefined {
    return  (get(field.editingArea.editingInputs) as EditingInputAPI[])
            .find(input => input?.name === "plain-text")
}

/////////////////////////////////////////////////////////////////////////////
// Return wether an input element is hidden by attribute or class
function hidden(el: HTMLElement) {
    if (!el) return undefined
    return Boolean(el.hidden || el.classList.contains('hidden'))
}

/////////////////////////////////////////////////////////////////////////////
// Get ancestor matching a selector
function ancestor(descendant: HTMLElement, selector: string) {
    while (descendant && !descendant.matches(selector))
            descendant = descendant.parentElement
    return descendant
}

/////////////////////////////////////////////////////////////////////////////
// Focus the editor of a an input element
function focus(input: HTMLElement) {
    if (!input || input.hidden) return false
    let editor
    if (input.querySelector('.markdown-input > .cm-editor'))
        editor  = (ancestor(input, '.editor-field') as MDInputElement)
            ?.markdown_input?.editor
    else editor = input.querySelector('.CodeMirror > div > textarea') as HTMLElement
        || input.querySelector('.rich-text-editable')?.shadowRoot.querySelector('anki-editable')

    editor?.focus()
    return Boolean(editor)
}

/////////////////////////////////////////////////////////////////////////////
// Cycle to next field or first if none active
async function cycle_next() {
    const active = ancestor(document.activeElement as HTMLElement, '.editing-area > div')
    // Check for inputs in current field
    let input = older(active)
    // No inputs in current field, find prev field
    if (!input) {
        let fld_root = ancestor(active, '.editor-field')
            .parentElement as HTMLElement
        while (fld_root && !input) {
            fld_root = fld_root.nextElementSibling as HTMLElement
            input = fld_root?.querySelector('.editing-area')?.firstElementChild as HTMLElement
            if (hidden(input)) input = older(input)
        }
    }
    focus(input)

    function older(fld: HTMLElement) {
        let nxt = fld?.nextElementSibling as HTMLElement
        while (hidden(nxt)) nxt = nxt.nextElementSibling as HTMLElement
        return nxt
    }
}

/////////////////////////////////////////////////////////////////////////////
// Cycle to prev field or first if none active
async function cycle_prev() {
    const active = ancestor(document.activeElement as HTMLElement, '.editing-area > div')
    // Check for inputs in current field
    let input = younger(active)
    // No inputs in current field, find prev field
    if (!input) {
        let fld_root = ancestor(active, '.editor-field')
            .parentElement as HTMLElement
        while (fld_root && !input) {
            fld_root = fld_root.previousElementSibling as HTMLElement
            input = fld_root?.querySelector('.editing-area')?.lastElementChild as HTMLElement
            if (hidden(input)) input = younger(input)
        }
    }
    focus(input)

    function younger(fld: HTMLElement) {
        let prv = fld?.previousElementSibling as HTMLElement
        while (hidden(prv)) prv = prv.previousElementSibling as HTMLElement
        return prv
    }
}

/////////////////////////////////////////////////////////////////////////////
// Add editor to field
async function add_editor(field: EditorFieldAPI, hidden: boolean): Promise<MDInputAPI> {
    const field_el = await field.element as MDInputElement
    const ed_area_el = field_el.querySelector('div.editing-area')
    if (field_el.markdown_input) return field_el.markdown_input
    const container = document.createElement('div')
    container.classList.add('markdown-input')
    container.hidden = hidden
    const editor = create_editor(container,
        async (md: string) => { field.editingArea.content.set(markdown_to_html(md)) },
        {
            wheel(evt: WheelEvent) {
                const fields = field_el.parentElement.parentElement
                switch(evt.deltaMode){
                    case 0: //DOM_DELTA_PIXEL
                        fields.scrollTop += evt.deltaY
                        fields.scrollLeft += evt.deltaX
                        break
                    case 1: //DOM_DELTA_LINE
                        fields.scrollTop += 15 * evt.deltaY
                        fields.scrollLeft += 15 * evt.deltaX
                        break
                    case 2: //DOM_DELTA_PAGE
                        fields.scrollTop += 0.03 * evt.deltaY
                        fields.scrollLeft += 0.03 * evt.deltaX
                        break
                }
            }
        }
    )
    const markdown_input = {
        container: ed_area_el.insertBefore(container, ed_area_el.firstElementChild),
        badge: ed_area_el.parentElement.querySelector('.markdown-input-badge span') as HTMLSpanElement,
        editor: editor,
        refocus: undefined,
        toggle: () => { toggle(field) }
    }
    field_el.markdown_input = markdown_input

    return markdown_input
}

/////////////////////////////////////////////////////////////////////////////
// Toggle md input
async function toggle(field: number | EditorFieldAPI) {
    field = typeof (field) === 'number'
        ? await editor().instances[0].fields[field]
        : field
    const el = await field.element
    const mi = (el.markdown_input || await add_editor(field, true)) as MDInputAPI
    const rbadge = el.querySelector('span.rich-text-badge') as HTMLElement
    if (_config['Cycle rich text/Markdown']
        && mi.container.hidden === rich_edit(field).focusable)
            rbadge.click()
    mi.container.hidden ? show(mi) : hide(mi)

    async function show(mi: MDInputAPI) {
        const [md, ord] = html_to_markdown(get(field.editingArea.content) as string)
        mi.editor.set_doc(md, ord, 'end')
        mi.container.hidden = false
        mi.badge.innerHTML = MD_SOLID
        mi.editor.focus()
    }

    async function hide(mi: MDInputAPI) {
        mi.container.hidden = true
        mi.badge.innerHTML = MD;
        field.editingArea.refocus()
    }
}

/////////////////////////////////////////////////////////////////////////////
// Toggle rich text input
async function toggle_rich(field: number | EditorFieldAPI) {
    field = typeof (field) === 'number' ? await editor().instances[0].fields[field] : field
    const el = await field.element as MDInputElement
    const rich = el.querySelector('span.rich-text-badge') as HTMLElement
    rich.click()
    if(rich_edit(field).focusable) el.markdown_input.editor.focus()
}


/////////////////////////////////////////////////////////////////////////////
// Update MD content in all visible MD input on note load
// Add MD icons to all field
async function load_note() {
    const ed = await editor().instances[0]
    const flds = await ed.fields
    let index = -1
    let focused = false
    for (const field of flds) {
        index++
        const el = await field.element as MDInputElement
        // Add icon if non-existent
        if (!el.querySelector('span.markdown-input-badge')) {
            const badge = document.createElement('span')
            badge.classList.add('markdown-input-badge')
            badge.onclick = () => toggle(field)
            badge.innerHTML = `<div><span title="Toggle Markdown Editor (${_config['Shortcut']})" class="badge" dropdown="false">${MD}</span></div>`
            const fsel = el.querySelector('span.field-state')
            fsel.insertBefore(badge, fsel.firstElementChild)
        }

        // "New" field and markdown as default
        if (!el.markdown_input && _config[FIELD_DEFAULT] === 'markdown') {
            el.markdown_input = await add_editor(field, false)
            // Hide rich text if visible
            if (rich_edit(field)?.focusable)
                    (el.querySelector('span.rich-text-badge') as HTMLElement).click()

            // Focus first new field if not already focused
            if (!focused) {
                el.markdown_input.editor.focus()
                focused = true
            }

        // "Old field" with focus, refocus (i.e. keep state)
        } else if (el.contains(document.activeElement)) {
            el.markdown_input?.editor.focus()
            focused = true
        }

        if (el?.markdown_input?.container.hidden === false) {
            const [md, ord] = html_to_markdown(get(field.editingArea.content) as string)
            el.markdown_input.editor.set_doc(md, ord, 'end');
        }
    }
}

/////////////////////////////////////////////////////////////////////////////
// Handle focus events for subscribing/unsubscribing and overriding focus-trap
async function focusin(evt: FocusEvent) {
    const tgt = evt.target as HTMLElement
    const el = ancestor(tgt, '.editor-field') as MDInputElement
    if (!el.markdown_input) return

    // We focus MD CM, unsubscribe
    if (tgt.classList.contains('cm-content')) {
        if (el.markdown_input.editor['unsubscribe']) {
            el.markdown_input.editor['unsubscribe']()
            el.markdown_input.editor['unsubscribe'] = null
        }
    // We should take back focus when focusing back into document
    } else if (el.markdown_input.refocus !== undefined
        && el.markdown_input?.container.hidden === false
    ) {
        set_selections(el.markdown_input.editor, el.markdown_input.refocus)
        el.markdown_input.refocus = undefined
        el.markdown_input.editor.focus() // Event recursion
    // Focus is somewhere else, subscribe
    } else {
        if (!el.markdown_input.editor['unsubscribe']
            && !el.markdown_input.editor.dom.parentElement.hidden
        ) {
            const cont = await editor().instances[0].fields
                .find(async f => (await f.element) === el)
                .editingArea.content
            el.markdown_input.editor['unsubscribe'] = cont.subscribe(html => {
                    const [md, ord] = html_to_markdown(html)
                    el.markdown_input.editor.set_doc(md, ord, "end")
            })
        }

    }
}

/////////////////////////////////////////////////////////////////////////////
// Store selection when focusing out from markdown-input
async function focusout(evt: FocusEvent) {
    const tgt = evt.target as HTMLElement
    const tgt_el = ancestor(tgt, '.editor-field')
    if (tgt.classList?.contains('cm-content')
        && tgt_el !== ancestor(evt.relatedTarget as HTMLElement, '.editor-field'))
        (tgt_el as MDInputElement).markdown_input.refocus =
            get_selections((tgt_el as MDInputElement).markdown_input.editor)
}

/////////////////////////////////////////////////////////////////////////////
// Setup event listeners and configuration - create CM instances only on demand
function init(cfg: {}) {
    for (const key in cfg) _config[key] = cfg[key];
    if (!document['mdi_focus_added']) {
        document.addEventListener('focusin', focusin)
        document.addEventListener('focusout', focusout)
        document['mdi_focus_added'] = true
    }
}

export { init as converter_init } from "./converter"
export { init as editor_init } from "./editor"
export { toggle, toggle_rich, cycle_next, cycle_prev, load_note, init }
