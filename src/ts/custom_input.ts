import { get } from "svelte/store"
// @ts-ignore FIXME: how to import correctly?
import type { EditorFieldAPI, EditingInputAPI } from "anki/ts/editor/EditorField.svelte"
// @ts-ignore FIXME: how to import correctly?
import type { RichTextInputAPI } from "anki/ts/editor/rich-text-input"
// @ts-ignore FIXME: how to import correctly?
import type { PlainTextInputAPI } from "anki/ts/editor/plain-text-input"
import { ancestor } from "./utils"
import { HTML } from "mdast-util-from-markdown/lib"


/////////////////////////////////////////////////////////////////////////////
// Return wether an input element is hidden by attribute or class
function visible(el: HTMLElement) {
    if (!el) return undefined
    return !Boolean(el.hidden || ancestor(el, '.hidden'))
}

/**
 * Custom input configuration
 * @property {String} class_name CSS class name (must be valid & unique)
 * @property {String} tooltip badge tooltip string
 * @property {String} badge svg HTML tag to be used as badge
 * @member {function(html: string): void} set_content function to call to set the content of an editor instance (i.e. on update from another input). Will be called with the CustomInputAPI as `this` and the new content HTML string as parameter.
 * @member {function(): void} focus function to call to focus an editor instance. Will be called with the CustomInputAPI as `this` and the new content HTML string as parameter.
 * @member {function(container: HTMLDivElement, onchange: (html: string): void): Any} create_editor function to call to instantiate the input. Will be called with the HTML div that should be set as input parent and a callback function to be called to update the other inputs. Will be called with the CustomInputAPI as `this` and the new content HTML string as parameter and must return the instance.
 * @member {function(): void} [onadd] function that will be called after a custom input has been added to a field, use for example to set field input default states. Will be called with the CustomInputAPI as `this`.
 */
interface CustomInputConfig {
    class_name: string
    tooltip: string
    badge: string
    set: (html: string) => void,
    focus: () => void,
    create_editor: (container: HTMLElement) => any,
    onadd?: () => void
}

/**
 * Custom Input API for a single field - instantiated by CustomInputClass PRN
 * @readonly
 * @property {EditorFieldAPI} field core Anki/Svelte editor field to which the CustomInputAPI belongs
 * @property {HTMLElement} container HTML element in which the custom editor is placed
 * @property {Any} editor the field custom input editor instance
 * @property {HTMLSpanElement} badge the HTML element that contains the badge
 * @member {function(): void} toggle call to toggle custom input show/hide state
 * @member {function(html: string): void} update call to update editor field content (and set rich and plain text PRN)
 */
