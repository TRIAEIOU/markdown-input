# Markdown input

Anki addon that allows adding and editing notes in Markdown (https://daringfireball.net/projects/markdown/), either directly in the editor fields (similar to the core plain and rich text edit interface) or by opening a separate window to edit a specific field.

# Warning
- Markdown is not "another way to write HTML", it is a text ⇒ HTML conversion specification that does not accomodate all of HTML (apart from using inline HTML), this means that the HTML ⇒ Markdown conversion is not unambiguous, which in turn means that cycling a valid HTML ⇒ Markdown ⇒ HTML may end up with an end result that is not identical to the original.
- Editing a field in Markdown will result in the original field HTML being converted to Markdown and then back to HTML - the end result may differ from the original (especially in case of complex HTML).
- The addon has several options on when field should and shouldn't be edited in Markdown - configuring the editor to edit fields in Markdown per default will result in all notes you open being cycled through Markdown and thereby modified even if you do not manually edit anything. Consider exporting your deck and import in another profile to play around to ensure none of your advanced card designs aren't messed up.
- There are a number of moving parts involved, notably a customized version of Showdown (https://showdownjs.com/) and CodeMirror 6, there may be bugs lying around.
- Note that in markdown (similarly to HTML) white space is not kept but rather a single blank line is inserted between paragraphs (see https://daringfireball.net/projects/markdown/basics)

## Functionality
Conversion to/from HTML is done with a modified Showdown 3.0 (not yet in alpha) with the following options and extensions (see https://showdownjs.com/docs/):
- Flavor: github
- Options:
    - underline
    - strikethrough
    - simpleLineBreaks
    - <strike>tablesHeaderId</strike>
    - noHeaderId
- Custom extensions
    - Extended table parsing (see below)
    - Use `*****` for `<hr>`
    - ^string^ for superscript

The editor used is CodeMirror 6 (https://codemirror.net/) with the following configurations:
- Markdown syntax highlighting and auto fill (continue lists, autondent etc.)
- Undo history
- Multiple drawable selections
- Search and replace, `Ctrl+F`, currently only in the dialog input as the Anki editor eats a lot of the shortcuts.
- Insert cloze deletions (see below)

### Tables
Standard Markdown tables are supported:
- Optional fencing pipes (i.e. at start and end of each row)
- Align none, left, right and center
- Generates tables with `<thead>` and `<tbody>`
- Additionally headerless tables are supported (i.e. no alignment/header separation row) and generates tables with only `<tbody>`
- Newlines in tables are converted to tremas (¨) rather than `<br>` (configurable)

### Cloze deletions
Cloze deletions are inserted as in the rich text editor with the following addition:
- Closing `}}` are "moved up" to end of last item in lists (and conversly moved out to include the closing `</li></ul|ol>` tags).
- Keyboard shortcuts:
    - Cloze without increment: Ctrl+Alt+c
    - Cloze with inncrement: Ctrl+Shift+c (with multiple selections this will cloze each incrementally)
- If you feel the cloze deletion tags end up in the wrong place please make sure you understand how Markdown (notably line breaks and empty lines) is converted to HTML.

## Configuration
The addon has two input modes, either directly in the field in the editor ("Field input") or through a popup dialog ("Dialog input").

### Field input
When the field is in markdown mode the rich and plain text inputs can be made visible but are read only (i.e. if you configure not to hide the rich text input you have a live preview).
Configuration as follows:
- `Shortcut`: Shortcut to toggle the field to/from Markdown input (also toggling rich and plain text inputs read only). (default `Ctrl+M`)
- `Default field state` [`rich text`, `markdown`]: Which state fields default to. (default `rich text`)
- `Restore state on toggle` [`true`, `false`]: Revert to default field state when selecting a new note. (default `false`)
- `Hide rich text on toggle` [`true`,  `false`]: Hide rich text input when setting markdown field state (and reverse). (default `true`)
- `Hide plain text on toggle` [`true`,  `false`]: Hide plain text input when setting markdown field state (and reverse). (default `true`)
- `CSS`: CSS to apply to the CodeMirror editor (see https://codemirror.net/examples/styling/). (default `.cm-content { font-family: Consolas, monospace; font-size: 16px; }`)

### Dialog input
When focus is in a rich text input use shortcut to open that field in a popup dialog to edit Markdown, allows option to cancel the edit.
Conbfiguration as follows:
- `Shortcut`: Shortcut to open Markdown dialog. (default `Ctrl+Alt+M`)
- `Shortcut accept`: Shortcut to close and apply Markdown input. (default `Ctrl+Return`)
- `Shortcut reject`: Shortcut to close and discard Markdown input. (default `Shift+Escape`)
- `Size mode` [`parent`, `last`, `WIDTHxHEIGHT`]: Size of Markdown input dialog. (default `parent`)
- `Selection only` [`true`,  `false`]: Open the entire field or only the selection for Markdown input. When setting this to true selection will be expanded to include all "straddled" tags as well as at least one complete line. (default `false`)
- `CSS`: CSS to apply to the CodeMirror editor (see https://codemirror.net/examples/styling/). (default `.cm-content { font-family: Consolas, monospace; font-size: 16px; }`)
- `Last geometry`: For addon internal use.

### Showdown
Configuration of the HTML ⇔ Markdown conversion is as follows:
- `Table newline`: Character(s) to replace newline in tables. (default `¨`)

### CodeMirror
You can customize the CodeMirror keyboard shortcuts (CodeMirror key sequences are specified in CodeMirror format (https://codemirror.net/docs/ref/#view.KeyBinding).
- There are many more available functions that you can map or change than those in the default config, listing those would make this readme huge, instead you have to read the CodeMirror documentation.
- Note that the Alt key does not reach the CodeMirror editor when in field input mode so don't use Alt combinations if you intend to use field input mode.
- Note that Anki shortcuts grab keysequences before they reach the CodeMirror editor, use Customize Keyboard Shortcut (https://ankiweb.net/shared/info/24411424) or other addon to change the Anki shortcuts as needed.
- Note that the CSS can be customized differently for the field input and the dialog input.

## Anki Svelte knowledge welcome
It would seem logical to make the Field input editor to a Svelte component which implements the EditingInputAPI. Unfortunately, for me 99% of programming time is spent trying to understand different frameworks and build environments and only 1% on the actual addon logic. Right now I feel time is too precious for yet another framework. So hit me up if you are Anki-Svelte savvy and want to polish the addon (the thing is MIT license any way so you do whatever you want with it).