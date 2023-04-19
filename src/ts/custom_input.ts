import { get } from "svelte/store"
// @ts-ignore FIXME: how to import correctly?
import type { EditorFieldAPI } from "anki/ts/editor/EditorField.svelte"
import { ancestor } from "./utils"


/**
 * CONCEPT
 * CustomInputClass manages interaction with the note editor, CustomInputAPI is the
 * input instance of a specific field.
 * "CustomInputClass is the NoteEditor array of CustomInputAPI elements"
 */


/**
 * Defines the CustomInputAPI's.
 */
class CustomInputConfig {
  /** CSS class name (must be valid & unique) */
  readonly class_name: string
  /** badge tooltip string */
  readonly tooltip: string
  /** badge svg HTML tag to be used as badge */
  readonly badge: string
  /** non-arrow function callback to set the content of an editor instance (i.e. on update from another input). Will be called with the CustomInputAPI as `this` and the new content HTML string as parameter. */
  readonly set_content: (html: string) => void
  /** non-arrow function callback to focus custom editor instance. Will be called with the CustomInputAPI as `this`. */
  readonly focus: () => void
  /** non-arrow function callback to instantiate custom input editor. Will be called with the HTML div that should be set as input parent and a callback function to be called to update the other inputs. Will be called with the CustomInputAPI as `this` and the new content HTML string as parameter and must return the instance. */
  readonly create_editor: (container: HTMLElement, onchange: (html: string) => void) => any
  /** non-arrow function callback called after a custom input has been added to a field, use for example to set field input default states. Will be called with the CustomInputAPI as `this`. */
  readonly onadd?: () => void
}

/**
 * Instantiate to create a custom input class. The class handles all
 * interaction with the note editor, however the custom_input.py must be
 * included on the python side for media paste functionality.
 * @member constructor create a new custom input class
 * @member get_api get custom input api for specified field
 * @member update_all update all custom input editor contents, e.g. on note load,
 * will also add CustomInputAPI to any field missing (e.g. on note type switch)
 * @member cycle_next Move focus to the next input/down
 * @member cycle_prev Move focus to the preceeding input/up
 */
class CustomInputClass extends CustomInputConfig {
  readonly name: string
  /**
   * Class managing the addition and setup/configuration of CustomInputAPI's for
   * fields as necessary as well as note level functionality
   * @param config configuration for the CustomInputAPI's
   */
  constructor(config: CustomInputConfig) {
    super()
    Object.assign(this, config)
    this.name = this.class_name.replace('-', '_')
  }

  /**
   * Get CustomInputAPI for field by index orEditorFieldAPI instance
   * @param field field to get EditorFieldAPI for
   * @returns CustomInputAPI | undefined
   */
  async get_api(field: number | EditorFieldAPI): Promise<CustomInputAPI> {
    const el = await (typeof (field) === 'number'
      ? require('anki/NoteEditor').instances[0].fields[field]
      : field
    ).element
    return el[this.name]
  }

  /**
   * Update custom input content in all visible custom inputs, e.g. on note load
   * Add custom inputs, inc. badges, to fields PRN
   */
  async update_all() {
    for (const fld of await require('anki/NoteEditor').instances[0].fields) {
      const editor_field = await fld.element as HTMLElement // await necessary
      if (!editor_field[this.name]) {
        editor_field[this.name] = new CustomInputAPI(this, await fld, await fld.element)
        if (this.onadd) this.onadd.call(editor_field[this.name])
      } else if (editor_field.contains(document.activeElement))
        this.focus.call(editor_field[this.name])

      // Update custom input contents PRN
      if (editor_field[this.name].editor_container.classList.contains('expanded'))
        this.set_content.call(editor_field[this.name], get(fld.editingArea.content) as string)
    }
  }

  /**
   * Cycle focus to next field/down or first if none active
   */
  async cycle_next() {
    const active = ancestor(document.activeElement as HTMLElement, '.editing-area > div')
    // Check for inputs in current field
    let nxt = next_sibling(active)
    // No inputs in current field, find first visible in next field
    if (!nxt) {
      let fld_root = ancestor(active, '.fields > div') as HTMLElement
      while (fld_root && !nxt) {
        fld_root = fld_root.nextElementSibling as HTMLElement
        nxt = fld_root?.querySelector('.editing-area > div:not(.hidden)') as HTMLElement
      }
    }
    if (nxt) this._focus_input(nxt)

    function next_sibling(fld: HTMLElement) {
      let nxt = fld?.nextElementSibling as HTMLElement
      while (nxt?.classList.contains('hidden'))
        nxt = nxt.nextElementSibling as HTMLElement
      return nxt
    }
  }

