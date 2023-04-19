import {MarkdownConfig, Line, LeafBlockParser, BlockContext, InlineContext, LeafBlock} from "@lezer/markdown"
import {tags as t} from "@lezer/highlight"

// Copied without change from lezer/markdown
//https://github.com/lezer-parser/markdown/blob/bd2b2dd03eb04cc64da4dc634e3462380dd03e05/src/markdown.ts#L232
function space(ch: number) { return ch == 32 || ch == 9 || ch == 10 || ch == 13 }

// Copied without change from lezer/subscript
// https://github.com/lezer-parser/markdown/blob/bd2b2dd03eb04cc64da4dc634e3462380dd03e05/src/extension.ts#L169
function parseUnderline(ch: number, node: string, mark: string) {
  return (cx: InlineContext, next: number, pos: number) => {
    if (next != ch || cx.char(pos + 1) == ch) return -1
    let elts = [cx.elt(mark, pos, pos + 1)]
    for (let i = pos + 1; i < cx.end; i++) {
      let next = cx.char(i)
      if (next == ch)
        return cx.addElement(cx.elt(node, pos, i + 1, elts.concat(cx.elt(mark, i, i + 1))))
      if (next == 92 /* '\\' */)
        elts.push(cx.elt("Escape", i, i++ + 2))
      if (space(next)) break
    }
    return -1
  }
}

// Copied from lezer/subscript - only replaced "Superscript" and "^"
// https://github.com/lezer-parser/markdown/blob/bd2b2dd03eb04cc64da4dc634e3462380dd03e05/src/extension.ts
/// Extension providing _underline_ using `_` markers
export const Underline: MarkdownConfig = {
  defineNodes: [
    {name: "Underline", style: t.special(t.content)},
    {name: "UnderlineMark", style: t.processingInstruction}
  ],
  parseInline: [{
    name: "Underline",
    parse: parseUnderline(95 /* '_' */, "Underline", "UnderlineMark")
  }]
}