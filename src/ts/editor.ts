import {EditorView, keymap, highlightSpecialChars, drawSelection, rectangularSelection, crosshairCursor, highlightActiveLine, dropCursor, Command} from "@codemirror/view"
import {EditorState, Transaction} from "@codemirror/state"
import {indentOnInput, bracketMatching} from "@codemirror/language"
//import {defaultKeymap, indentWithTab, history, historyKeymap} from "@codemirror/commands"
import {blockComment, blockUncomment, copyLineDown, copyLineUp, cursorCharBackward, cursorCharForward, cursorCharLeft, cursorCharRight, cursorDocEnd, cursorDocStart, cursorGroupBackward, cursorGroupForward, cursorGroupLeft, cursorGroupRight, cursorLineBoundaryBackward, cursorLineBoundaryForward, cursorLineDown, cursorLineEnd, cursorLineStart, cursorLineUp, cursorMatchingBracket, cursorPageDown, cursorPageUp, cursorSubwordBackward, cursorSubwordForward, cursorSyntaxLeft, cursorSyntaxRight, defaultKeymap, deleteCharBackward, deleteCharForward, deleteGroupBackward, deleteGroupForward, deleteLine, deleteToLineEnd, deleteToLineStart, deleteTrailingWhitespace, emacsStyleKeymap, history, historyField, historyKeymap, indentLess, indentMore, indentSelection, indentWithTab, insertBlankLine, insertNewline, insertNewlineAndIndent, insertTab, invertedEffects, isolateHistory, lineComment, lineUncomment, moveLineDown, moveLineUp, redo, redoDepth, redoSelection, selectAll, selectCharBackward, selectCharForward, selectCharLeft, selectCharRight, selectDocEnd, selectDocStart, selectGroupBackward, selectGroupForward, selectGroupLeft, selectGroupRight, selectLine, selectLineBoundaryBackward, selectLineBoundaryForward, selectLineDown, selectLineEnd, selectLineStart, selectLineUp, selectMatchingBracket, selectPageDown, selectPageUp, selectParentSyntax, selectSubwordBackward, selectSubwordForward, selectSyntaxLeft, selectSyntaxRight, simplifySelection, splitLine, standardKeymap, toggleBlockComment, toggleBlockCommentByLine, toggleComment, toggleLineComment, transposeChars, undo, undoDepth, undoSelection} from "@codemirror/commands"
import {closeBrackets, closeBracketsKeymap} from "@codemirror/autocomplete"
//import {search, highlightSelectionMatches, openSearchPanel, findNext, findPrevious, closeSearchPanel, selectSelectionMatches, gotoLine, selectNextOccurrence} from "@codemirror/search"
import {RegExpCursor, SearchCursor, SearchQuery, closeSearchPanel, findNext, findPrevious, getSearchQuery, gotoLine, highlightSelectionMatches, openSearchPanel, replaceAll, replaceNext, search, searchKeymap, selectMatches, selectNextOccurrence, selectSelectionMatches, setSearchQuery} from "@codemirror/search"
import {autocompletion, completionKeymap} from "@codemirror/autocomplete"
import {markdown} from "@codemirror/lang-markdown"
import {ankiCloze, ankiClozeKeymap, clozeCurrent, clozeNext} from "./CodeMirror.extensions/ankiCloze"
import {ankiImagePaste} from "./CodeMirror.extensions/ankiImagePaste"

