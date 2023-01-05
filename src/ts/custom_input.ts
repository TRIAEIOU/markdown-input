import { get } from "svelte/store"
// @ts-ignore FIXME: how to import correctly?
import type { EditorFieldAPI, EditingInputAPI } from "anki/ts/editor/EditorField.svelte"
// @ts-ignore FIXME: how to import correctly?
import type { RichTextInputAPI } from "anki/ts/editor/rich-text-input"
// @ts-ignore FIXME: how to import correctly?
import type { PlainTextInputAPI } from "anki/ts/editor/plain-text-input"
import { ancestor } from "./utils"

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
function visible(el: HTMLElement) {
    if (!el) return undefined
    return !Boolean(el.hidden || ancestor(el, '.hidden'))
}

/////////////////////////////////////////////////////////////////////////////
// Add custom Editing Input data to editor field
interface CustomInputAPI {
    container: HTMLElement,
    editor: any,
    badge: HTMLSpanElement,
    stored_selection: any,
    toggle(): void
}

interface CustomInputElement extends HTMLElement {
    custom_input: CustomInputAPI
}

/**
 * Configuration of a custom input type
 *
 * @interface CustomInputConfiguration
 * @member {string} class CSS class name (must be valid & unique)
 * @member {string} title display title (i.e. spaces etc. allowed)
 * @member {string} [shortcut] keyboard shortcut to toggle input visibility
 * @member {boolean} [default_show] set to true to make input visible per default
 * @member {function(container: HTMLDivElement, onchange: (html: string): void): Any} create_editor function to call to instantiate the input. Will be called with the HTML div that should be set as input parent and a callback function to be called to update the other inputs. Must return the instance.
 * @member {function(editor: any): void} focus function to call to focus an editor instance
 * @member {function(editor: any, html: string): void} set_content function to call to set the content of an editor instance (i.e. on update from another input). Will be called with the editor instance and the new content HTML string.
 * @member {function(editor: any): any[]} save_selection function to call to get the selection reference of an editor instance; not the contents of the selection but whatever data structure is needed to be able to recreate the selection (to restore selection when focusing out of the window and back). Will be called with the editor instance and must return an array of data.
 * @member {function(editor: any, selections: any []): void} restore_selection function to call to restore a selection previously saved. Will be called with the editor instance and the array of earlier saved data.
 * @member {function(editor: any):} [onshow] function that will be called when a specific editor instance is shown (i.e. unhidden). Will be called with the editor instance.
 * @member {function(editor: any):} [onhide] function that will be called when a specific editor instance is hidden (i.e. unshown). Will be called with the editor instance.
 * @member {string} badge svg HTML tag to be used as badge.
 */
interface CustomInputConfiguration {
    class: string,
    title: string,
    shortcut?: string,
    default_show?: boolean,
    create_editor: (container: HTMLDivElement, onchange: (html: string) => void) => any,
    focus: (editor: any) => void,
    set_content: (editor: any, html: string) => void,
    save_selection: (editor: any) => any[],
    restore_selection: (editor: any, selections: any[]) => void,
    onshow?: Function,
    onhide?: Function,
    badge?: string
}

/**
 * Instantiate class to create a custom input type. The class handles all
 * interaction with the note editor, however the custom_input.py must be
 * included on the python side for media paste functionality.
 * The main user methods are:
 * - constructor takes the required configurations
 * - update_all() must be called when a note is loaded
 * - update_field() must be called when the custom input content is updated.
 */
class CustomInput {
    protected cfg: CustomInputConfiguration
    protected note_editor: any
    protected flds: {
        element: HTMLElement,
        editingArea: {
            content: any,
            refocus: Function
        }
    }[]
    protected name: string
    protected observer: MutationObserver