class CustomInputAPI {
    readonly #cfg: CustomInputConfig
    readonly field: EditorFieldAPI
    readonly container: HTMLElement
    readonly badge: HTMLSpanElement
    readonly focus: () => void
    #set: (html: string) => void
    get set() { return this.#set }
    #editor: any
    get editor() {
        if (!this.#editor) this.#editor = this.#create_editor(this.container)
        return this.#editor
    }
    readonly #create_editor: (container: HTMLElement) => any
    readonly #onadd: () => void

    #unsub: () => void
    #unsubscribe() {
        if (this.#unsub) {
            this.#unsub()
            this.#unsub = null
        }
    }
    #subscribe() {
        if (!this.#unsub)
            this.#unsub = this.field.editingArea.content.subscribe((html: string) => {
                this.set(html)
            })
    }

    constructor(
        cfg: CustomInputConfig,
        field: EditorFieldAPI,
        element: HTMLElement
    ) {
        this.#cfg = cfg
        this.field = field
        this.container = element

        const badge_container =
            ancestor(this.container, '.field-container')
            .querySelector('.field-state')
        const plain_badge = badge_container.querySelector('.plain-text-badge')
        this.badge = plain_badge.cloneNode(true) as HTMLElement
        this.badge.classList.replace('plain-text-badge', `${this.#cfg.class_name}-badge`)
        this.badge.onclick = () => this.toggle()
        // Copy `visible` class (hover⇒visible functionality)
        this.badge['observer'] =
            new MutationObserver((muts: MutationRecord[], obs: MutationObserver) => {
                muts.forEach(mut => {
                    if ((mut.target as HTMLElement).classList.contains('visible'))
                        this.badge.classList.add('visible')
                    else
                        this.badge.classList.remove('visible')
                })
        })
        this.badge['observer'].observe(plain_badge, {attributeFilter: ['class']})

        const gfx = this.badge.querySelector('.badge') as HTMLElement
        gfx.title = `Toggle ${this.#cfg.tooltip}`
        gfx.querySelector('span').innerHTML = cfg.badge

        badge_container.insertBefore(this.badge, badge_container.firstElementChild)
        this.#set = cfg.set
        this.focus = cfg.focus
        this.#create_editor = cfg.create_editor
        if (cfg.onadd) this.#onadd = cfg.onadd

        // Handle focus events for subscribing/unsubscribing
        async focusin(evt: FocusEvent) {
            const tgt = evt.target as HTMLElement
            const tgt_fld = ancestor(tgt, '.editor-field') as HTMLElement
            const ci = tgt_fld?.[this.name] as CustomInputAPI
            if (!ci) return

            // We focus this custom input, unsubscribe
            if (ancestor(tgt, `.${this.cfg.class}`)) {
                if (ci.editor['unsubscribe']) {
                    ci.editor['unsubscribe']()
                    ci.editor['unsubscribe'] = null
                }
            // We focus something else, subscribe
            } else {
                if (!ci.editor['unsubscribe'] && visible(ci.container)) {
                    for (const fld of this.flds) {
                        if (await fld.element === tgt_fld) { // await neccessary
                            const unsub = fld.editingArea.content.subscribe((html: string) => {
                                this.cfg.set_content.call(ci, html)
                            })
                            tgt_fld[this.name].editor['unsubscribe'] = unsub
                            break
                        }
                    }
                }
            }
        }

    }

    /////////////////////////////////////////////////////////////////////////////
    // Toggle/show/hide custom input
    async toggle() {
        if (!this.#editor || !visible(this.container)) this.show()
        else this.hide()
    }
    async show() {
        this.editor // ensure instantiated
        this.#unsubscribe()
        this.set(get(await this.field.editingArea.content) as string)
        this.container.classList.replace('hidden', 'expanded')
        this.badge.parentElement.parentElement.classList.add('highlighted')
        this.focus()
    }
    async hide() {
        this.#unsubscribe()
        this.container.classList.replace('expanded', 'hidden')
        this.badge.parentElement.parentElement.classList.remove('highlighted')
        this.field.editingArea.refocus()
    }

    /////////////////////////////////////////////////////////////////////////////
    // Toggle built in editing inputs
    async toggle_rich() { this.#toggle_builtin('rich') }
    async toggle_plain() { this.#toggle_builtin('plain') }
    async #toggle_builtin(type: string) {
        const el = await this.field.element as HTMLElement
        const input = el.querySelector(`.${type}-text-input`).parentElement
        if (input.classList.contains('hidden'))
            input.classList.replace('hidden', 'expanded')
        else
            input.classList.replace('expanded', 'hidden')
    }
}


/**
 * Instantiate to create a custom input class. The class handles all
 * interaction with the note editor, however the custom_input.py must be
 * included on the python side for media paste functionality.
 * The main user methods are:
 * - constructor takes the required configurations
 * - update_all() must be called when a note is loaded
 */
class CustomInputClass {
    readonly cfg: CustomInputConfig
    protected note_editor: any
    protected flds: {
        element: HTMLElement,
        editingArea: {
            content: any,
            refocus: Function
        }
    }[]
    #name: string

    constructor(config: CustomInputConfig) {
        this.cfg = config
        this.#name = this.cfg.class_name.replace('-', '_')
        if (!document[this.#name]) {
            //document.addEventListener('focusin', (evt: FocusEvent) => this.focusin(evt))
            document[this.#name] = true
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Update custom input content in all visible custom inputs, e.g. on note load
    // Add badges to all field as needed
    public async update_all() {
        this.note_editor = await require('anki/NoteEditor').instances[0]
        this.flds = await this.note_editor.fields
        for (const field of this.flds) {
            const editor_field = await field.element as HTMLElement // await necessary
            if (!editor_field[this.#name])
                editor_field[this.#name] = new CustomInputAPI(this.cfg, field, editor_field)
            else if (editor_field.contains(document.activeElement))
                this.cfg.focus.call(editor_field[this.#name])

            // Update custom input contents PRN
            if (visible(editor_field[this.#name]?._editor))
                editor_field[this.#name].update(get(field.editingArea.content) as string)
        }

    }

    /////////////////////////////////////////////////////////////////////////////
    // Cycle to next field or first if none active
    public async cycle_next() {
        const active = ancestor(document.activeElement as HTMLElement, '.editing-area > div')
        // Check for inputs in current field
        let nxt = older(active)
        // No inputs in current field, find first visible in next field
        if (!nxt) {
            let fld_root = ancestor(active, '.fields > div') as HTMLElement
            while (fld_root && !nxt) {
                fld_root = fld_root.nextElementSibling as HTMLElement
                nxt = fld_root?.querySelector('.editing-area > div:not(.hidden)') as HTMLElement
            }
        }
        if (nxt)
            ((nxt.querySelector('.editor-field'))[this.#name] as CustomInputAPI).focus()

        function older(fld: HTMLElement) {
            let nxt = fld?.nextElementSibling as HTMLElement
            while (nxt?.classList.contains('hidden'))
                nxt = nxt.nextElementSibling as HTMLElement
            return nxt
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Cycle to prev field or first if none active
    public async cycle_prev() {
        const active = ancestor(document.activeElement as HTMLElement, '.editing-area > div')
        // Check for inputs in current field
        let prev = younger(active)
        // No inputs in current field, find first visible in next field
        if (!prev) {
            let fld_root = ancestor(active, '.fields > div') as HTMLElement
            while (fld_root && !prev) {
                fld_root = fld_root.previousElementSibling as HTMLElement
                const prevs = fld_root?.querySelectorAll('.editing-area > div:not(.hidden)')
                if (prevs && prevs.length) prev = prevs[prevs.length - 1] as HTMLElement
            }
        }
        if (prev)
            ((prev.querySelector('.editor-field'))[this.#name] as CustomInputAPI).focus()

        function younger(fld: HTMLElement) {
            let prev = fld?.previousElementSibling as HTMLElement
            while (prev?.classList.contains('hidden'))
                prev = prev.previousElementSibling as HTMLElement
            return prev
        }
    }
}

export { CustomInputClass, CustomInputAPI }
