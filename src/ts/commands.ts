import * as commands from "@codemirror/commands"
import * as search from "@codemirror/search"
import * as mdi_commands from "./CodeMirror.extensions/mdi_commands"

const _fns: any[] = []

export function to_function(name: string) {
  if (!_fns.length) _init([commands, search, mdi_commands])
  return _fns[name]

  function _init(namespaces: any[]) {
    for (const namespace of namespaces)
      for (const [k, v] of Object.entries(namespace))
        _fns[k] = v
  }
}
