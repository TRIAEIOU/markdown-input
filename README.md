# Markdown input

[Anki](https://github.com/ankitects/anki) [addon](https://github.com/TRIAEIOU/Markdown-input) that allows adding and editing notes in extended [CommonMark](https://spec.commonmark.org/) [Markdown](https://daringfireball.net/projects/markdown/), either directly in the editor fields ("field input mode", similar to the core rich and plain text edit interface) or by opening a separate window to edit a specific field ("dialog input mode").

![Markdown input](https://github.com/TRIAEIOU/Markdown-input/blob/ee2bc9b7572c1c4a06dae84a89513862eb7b01d5/Screenshots/add.png)

## Warning

- Markdown is not "another way to write HTML", it is a plain text format that has a determined translation to HTML (the format the Anki editor uses). The HTML generated is a subset of all HTML and, amongst other things, makes heavy use of `<p>` tags (which are not used by the Anki editor). Furthermore there is no spec on the conversion from HTML *to* Markdown. This makes conversion tricky and there is risk for loss of information when cycling HTML → Markdown → HTML.
- Editing a field in Markdown will result in the original field HTML being converted to Markdown and then back to HTML - the end result may differ from the original (especially in case of complex HTML). For instance, the representation of tables does not allow for nested tables in Markdown. So if the original HTML has nested tables these will be lost on cycling. If you are not familiar with Markdown consider duplicating your deck and play around with a copy so that you are sure you know what you are doing.
- Note however, that if you do not make any changes in the "field input mode" or cancel the "dialog input mode" the orginal Anki HTML will remain untouched when you toggle back. Also note that in field input mode making a change and then undoing will still count as "making a change" (changes update the HTML continuously).
- If you are not familiar with Markdown look it up where it [began](https://daringfireball.net/projects/markdown/basics) or [here](https://commonmark.org/help/tutorial/) or [here](https://commonmark.org/help/) for instance, to determine if it is for you.

## HTML ↔ Markdown

Conversion to/from HTML is done through [unified](https://unifiedjs.com/) Markdown functions `hast-util-from/to-html` `hast-util-to-mdast`/`mdast-util-to-hast` and `mdast-util-to/from-markdown` which are [CommonMark](https://spec.commonmark.org/) compliant. The following changes/extensions has been made in the addon:

- Markdown uses `<p>` tags to mark paragraphs, these are replaced with `<br>` tags instead to match the Anki editor.
- Markdown has a concept of lists being ["tight" or "loose"](https://spec.commonmark.org/0.30/#loose) which results in list items being wrapped in `<p>` tags or not. This has been replaced with HTML `.markdown-tight` or `.markdown-loose` classes to allow styling, example (needs to be tweaked):

  ``` CSS
  ul.markdown-loose > li, ol.markdown-loose > li {padding: 10px}
  ul.markdown-tight > li, ol.markdown-tight > li {padding: 0px}
  ```

- Spec `<em>sample</em>` (`*sample*`) and `<strong>sample</strong>` (`**sample**`) are swapped to `<i>` and `<b>` to match the Anki editor.
- Configurable Markdown inline/span syntax, defaults are:
  - `~sample~` for subscript
  - `^sample^` for superscript
  - `_sample_` for underline (spec Markdown is `<em>`, remove the `underline` entry in `config.json` to revert to spec).
  - GFM strikethrough (`~~sample~~`) for strikthrough text (In reality GFM also allows single `~` but that has been assigned to subscript, see above).
- Directive defined for [Inline Media](https://ankiweb.net/shared/info/683715045), e.g. `:audio(im-xyz.ogg){loop auto_front}`/`:video(im-xyz.ogg){loop auto_front height=200}`.
- [Defintion lists](https://github.com/wataru-chocola/mdast-util-definition-list) (not available in the core Anki editor).
- Extended table syntax available, `extended`, `gfm` and `none`:
  - GFM table syntax

  ``` Markdown
  | A     |   GFM |
  | :---- | ----: |
  | table |     ! |
  ```

  - Extended table syntax - GFM style extended to allow headerless tables (no `<thead>` generated):

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

  - Newline characters are not allowed inside Markdown table cells. A configurable option has been added to replace hard line break (`<br>`) inside table cells with a character, trema (`¨`) per default, set to empty string (`""`) to remove behaviour.
  - Optional [fencing pipes](https://github.github.com/gfm/#tables-extension-) (i.e. at start and end of each row).
  - Align none, left, right and center as per [GFM format](https://github.github.com/gfm/#tables-extension-).

## Editor

The editor used is [CodeMirror 6](https://codemirror.net/) with the following configurations:

- Markdown syntax highlighting and auto fill (continue lists, autoindent etc.).
- Undo history.
- Multiple drawable selections.
- Search and replace, `Ctrl+F`, note: the Anki editor eats `Ctrl+F`, set to other shortcut in config or remap the Anki editor shortcuts with [Customize Keyboard Shortcuts](https://ankiweb.net/shared/info/24411424) or similar.
- "Field input mode"
  - Configurable default state for editor fields (`rich text` or `markdown`, default `rich text`).
  - Configurable behaviour of "field input mode" shortcut, cycle between rich text and Markdown or just toggle Markdown input. (default cycle: `true`)
  - Configurable shortcut to toggle rich text input. (default `Ctrl+Alt+X`)
- "Dialog input mode"
  - Configurable dialog size (`parent`, `last` or `WidthxHeight`, default `parent`)
  - Open the entire field or only the selection in editor for Markdown input. (default selection only: `false`)
- Style "field" and "dialog input mode" editors with [CSS](https://codemirror.net/examples/styling/).
- Insert cloze deletions
  - Cloze without increment: `Ctrl+Alt+Shift+C`
  - Cloze with increment: `Ctrl+Shift+C` (with multiple selections this will cloze each incrementally)
  - If you feel the cloze deletion tags end up in the wrong place please make sure you understand how Markdown is converted to HTML (notably line breaks and empty lines).
- Allows image pasting in the same way the "rich text input" does.

## Configuration

- "Field input mode" can be configured under `Field input`, note that the default shortcut, `Ctrl+M` conflicts with Mathjax shortcuts, remap one of them.
- "Dialog input mode" can be configured under `Dialog input`.
- HTML ↔ Markdown conversion configurable under `Converter`. See [mdastToMarkdown](https://github.com/syntax-tree/mdast-util-to-markdown#tomarkdowntree-options) for `Markdown format` options.
- Editor configurable under `CodeMirror`. See [CodeMirror documentation](https://codemirror.net/docs/) and [editor.ts](https://github.com/TRIAEIOU/Markdown-input/blob/ab59e006a8d32edc1c6b731d021a2bd0d2a8613b/src/ts/editor.ts)/cm_functions for available functions and how to configure.
- Note that Anki shortcuts grab key sequences before they reach the CodeMirror editor, use [Customize Keyboard Shortcut](https://ankiweb.net/shared/info/24411424) or other addon to change the Anki shortcuts as needed. At the time of writing [Customize Keyboard Shortcut](https://ankiweb.net/shared/info/24411424) hooks into the Qt/Python for the cloze shortcuts. This means they never reach CodeMirror so unmap (`<nop`>) them in [Customize Keyboard Shortcut](https://ankiweb.net/shared/info/24411424) (the new Anki editor grabs the shortcuts on the JavaScript side).
- To customize the look of the finished HTML apply custom [CSS](https://www.w3schools.com/Css/) styling (for instance of `<h1/2/3/etc>`, `<table>` `<ul/ol>` etc.) to the note template.

## Changelog

- 2022-08-27: Add image paste support, prevent focus from being stolen on focus in/out, bug fixes.
- 2022-10-16: Make dialog mode non-modal (and allow multiple dialogs open), add `Ctrl-Shift-j` to join lines, make inline Markdown syntax configurable, make several options configurable, bug fixes.
- 2022-11-20: Make rich and plain text input editable while Markdown input is visible and adjust `config.json` appropriately, add buttons/badges, restructure configuration.
