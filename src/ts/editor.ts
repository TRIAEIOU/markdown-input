import { EditorView, keymap, highlightSpecialChars, drawSelection, rectangularSelection, crosshairCursor, highlightActiveLine, dropCursor } from "@codemirror/view"
import { EditorState, Extension, Transaction, EditorSelection, SelectionRange } from "@codemirror/state"
import { indentOnInput, bracketMatching, indentUnit, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language"
import {classHighlighter} from '@lezer/highlight'
import { blockComment, blockUncomment, copyLineDown, copyLineUp, cursorCharBackward, cursorCharForward, cursorCharLeft, cursorCharRight, cursorDocEnd, cursorDocStart, cursorGroupBackward, cursorGroupForward, cursorGroupLeft, cursorGroupRight, cursorLineBoundaryBackward, cursorLineBoundaryForward, cursorLineDown, cursorLineEnd, cursorLineStart, cursorLineUp, cursorMatchingBracket, cursorPageDown, cursorPageUp, cursorSubwordBackward, cursorSubwordForward, cursorSyntaxLeft, cursorSyntaxRight, defaultKeymap, deleteCharBackward, deleteCharForward, deleteGroupBackward, deleteGroupForward, deleteLine, deleteToLineEnd, deleteToLineStart, deleteTrailingWhitespace, emacsStyleKeymap, history, historyField, historyKeymap, indentLess, indentMore, indentSelection, indentWithTab, insertBlankLine, insertNewline, insertNewlineAndIndent, insertTab, invertedEffects, isolateHistory, lineComment, lineUncomment, moveLineDown, moveLineUp, redo, redoDepth, redoSelection, selectAll, selectCharBackward, selectCharForward, selectCharLeft, selectCharRight, selectDocEnd, selectDocStart, selectGroupBackward, selectGroupForward, selectGroupLeft, selectGroupRight, selectLine, selectLineBoundaryBackward, selectLineBoundaryForward, selectLineDown, selectLineEnd, selectLineStart, selectLineUp, selectMatchingBracket, selectPageDown, selectPageUp, selectParentSyntax, selectSubwordBackward, selectSubwordForward, selectSyntaxLeft, selectSyntaxRight, simplifySelection, splitLine, standardKeymap, toggleBlockComment, toggleBlockCommentByLine, toggleComment, toggleLineComment, transposeChars, undo, undoDepth, undoSelection } from "@codemirror/commands"
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete"
import { RegExpCursor, SearchCursor, SearchQuery, closeSearchPanel, findNext, findPrevious, getSearchQuery, gotoLine, highlightSelectionMatches, openSearchPanel, replaceAll, replaceNext, search, searchKeymap, selectMatches, selectNextOccurrence, selectSelectionMatches, setSearchQuery } from "@codemirror/search"
import { autocompletion, completionKeymap } from "@codemirror/autocomplete"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { ankiCloze, ankiClozeKeymap, clozeCurrent, clozeNext } from "./CodeMirror.extensions/ankiCloze"
import { ankiImagePaste } from "./CodeMirror.extensions/ankiImagePaste"
import { joinLines, joinLinesKeymap } from "./CodeMirror.extensions/joinLines"

// Name to function lookup
const cm_functions = {'clozeCurrent': clozeCurrent, 'clozeNext': clozeNext, 'RegExpCursor': RegExpCursor, 'SearchCursor': SearchCursor, 'SearchQuery': SearchQuery, 'closeSearchPanel': closeSearchPanel, 'findNext': findNext, 'findPrevious': findPrevious, 'getSearchQuery': getSearchQuery, 'gotoLine': gotoLine, 'highlightSelectionMatches': highlightSelectionMatches, 'openSearchPanel': openSearchPanel, 'replaceAll': replaceAll, 'replaceNext': replaceNext, 'search': search, 'searchKeymap': searchKeymap, 'selectMatches': selectMatches, 'selectNextOccurrence': selectNextOccurrence, 'selectSelectionMatches': selectSelectionMatches, 'setSearchQuery': setSearchQuery, 'blockComment': blockComment, 'blockUncomment': blockUncomment, 'copyLineDown': copyLineDown, 'copyLineUp': copyLineUp, 'cursorCharBackward': cursorCharBackward, 'cursorCharForward': cursorCharForward, 'cursorCharLeft': cursorCharLeft, 'cursorCharRight': cursorCharRight, 'cursorDocEnd': cursorDocEnd, 'cursorDocStart': cursorDocStart, 'cursorGroupBackward': cursorGroupBackward, 'cursorGroupForward': cursorGroupForward, 'cursorGroupLeft': cursorGroupLeft, 'cursorGroupRight': cursorGroupRight, 'cursorLineBoundaryBackward': cursorLineBoundaryBackward, 'cursorLineBoundaryForward': cursorLineBoundaryForward, 'cursorLineDown': cursorLineDown, 'cursorLineEnd': cursorLineEnd, 'cursorLineStart': cursorLineStart, 'cursorLineUp': cursorLineUp, 'cursorMatchingBracket': cursorMatchingBracket, 'cursorPageDown': cursorPageDown, 'cursorPageUp': cursorPageUp, 'cursorSubwordBackward': cursorSubwordBackward, 'cursorSubwordForward': cursorSubwordForward, 'cursorSyntaxLeft': cursorSyntaxLeft, 'cursorSyntaxRight': cursorSyntaxRight, 'defaultKeymap': defaultKeymap, 'deleteCharBackward': deleteCharBackward, 'deleteCharForward': deleteCharForward, 'deleteGroupBackward': deleteGroupBackward, 'deleteGroupForward': deleteGroupForward, 'deleteLine': deleteLine, 'deleteToLineEnd': deleteToLineEnd, 'deleteToLineStart': deleteToLineStart, 'deleteTrailingWhitespace': deleteTrailingWhitespace, 'emacsStyleKeymap': emacsStyleKeymap, 'history': history, 'historyField': historyField, 'historyKeymap': historyKeymap, 'indentLess': indentLess, 'indentMore': indentMore, 'indentSelection': indentSelection, 'indentWithTab': indentWithTab, 'insertBlankLine': insertBlankLine, 'insertNewline': insertNewline, 'insertNewlineAndIndent': insertNewlineAndIndent, 'insertTab': insertTab, 'invertedEffects': invertedEffects, 'isolateHistory': isolateHistory, 'lineComment': lineComment, 'lineUncomment': lineUncomment, 'moveLineDown': moveLineDown, 'moveLineUp': moveLineUp, 'redo': redo, 'redoDepth': redoDepth, 'redoSelection': redoSelection, 'selectAll': selectAll, 'selectCharBackward': selectCharBackward, 'selectCharForward': selectCharForward, 'selectCharLeft': selectCharLeft, 'selectCharRight': selectCharRight, 'selectDocEnd': selectDocEnd, 'selectDocStart': selectDocStart, 'selectGroupBackward': selectGroupBackward, 'selectGroupForward': selectGroupForward, 'selectGroupLeft': selectGroupLeft, 'selectGroupRight': selectGroupRight, 'selectLine': selectLine, 'selectLineBoundaryBackward': selectLineBoundaryBackward, 'selectLineBoundaryForward': selectLineBoundaryForward, 'selectLineDown': selectLineDown, 'selectLineEnd': selectLineEnd, 'selectLineStart': selectLineStart, 'selectLineUp': selectLineUp, 'selectMatchingBracket': selectMatchingBracket, 'selectPageDown': selectPageDown, 'selectPageUp': selectPageUp, 'selectParentSyntax': selectParentSyntax, 'selectSubwordBackward': selectSubwordBackward, 'selectSubwordForward': selectSubwordForward, 'selectSyntaxLeft': selectSyntaxLeft, 'selectSyntaxRight': selectSyntaxRight, 'simplifySelection': simplifySelection, 'splitLine': splitLine, 'standardKeymap': standardKeymap, 'toggleBlockComment': toggleBlockComment, 'toggleBlockCommentByLine': toggleBlockCommentByLine, 'toggleComment': toggleComment, 'toggleLineComment': toggleLineComment, 'transposeChars': transposeChars, 'undo': undo, 'undoDepth': undoDepth, 'undoSelection': undoSelection}

/** CodeMirror instance configuration */
interface Shortcut {
  key: string,
  shift?: string,
  run?: string,
  scope?: string,
  preventDefault?: string
}
interface Configuration {
  parent: Element
  keymap?: [Shortcut]
  oninput?: (doc: string) => void
  events?: {}
}
class Editor {
  cm: EditorView
  extensions: any[]

  constructor(cfg: Configuration) {
    const km = []
    for (const sc of cfg.keymap) {
      const tmp: Shortcut = {key: sc.key}
      if('shift' in sc) tmp.shift = cm_functions[sc.shift]
      if('run' in sc) tmp.run = cm_functions[sc.run]
      if('scope' in sc) tmp.scope = sc.scope
      if('preventDefault' in sc) tmp.preventDefault = sc.preventDefault
      km.push(tmp)
    }

    this.extensions = [
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      search(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      syntaxHighlighting(classHighlighter, {fallback: false}),
      indentUnit.of("    "),
      // @ts-ignore FIXME: what is correct TS for below?
      keymap.of([
        ...km,
        ...ankiClozeKeymap,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        indentWithTab,
        ...historyKeymap,
        ...completionKeymap,
        ...joinLinesKeymap
      ]),
      EditorView.lineWrapping,
      markdown({ base: markdownLanguage }),
      ankiImagePaste(),
      joinLines()
    ]
    if (cfg.events) this.extensions.push(EditorView.domEventHandlers(cfg.events))

    const editor_view = {
      state: EditorState.create({extensions: this.extensions}),
      parent: cfg.parent
    }

    if (cfg.oninput) {
      editor_view['dispatch'] = function(tr: Transaction) {
        const res = this.update([tr])
        if (!tr.changes.empty) cfg.oninput(this.state.doc.toString())
        return res
      }
    }

    this.cm = new EditorView(editor_view)
  }

  set_doc(doc: string, ord: number, pos: 'start'|'end') {
    this.cm.setState(EditorState.create({
      doc: doc,
      extensions: this.extensions.concat([ankiCloze({ordinal: ord})]),
      selection: {anchor: pos === 'start' ? 0 : doc.length}
    }))
  }

  get_selections() {
    return this.cm.state.selection.ranges
  }

  set_selections(ranges: readonly SelectionRange[]) {
    this.cm.dispatch({selection: EditorSelection.create(ranges)})
  }
}

function highlighter(cfg: {}) {

}

function theme(cfg: {}) {

}

export type {Shortcut, Configuration}
export {Editor, highlighter, theme}