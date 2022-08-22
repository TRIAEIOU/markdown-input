/**
 * FORKED FROM mdast-util-to-markdown/lib/handlers/break.js
 * Only change is return `  \n` instead of `\\\n`
 */
/**
 * @typedef {import('../types.js').Handle} Handle
 * @typedef {import('mdast').Break} Break
 */

import { patternInScope } from 'mdast-util-to-markdown/lib/util/pattern-in-scope.js'

/**
 * @type {Handle}
 * @param {Break} _
 */
function _breakSpaces(_, _1, context, safe) {
  let index = -1

  while (++index < context.unsafe.length) {
    // If we can’t put eols in this construct (setext headings, tables), use a
    // space instead.
    if (
      context.unsafe[index].character === '\n' &&
      patternInScope(context.stack, context.unsafe[index])
    ) {
      return /[ \t]/.test(safe.before) ? '' : ' '
    }
  }

  return '  \n'
}

export const breakSpaces = {
  handlers: {
    break: _breakSpaces
  }
}