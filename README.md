# Markdown input

[Anki](https://github.com/ankitects/anki) [addon](https://github.com/TRIAEIOU/Markdown-input) that allows adding and editing notes in extended [CommonMark](https://spec.commonmark.org/) [Markdown](https://daringfireball.net/projects/markdown/), either directly in the editor fields ("field input mode", similar to the core plain and rich text edit interface) or by opening a separate window to edit a specific field ("dialog input mode").

![Markdown input](https://raw.githubusercontent.com/TRIAEIOU/Markdown-input/main/Screenshots/screenshot.png)

## Warning

- Markdown is not "another way to write HTML", it is a plain text format that has a determined translation to HTML (the format the Anki editor uses). The HTML generated is a subset of all HTML and, amongst other things, makes heave use of `<p>` tags (which are not used by the Anki editor). Furthermore there is no spec on the conversion from HTML *to* Markdown. This makes conversion (esp. HTML ⇒ Markdown) tricky (i.e. there is risk for loss of information in the conversion).
- Editing a field in Markdown will result in the original field HTML being converted to Markdown and then back to HTML - the end result may differ from the original (especially in case of complex HTML). For instance, the representation of tables does not allow for nested tables in Markdown, so if the original HTML has nested tables they will be lost on cycling. If you are not familiar with Markdown consider duplicating your deck and play around with a copy so that you are sure you know what you are doing.
- Note however, that if you do not make any changes in the field input mode or cancel the dialog input mode the orginal Anki HTML will remain untouched when you toggle back. Also note that in field input mode making a change and then undoing will still count as "making a change" (changes update the HTML continuously).
- There are a number of moving parts involved, notably customized versions of low level [unified](https://unifiedjs.com/) functions and [CodeMirror](https://codemirror.net/), there may be bugs creeping around.
- If you are not familiar with Markdown look it up where it [began](https://daringfireball.net/projects/markdown/basics) and elsewhere, [here](https://commonmark.org/help/tutorial/) or [here](https://commonmark.org/help/) for instance, to determine if it is for you.

## HTML ⇔ Markdown

Conversion to/from HTML is done through unified functions `hast-util-from/to-html` `hast-util-to-mdast`/`mdast-util-to-hast` and `mdast-util-to/from-markdown` which are [CommonMark](https://spec.commonmark.org/) compliant with the following changes and extensions:

- Markdown uses `<p>` tags to mark paragraphs, in the Anki editor those are omitted and `<br>` tags are used "instead". The converter takes this into consideration (i.e. generates `<br>` HTML).
- Markdown has a concept of lists being ["tight" or "loose"](https://spec.commonmark.org/0.30/#loose) - leading to text in the list items being wrapped in `<p>` tags or not, which in turn changes the ammount of padding that is rendered. It is unclear how to transform that in a meaningful way Markdown → HTML → Markdown. Therefore the HTML lists generated have a `markdown-tight` or `markdown-loose` class applied so they can be styled according to preference, example (needs to be tweaked):

  ``` CSS
  ul.markdown-loose > li, ol.markdown-loose > li {padding: 10px}
  ul.markdown-tight > li, ol.markdown-tight > li {padding: 0px}
  ```

- Spec `*sample*`/`<em>sample</em>` and `**sample**`/`<strong>sample</strong>` are swapped to `<i>` and `<b>` to match the Anki editor (and spec `_sample_` has been rerouted to underline, see below).
- GFM style tables that have been extended  (see below).
- `~sample~` for subscript
- `^sample^` for superscript
- `_sample_` for underline (spec Markdown is `<em>` which renders as italic).
- GFM strikethrough (`~~sample~~`) for strikthrough text (note: GFM also allows single `~` but that has been rerouted to subscript, see above).
- Directive defined for [Inline Media](https://ankiweb.net/shared/info/683715045), e.g. `:audio(im-xyz.ogg){loop auto_front}`/`:video(im-xyz.ogg){loop auto_front height=200}`
- [Defintion lists](https://github.com/wataru-chocola/mdast-util-definition-list) (not available in the core Anki editor).

### Tables

Standard GFM table syntax is supported:

``` Markdown
| A     |   GFM |
| :---- | ----: |
| table |     ! |
```

And has been extended to allow headerless tables:

``` Markdown
| :--: | ----: |
|  A   | table |
| with |  rows |
```

and

``` Markdown
|  A   | table |
| with | rows  |
```

will both result in tables without a `<thead>` being generated.

- GFM tables do not allow newlines inside them. Per default trema (`¨`) will be replaced by a hard line break inside table cells (`<br>` is too cumbersome to write), the symbol can be configure in `json.config`, set to `""` to remove the functionality.
- Optional fencing pipes (i.e. at start and end of each row).
- Align none, left, right and center.

## Editor

The editor used is [CodeMirror 6](https://codemirror.net/) with the following configurations:

- Markdown syntax highlighting and auto fill (continue lists, autoindent etc.)
- Undo history
- Multiple drawable selections
- Search and replace, `Ctrl+F`, currently only in the dialog input as the Anki editor eats a lot of the shortcuts.
- Insert cloze deletions (see below)

### Cloze deletions

Cloze deletions are inserted as in the rich text editor with the following addition:

- Closing `}}` are "moved up" to end of last item in lists (and conversly moved out to include the closing `</li></ul|ol>` tags).
- Keyboard shortcuts:
  - Cloze without increment: `Ctrl+Alt+Shift+C`
  - Cloze with increment: `Ctrl+Shift+C` (with multiple selections this will cloze each incrementally)
- If you feel the cloze deletion tags end up in the wrong place please make sure you understand how Markdown is converted to HTML (notably line breaks and empty lines).

## Configuration

The addon has two input modes, either directly in the field in the editor (field input mode") or through a popup dialog ("dialog input mode").

### Field input mode

When the field is in markdown mode the rich and plain text inputs can be made visible but are read only (i.e. if you configure not to hide the rich text input you have a live preview). Configuration as follows:

- `Shortcut`: Shortcut to toggle the field to/from Markdown input (also toggling rich and plain text inputs read only). (default `Ctrl+M`)
- `Default field state` [`rich text`, `markdown`]: Which state fields default to. (default `rich text`)
- `Restore state on toggle` [`true`, `false`]: Revert to default field state when selecting a new note. (default `false`)
- `Hide rich text on toggle` [`true`,  `false`]: Hide rich text input when setting markdown field state (and reverse). (default `true`)
- `Hide plain text on toggle` [`true`,  `false`]: Hide plain text input when setting markdown field state (and reverse). (default `true`)
- `CSS`: [CSS](https://codemirror.net/examples/styling/) to apply to the CodeMirror editor. (default `.cm-content { font-family: Consolas, monospace; font-size: 16px; }`)

### Dialog input mode

When focus is in a rich text input use shortcut to open that field in a popup dialog to edit Markdown, allows option to cancel the edit.
Conbfiguration as follows:

- `Shortcut`: Shortcut to open Markdown dialog. (default `Ctrl+Alt+M`)
- `Shortcut accept`: Shortcut to close and apply Markdown input. (default `Ctrl+Return`)
- `Shortcut reject`: Shortcut to close and discard Markdown input. (default `Shift+Escape`)
- `Size mode` [`parent`, `last`, `WIDTHxHEIGHT`]: Size of Markdown input dialog. (default `parent`)
- `Selection only` [`true`,  `false`]: Open the entire field or only the selection for Markdown input. When setting this to true selection will be expanded to include all "straddled" tags as well as at least one complete line. (default `false`)
- `CSS`: [CSS](https://codemirror.net/examples/styling/) to apply to the CodeMirror editor. (default `.cm-content { font-family: Consolas, monospace; font-size: 16px; }`)
- `Last geometry`: For addon internal use.

### HTML ⇔ Markdown

Configuration of the HTML ⇔ Markdown conversion is as follows:

- `Table newline`: Character(s) to replace newline in tables. (default `¨`)
- `Hard break` (`spaces` or `backslash`): HTML ⇒ Markdown rendering of [hard breaks](https://commonmark.org/help/tutorial/03-paragraphs.html) (default `spaces`)
- To customize the look of the finished HTML apply custom CSS styling (for instance of `<h1/2/3/etc>`, `<table>` `<ul/ol>` etc.).

### Editor

You can customize the CodeMirror keyboard shortcuts (CodeMirror key sequences are specified in [CodeMirror format](https://codemirror.net/docs/ref/#view.KeyBinding)).

- There are many more available functions that you can map or change than those in the default config, listing those would make this readme huge, instead you have to read the CodeMirror documentation.
- Note that Anki shortcuts grab keysequences before they reach the CodeMirror editor, use [Customize Keyboard Shortcut](https://ankiweb.net/shared/info/24411424) or other addon to change the Anki shortcuts as needed. Note however that at the time of writing [Customize Keyboard Shortcut](https://ankiweb.net/shared/info/24411424) hooks into the Qt/Python for the cloze shortcuts. This means they never reach CodeMirror so unmap (`<nop`>) them in [Customize Keyboard Shortcut](https://ankiweb.net/shared/info/24411424), the new Anki editor grabs the shortcuts on the JavaScript side.
- Note that the CSS can be customized differently for the field input and the dialog input.

## Miscellaneous

I have probably forgotten to document some stuff in the readme, check back later to see if something else has been documented.

### Anki Svelte and CodeMirror 6 knowledge welcome

It would seem logical to make the Field input editor a Svelte component which implements the EditingInputAPI. Unfortunately, for me 99% of programming time is spent trying to understand different frameworks and build environments and only 1% on the actual logic so at the moment I'll refrain from yet another framework. Hit me up if you are Anki-Svelte savvy and want to polish the addon (the thing is MIT license any way so you do whatever you want with it).

## Changelog

- 2022-08-27: Add image paste support, prevent focus from being stolen on focus in/out, bug fixes
- 2022-10-16: Make dialog mode non-modal (and allow multiple dialogs open), add `Ctrl-Shift-j` to join lines, bug fixes