  /**
   * Cycle focus to preceeding field/up or first if none active
   */
  async cycle_prev() {
    const active = ancestor(document.activeElement as HTMLElement, '.editing-area > div')
    // Check for inputs in current field
    let prev = prev_sibling(active)
    // No inputs in current field, find first visible in next field
    if (!prev) {
      let fld_root = ancestor(active, '.fields > div') as HTMLElement
      while (fld_root && !prev) {
        fld_root = fld_root.previousElementSibling as HTMLElement
        const prevs = fld_root?.querySelectorAll('.editing-area > div:not(.hidden)')
        if (prevs?.length) prev = prevs[prevs.length - 1] as HTMLElement
      }
    }
    if (prev) this._focus_input(prev)

    function prev_sibling(fld: HTMLElement) {
      let prev = fld?.previousElementSibling as HTMLElement
      while (prev?.classList.contains('hidden'))
        prev = prev.previousElementSibling as HTMLElement
      return prev
    }
  }


  /**
   * Focus the editor (custom, plain or rich text) of a an input element
   * @param input container element of editor to focus
   */
  _focus_input(input: HTMLElement) {
    const el = input.querySelector(`.${this.class_name}`)
        // Custom input
      ? ancestor(input, '.editor-field')[this.name]
        // Anki plain text input
      : input.querySelector('.CodeMirror > div > textarea') ||
        // Anki rich text input
        input.querySelector('.rich-text-editable')?.shadowRoot.querySelector('anki-editable')

    if (el) el.focus()
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////


/**
 * Custom Input API for a single field - instantiated by CustomInputClass PRN
 * @readonly
 * @property custom_input_class CustomInputClass to which the API instance belongs
 * @property anki_editor_field_api core Anki/Svelte editor field api to which the CustomInputAPI belongs
 * @property editor_container "root" HTML element in which the custom editor is placed (inside a div.custom-class-name)
 * @property badge_container the HTML element that contains the badge
 * @property editor the field custom input editor instance (created on demand)
 * @member set_content set content of custom input editor
 * @member focus focus the custom input
 * @member visible is custom input editor visible
 * @member rich_visible is rich text input visible
 * @member plain_visible is plain text input visible
 * @member toggle toggle custom input show/hide state
 * @member show show custom input editor
 * @member hide hide custom input editor
 * @member toggle_rich toggle rich text input show/hide state
 * @member toggle_plain toggle plain text show/hide state
 * @member update call to update editor field content (and set rich and plain text PRN)
 */
class CustomInputAPI {
  // DOM input: .fields → div (field root) → .field-container → .collapsible → .editor-field → .editing-area → .collapsible (root of input) → .rich/.plain/.custom-text-input
  // DOM badge: .fields → div (field root) → .field-container → div → .label-container → .field-state → .plain-text/.custom-badge

  ///////////////////////////////////////////////////////////////////
  // Public properties
  /** CustomInputClass to which the API instance belongs */
  readonly custom_input_class: CustomInputClass
  /** core Anki/Svelte editor field api to which the CustomInputAPI belongs */
  readonly anki_editor_field_api: EditorFieldAPI
  /** .collapsible "root" custom input container element */
  readonly editor_container: HTMLElement
  /** .custom-badge */
  readonly badge_container: HTMLSpanElement
  editor_: any
  /** custom input editor (created on read) */
  get editor() {
    if (!this.editor_) this.editor_ = this.custom_input_class.create_editor.call(this,
      this.editor_container.firstElementChild as HTMLElement,
      this.anki_editor_field_api.editingArea.content.set
    )
    return this.editor_
  }


  ///////////////////////////////////////////////////////////////////
  // Public methods

  /** Set custom input editor content */
  set_content(html: string) {return this.custom_input_class.set_content.call(this, html)}

  /** User supplied callback to focus custom input */
  focus() {return this.custom_input_class.focus.call(this)}

  /** Check if custom input editor is visible */
  visible() { return this._visible(this.custom_input_class.class_name) }

  /** Check if rich text input is visible */
  rich_visible() { return this._visible('rich-text-input') }

  /** Check if plain text input is visible */
  plain_visible() { return this._visible('plain-text-input') }

  /** Show custom input */
  show() {
    this.editor // ensure instantiated
    this._unsubscribe()
    const html = get(this.anki_editor_field_api.editingArea.content) as string
    this.set_content(html)
    this.editor_container.classList.replace('hidden', 'expanded')
    this.badge_container.parentElement.parentElement.classList.add('highlighted')
    this.focus()
  }

  /** Hide custom input unless no visible sibling inputs (all inputs hidden = no way to focus) */
  hide(force?: boolean) {
    // When all fields are hidden there is no way to focus the field ⇒
    // prevent hiding of last visible input
    if (!force && !this._visible_siblings(this.custom_input_class.class_name)) return
    this._unsubscribe()
    this.editor_container.classList.replace('expanded', 'hidden')
    this.badge_container.parentElement.parentElement.classList.remove('highlighted')
    this.anki_editor_field_api.editingArea.refocus()
  }

  /** Toggle custom input visibility */
  toggle(force?: boolean) {
    if (!this.editor_ || this.editor_container.classList.contains('hidden')) this.show()
    else this.hide(force)
  }

  /** Toggle rich text input visibility */
  toggle_rich(force?: boolean) {
    if (!force && !this._visible_siblings('rich-text-input')) return
    this._toggle_builtin('rich-text-input')
  }

  /** Toggle plain text input visibility */
  toggle_plain(force?: boolean) {
    if (!force && !this._visible_siblings('plain-text-input')) return
    this._toggle_builtin('plain-text-input')
  }

  /**
   * @param input_class the CustomInputClass instance to which the instance belongs
   * @param anki_editor_field_api field EditorFieldAPI (promise must be resolved)
   * @param editor_field_el EditorFieldAPI.element (promise must be resolved)
   */
  constructor(input_class: CustomInputClass, anki_editor_field_api: EditorFieldAPI, editor_field_el: HTMLElement) {
    this.custom_input_class = input_class
    this.anki_editor_field_api = anki_editor_field_api

    const class_name = input_class.class_name
    const editing_area = editor_field_el.querySelector('.editing-area') as HTMLElement
    const field_container = ancestor(editor_field_el, '.field-container')

    // Set up editor container (editor not instansiated until use)
    const wrapper = editing_area.querySelector('.plain-text-input').parentElement
      .cloneNode(false) as HTMLDivElement
    wrapper.classList.replace('expanded', 'hidden')
    const inner = document.createElement('div')
    inner.classList.add(class_name)
    wrapper.appendChild(inner)
    this.editor_container = editing_area.insertBefore(wrapper, editing_area.firstElementChild)

    // Set up badge
    const badge_container = field_container.querySelector('.field-state')
    const plain_badge = badge_container.querySelector('.plain-text-badge')
    this.badge_container = plain_badge.cloneNode(true) as HTMLElement
    this.badge_container.classList.replace('plain-text-badge', `${class_name}-badge`)
    this.badge_container.onclick = () => this.toggle()
    // Copy `visible` class (hover⇒visible functionality)
    this.badge_container['observer'] =
      new MutationObserver((muts: MutationRecord[], obs: MutationObserver) => {
        muts.forEach(mut => {
          if ((mut.target as HTMLElement).classList.contains('visible'))
            this.badge_container.classList.add('visible')
          else
            this.badge_container.classList.remove('visible')
        })
      })
    this.badge_container['observer'].observe(plain_badge, { attributeFilter: ['class'] })
    const gfx = this.badge_container.querySelector('.badge') as HTMLElement
    gfx.title = input_class.tooltip
    gfx.querySelector('span').innerHTML = input_class.badge
    badge_container.insertBefore(this.badge_container, badge_container.firstElementChild)

    // Handle focus events for subscribing/unsubscribing
    field_container.addEventListener('focusin', (evt: Event) => {
      // We focus this custom input, unsubscribe
      if (ancestor(evt.target as HTMLElement, `.${class_name}`)) this._unsubscribe()
      // We focus something else, subscribe
      else this._subscribe()
    })
    field_container.addEventListener('focusout', evt => {
      // New focus outside custom input
      if (!ancestor((evt.relatedTarget as HTMLElement), `.${class_name}`))
        this._subscribe()
    })
  }

  ///////////////////////////////////////////////////////////////////
  // Private

  /** Unsubscribe function if custom input is currently subscribed */
  _do_unsubscribe: () => void

  /**
   * Unsubscribe custom input (i.e. now inputing into custom editor)
   */
  _unsubscribe() {
    if (this._do_unsubscribe) {
      this._do_unsubscribe()
      this._do_unsubscribe = null
    }
  }

  /**
   * Subscribe custom input to field content updates (i.e. now not inputing into custom editor)
   */
  _subscribe() {
    if (this._do_unsubscribe) return
    this._do_unsubscribe = this.anki_editor_field_api.editingArea.content.subscribe((html: string) => {
      this.set_content(html)
    })
  }

  /**
   * Toggle rich/plain-text-inputs based on class name
   * @param class_name `rich-text-input` or `plain-text-input`
   */
  _toggle_builtin(class_name: string) {
    const el = this.editor_container.parentElement
    const input = el.querySelector(`.${class_name}`).parentElement
    if (input.classList.contains('hidden'))
      input.classList.replace('hidden', 'expanded')
    else if (this._visible_siblings(class_name))
      input.classList.replace('expanded', 'hidden')
  }

  /**
   * Check if input is visible (not hidden)
   * @param class_name class (rich-text/plain-text/custom - input) of input to check
   * @returns visible
   */
  _visible(class_name: string) {
    return Boolean(
      this.editor_container.parentElement
        .querySelector(`div:not(.hidden) > div.${class_name}`)
    )
  }

  /**
   * Check if there are visible input siblings
   * @param class_name CSS of class to check for siblings for
   */
  _visible_siblings(class_name: string) {
    return Boolean(
      this.editor_container.parentElement
        .querySelector(`:scope > div:not(.hidden) > div:not(.${class_name})`)
    )
  }
}

export { CustomInputClass, CustomInputAPI }