    /**
     * Create a new custom input type
     * @param options
     */
    /////////////////////////////////////////////////////////////////////////////
    // Constructor - supply configuration + call `update_all()` on note load
    // and call `update_field()` on input in the custom editor
    constructor(options: CustomInputConfiguration) {
        this.cfg = options
        this.name = this.cfg.class.replace('-', '_')
        if (!document[this.name]) {
            document.addEventListener('focusin', (evt: FocusEvent) => this.focusin(evt))
            document.addEventListener('focusout', (evt: FocusEvent) => this.focusin(evt))
            document[this.name] = true
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Update custom input content in all visible custom inputs, e.g. on note load
    // Add badges to all field as needed
    public async update_all() {
        this.note_editor = await require('anki/NoteEditor').instances[0]
        this.flds = await this.note_editor.fields
        let focused = false
        for (const field of this.flds) {
            const editing_container = await field.element as CustomInputElement // await necessary
            const badge_container = ancestor(editing_container, '.field-container').querySelector('.field-state')
            // Add badge if non-existent
            if (!badge_container.querySelector(`.${this.cfg.class}-badge`)) {
                const plain_badge = badge_container.querySelector('.plain-text-badge')
                const md_badge = plain_badge.cloneNode(true) as HTMLElement
                md_badge.classList.replace('plain-text-badge', `${this.cfg.class}-badge`)
                md_badge.onclick = () => this.toggle(field)
                md_badge['observer'] =
                    new MutationObserver((muts: MutationRecord[], obs: MutationObserver) => {
                        muts.forEach(mut => {
                            if ((mut.target as HTMLElement).classList.contains('visible'))
                                md_badge.classList.add('visible')
                            else
                                md_badge.classList.remove('visible')
                        })
                })
                md_badge['observer'].observe(plain_badge, {attributeFilter: ['class']})
                const visual = md_badge.querySelector('.badge') as HTMLElement
                visual.title = `Toggle ${this.cfg.title}`
                if (this.cfg.shortcut) visual.title += ` (${this.cfg.shortcut})`
                visual.querySelector('span').innerHTML = this.cfg.badge
                badge_container.insertBefore(md_badge, badge_container.firstElementChild)

            }

            // "New" field and markdown as default
            if (!editing_container[this.name] && this.cfg.default_show) {
                const ci = await this.add_editor(field)
                if (this.cfg.onshow) this.cfg.onshow()

                // Focus first new field if not already focused
                if (!focused) {
                    this.cfg.focus(ci.editor)
                    focused = true
                }
                editing_container[this.name] = ci

            // "Old field" with focus, refocus (i.e. keep state)
            } else if (editing_container.contains(document.activeElement)) {
                this.cfg.focus(editing_container[this.name].editor)
                focused = true
            }

            if (editing_container[this.name]?.container.hidden === false)
                this.cfg.set_content(editing_container[this.name].editor, get(field.editingArea.content) as string)
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Update a specific field with supplied HTML
    public async update_field(field: number | EditorFieldAPI, html: string) {
        field = typeof (field) === 'number'
            ? this.flds[field]
            : field
        field.editingArea.content.set(html)
    }


    /////////////////////////////////////////////////////////////////////////////
    // Toggle custom input
    public async toggle(field: number | EditorFieldAPI) {
        field = typeof (field) === 'number'
            ? this.flds[field]
            : field
        const ci = (await this.add_editor(field)) as CustomInputAPI
        if (!visible(ci.container) && this.cfg.onshow) this.cfg.onshow()
        else if (visible(ci.container)&& this.cfg.onhide) this.cfg.onhide()
        visible(ci.container) === true
            ? hide.call(this, ci)
            : show.call(this, ci)

        async function show(ci: CustomInputAPI, cfg: CustomInputConfiguration) {
            this.cfg.set_content(ci.editor, get(field.editingArea.content) as string)
            ci.container.classList.remove('hidden')
            ci.badge.parentElement.parentElement.classList.add('highlighted')
            this.cfg.focus(ci.editor)
        }

        async function hide(ci: CustomInputAPI) {
            ci.container.classList.add('hidden')
            ci.badge.parentElement.parentElement.classList.remove('highlighted')
            field.editingArea.refocus()
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Toggle rich text input
    public async toggle_rich(field: number | EditorFieldAPI) {
        field = typeof (field) === 'number' ? this.flds[field] : field
        const el = await field.element as CustomInputElement
        const rich = el.querySelector('.rich-text-input').parentElement
        if (rich.classList.contains('hidden')) {
            rich.classList.remove('hidden')
            this.cfg.focus(el[this.name].editor)
        } else rich.classList.add('hidden')
    }

    /////////////////////////////////////////////////////////////////////////////
    // Focus the editor (custom, plain or rich text) of a an input element
    protected focus(input: HTMLElement) {
        if (!visible(input)) return false
        let editor
        if (input.querySelector(`.${this.cfg.class}`))
            editor  = (ancestor(input, '.editor-field') as CustomInputElement)
                ?.custom_input?.editor
        else editor = input.querySelector('.CodeMirror > div > textarea') as HTMLElement
            || input.querySelector('.rich-text-editable')?.shadowRoot.querySelector('anki-editable')

        editor?.focus()
        return Boolean(editor)
    }

    /////////////////////////////////////////////////////////////////////////////
    // Cycle to next field or first if none active
    public async cycle_next() {
        const active = ancestor(document.activeElement as HTMLElement, '.editing-area > div')
        // Check for inputs in current field
        let input = older(active)
        // No inputs in current field, find prev field
        if (!input) {
            let fld_root = ancestor(active, '.field-container')
                .parentElement as HTMLElement
            while (fld_root && !input) {
                fld_root = fld_root.nextElementSibling as HTMLElement
                input = fld_root?.querySelector('.editing-area')?.firstElementChild as HTMLElement
                if (!visible(input)) input = older(input)
            }
        }
        if (input) this.focus(input)

        function older(fld: HTMLElement) {
            let nxt = fld?.nextElementSibling as HTMLElement
            while (visible(nxt) === false) nxt = nxt.nextElementSibling as HTMLElement
            return nxt
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Cycle to prev field or first if none active
    public async cycle_prev() {
        const active = ancestor(document.activeElement as HTMLElement, '.editing-area > div')
        // Check for inputs in current field
        let input = younger(active)
        // No inputs in current field, find prev field
        if (!input) {
            let fld_root = ancestor(active, '.field-container')
                .parentElement as HTMLElement
            while (fld_root && !input) {
                fld_root = fld_root.previousElementSibling as HTMLElement
                input = fld_root?.querySelector('.editing-area')?.lastElementChild as HTMLElement
                if (!visible(input)) input = younger(input)
            }
        }
        if (input) this.focus(input)

        function younger(fld: HTMLElement) {
            let prv = fld?.previousElementSibling as HTMLElement
            while (visible(prv) === false) prv = prv.previousElementSibling as HTMLElement
            return prv
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Add editor to field storing editor data on
    // `NoteEditor.instances[0].fields[X]`/`.editor-field`
    protected async add_editor(field: EditorFieldAPI): Promise<CustomInputAPI> {
        const editing_field = await field.element as CustomInputElement
        const editing_area = editing_field.querySelector('div.editing-area')
        if (editing_field[this.name]) return editing_field[this.name]
        const wrapper = editing_area.querySelector('.plain-text-input').parentElement.cloneNode(false) as HTMLDivElement
        wrapper.classList.add('hidden')
        const inner = document.createElement('div')
        inner.classList.add(this.cfg.class)
        wrapper.appendChild(inner)
        const editor = this.cfg.create_editor(
            inner,
            (html: string) => { field.editingArea.content.set(html) }
        )

        const custom_input = {
            container: editing_area.insertBefore(wrapper, editing_area.firstElementChild),
            badge: ancestor(editing_field, '.field-container').querySelector(`.${this.cfg.class}-badge span span`) as HTMLSpanElement,
            editor: editor,
            stored_selection: undefined,
            toggle: () => { this.toggle(field) }
        }
        editing_field[this.name] = custom_input

        return custom_input
    }

    /////////////////////////////////////////////////////////////////////////////
    // Handle focus events for subscribing/unsubscribing and overriding focus-trap
    protected async focusin(evt: FocusEvent) {
        const tgt = evt.target as HTMLElement
        const tgt_fld = ancestor(tgt, '.editor-field') as CustomInputElement
        const ci = tgt_fld?.[this.name] as CustomInputAPI
        if (!ci) return

        // We focus this custom input, unsubscribe
        if (ancestor(tgt, `.${this.cfg.class}`)) {
            if (ci.editor['unsubscribe']) {
                ci.editor['unsubscribe']()
                ci.editor['unsubscribe'] = null
            }
        // We should take back focus when focusing back into document
        } else if (ci.stored_selection !== undefined && visible(ci.container)) {
            this.cfg.restore_selection(ci.editor, ci.stored_selection)
            ci.stored_selection = undefined
            this.cfg.focus(ci.editor) // Event recursion
        // Focus is somewhere else, subscribe
        } else {
            if (!ci.editor['unsubscribe'] && visible(ci.container)) {
                for (const fld of this.flds) {
                    if (await fld.element === tgt_fld) { // await neccessary
                        const unsub = fld.editingArea.content.subscribe((html: string) => {
                            this.cfg.set_content(ci.editor, html)
                        })
                        tgt_fld[this.name].editor['unsubscribe'] = unsub
                        break
                    }
                }
            }
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Store selection when focusing out from markdown-input
    protected async focusout(evt: FocusEvent) {
        const tgt = evt.target as HTMLElement
        const tgt_el = ancestor(tgt, '.editor-field') as CustomInputElement
        if (ancestor(tgt, `.${this.cfg.class}`)
            && tgt_el !== ancestor(evt.relatedTarget as HTMLElement, '.editor-field'))
            tgt_el[this.name].stored_selection = this.cfg.save_selection(tgt_el[this.name].editor)
    }
}

export type { CustomInputConfiguration }
export { CustomInput }
