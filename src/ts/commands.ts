import * as commands from "@codemirror/commands"
import * as search from "@codemirror/search"
import * as anki from "./CodeMirror.extensions/ankiCloze"
import * as joinLines from "./CodeMirror.extensions/joinLines"

const _fns: any[] = []

export function to_function(name: string) {
  if (!_fns.length) _init([commands, search, anki, joinLines])
  return _fns[name]

  function _init(namespaces: any[]) {
    for (const namespace of namespaces)
      for (const [k, v] of Object.entries(namespace))
        _fns[k] = v
  }
}