// Name to function lookup
const cm_functions = {'clozeCurrent': clozeCurrent, 'clozeNext': clozeNext, 'RegExpCursor': RegExpCursor, 'SearchCursor': SearchCursor, 'SearchQuery': SearchQuery, 'closeSearchPanel': closeSearchPanel, 'findNext': findNext, 'findPrevious': findPrevious, 'getSearchQuery': getSearchQuery, 'gotoLine': gotoLine, 'highlightSelectionMatches': highlightSelectionMatches, 'openSearchPanel': openSearchPanel, 'replaceAll': replaceAll, 'replaceNext': replaceNext, 'search': search, 'searchKeymap': searchKeymap, 'selectMatches': selectMatches, 'selectNextOccurrence': selectNextOccurrence, 'selectSelectionMatches': selectSelectionMatches, 'setSearchQuery': setSearchQuery, 'blockComment': blockComment, 'blockUncomment': blockUncomment, 'copyLineDown': copyLineDown, 'copyLineUp': copyLineUp, 'cursorCharBackward': cursorCharBackward, 'cursorCharForward': cursorCharForward, 'cursorCharLeft': cursorCharLeft, 'cursorCharRight': cursorCharRight, 'cursorDocEnd': cursorDocEnd, 'cursorDocStart': cursorDocStart, 'cursorGroupBackward': cursorGroupBackward, 'cursorGroupForward': cursorGroupForward, 'cursorGroupLeft': cursorGroupLeft, 'cursorGroupRight': cursorGroupRight, 'cursorLineBoundaryBackward': cursorLineBoundaryBackward, 'cursorLineBoundaryForward': cursorLineBoundaryForward, 'cursorLineDown': cursorLineDown, 'cursorLineEnd': cursorLineEnd, 'cursorLineStart': cursorLineStart, 'cursorLineUp': cursorLineUp, 'cursorMatchingBracket': cursorMatchingBracket, 'cursorPageDown': cursorPageDown, 'cursorPageUp': cursorPageUp, 'cursorSubwordBackward': cursorSubwordBackward, 'cursorSubwordForward': cursorSubwordForward, 'cursorSyntaxLeft': cursorSyntaxLeft, 'cursorSyntaxRight': cursorSyntaxRight, 'defaultKeymap': defaultKeymap, 'deleteCharBackward': deleteCharBackward, 'deleteCharForward': deleteCharForward, 'deleteGroupBackward': deleteGroupBackward, 'deleteGroupForward': deleteGroupForward, 'deleteLine': deleteLine, 'deleteToLineEnd': deleteToLineEnd, 'deleteToLineStart': deleteToLineStart, 'deleteTrailingWhitespace': deleteTrailingWhitespace, 'emacsStyleKeymap': emacsStyleKeymap, 'history': history, 'historyField': historyField, 'historyKeymap': historyKeymap, 'indentLess': indentLess, 'indentMore': indentMore, 'indentSelection': indentSelection, 'indentWithTab': indentWithTab, 'insertBlankLine': insertBlankLine, 'insertNewline': insertNewline, 'insertNewlineAndIndent': insertNewlineAndIndent, 'insertTab': insertTab, 'invertedEffects': invertedEffects, 'isolateHistory': isolateHistory, 'lineComment': lineComment, 'lineUncomment': lineUncomment, 'moveLineDown': moveLineDown, 'moveLineUp': moveLineUp, 'redo': redo, 'redoDepth': redoDepth, 'redoSelection': redoSelection, 'selectAll': selectAll, 'selectCharBackward': selectCharBackward, 'selectCharForward': selectCharForward, 'selectCharLeft': selectCharLeft, 'selectCharRight': selectCharRight, 'selectDocEnd': selectDocEnd, 'selectDocStart': selectDocStart, 'selectGroupBackward': selectGroupBackward, 'selectGroupForward': selectGroupForward, 'selectGroupLeft': selectGroupLeft, 'selectGroupRight': selectGroupRight, 'selectLine': selectLine, 'selectLineBoundaryBackward': selectLineBoundaryBackward, 'selectLineBoundaryForward': selectLineBoundaryForward, 'selectLineDown': selectLineDown, 'selectLineEnd': selectLineEnd, 'selectLineStart': selectLineStart, 'selectLineUp': selectLineUp, 'selectMatchingBracket': selectMatchingBracket, 'selectPageDown': selectPageDown, 'selectPageUp': selectPageUp, 'selectParentSyntax': selectParentSyntax, 'selectSubwordBackward': selectSubwordBackward, 'selectSubwordForward': selectSubwordForward, 'selectSyntaxLeft': selectSyntaxLeft, 'selectSyntaxRight': selectSyntaxRight, 'simplifySelection': simplifySelection, 'splitLine': splitLine, 'standardKeymap': standardKeymap, 'toggleBlockComment': toggleBlockComment, 'toggleBlockCommentByLine': toggleBlockCommentByLine, 'toggleComment': toggleComment, 'toggleLineComment': toggleLineComment, 'transposeChars': transposeChars, 'undo': undo, 'undoDepth': undoDepth, 'undoSelection': undoSelection}

// Configuration for CM instances
let _config = {
  keymap: []
}

function create_state(doc: string, ord: number) {
  return EditorState.create({
    doc: doc,
    extensions: [
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
      // @ts-ignore FIXME: what is correct TS for below?
      keymap.of([
        ..._config.keymap,
        ...ankiClozeKeymap,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        indentWithTab,
        ...historyKeymap,
        ...completionKeymap
      ]),
      EditorView.lineWrapping,
      markdown(),
      ankiCloze({ordinal: ord}),
      ankiImagePaste()
    ]
  })
}

function create(parent: Element, doc: string, ord: number, on_change: Function = undefined) {

  function _dispatch(tr: Transaction) {
    const res = this.update([tr])
    if (!tr.changes.empty) {on_change(this.state.doc.toString());}
    return res
  }

  const cfg = {
    state: create_state(doc, ord),
    parent: parent   
  }
  if (on_change) cfg['dispatch'] = _dispatch
  const cm = new EditorView(cfg)
  return cm
}

function set_doc(cm: EditorView, doc: string, ord: number, pos: 'start'|'end') {
  cm.setState(create_state(doc, ord))
  if (pos === 'end')
    cm.dispatch({ selection: { anchor: doc.length } })
}

function init(cfg: object) {
  _config.keymap = []
  cfg['keymap']?.forEach((sc: any) => {
    const tmp = {key: sc['key']}
    if('shift' in sc) tmp['shift'] = cm_functions[sc.shift]
    if('run' in sc) tmp['run'] = cm_functions[sc.run]
    if('scope' in sc) tmp['scope'] = sc.scope
    if('preventDefault' in sc) tmp['preventDefault'] = sc.preventDefault
    _config.keymap.push(tmp)
  })
}

export {create, set_doc, init}