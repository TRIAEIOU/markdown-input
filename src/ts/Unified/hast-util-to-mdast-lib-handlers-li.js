/**
 * @typedef {import('hast-util-to-mdast').Handle} Handle
 * @typedef {import('hast-util-to-mdast').Element} Element
 * @typedef {import('hast-util-to-mdast').ElementChild} ElementChild
 * @typedef {import('hast-util-to-mdast').MdastNode} MdastNode
 */

import {convertElement} from 'hast-util-is-element'
import {wrapChildren} from 'hast-util-to-mdast/lib/util/wrap-children.js'
import {phrasing} from 'hast-util-phrasing';

const p = convertElement('p')
const input = convertElement('input')

// If index represents a "blank row"
// - 0 for false
// - Positive int for number of el that are blank
// - -1 for only one <br>
function blank(children, i) {
  let n = i;
  let isBlank = false;
  while ( n > -1
          &&  (children[n].tagName === 'p'
              || children[n].tagName === 'br')) {
    if (children[n].tagName === 'p') isBlank = true;
    else if (children[n] === 'br') {
      if (children[n - 1] === 'br') isBlank = true;
    }
    n--;
  }
  return isBlank ? i - n : -1;
}

// If the node is an <ul> or <ol>
function list(node) {
  return  node.tagName === 'ul'
          || node.tagName === 'ol';
}

/**
 * @type {Handle}
 * @param {Element} node
 */
export function li(h, node) {
  const head = node.children[0]
  /** @type {boolean|null} */
  let checked = null
  /** @type {ElementChild} */
  let checkbox
  /** @type {Element|undefined} */
  let clone

  // Check if this node starts with a checkbox.
  if (p(head)) {
    checkbox = head.children[0]

    if (
      input(checkbox) &&
      checkbox.properties &&
      (checkbox.properties.type === 'checkbox' ||
        checkbox.properties.type === 'radio')
    ) {
      checked = Boolean(checkbox.properties.checked)
      clone = {
        ...node,
        children: [
          {...head, children: head.children.slice(1)},
          ...node.children.slice(1)
        ]
      }
    }
  }

  // Spread if
  // - Item ends with "blank row" (last child(ren) is/are <p> or 2x <br>)
  // - Item ends with a nested list preceeded by a "blank row"
  // - Contains two blocks separated by "blank row"
  const nd = clone || node;
  const end = nd.children.length - 1;
  let spread = false;
  if (end >= 0) {
    // Ends with blank or blank-list
    spread =  blank(nd.children, list(nd.children[end]) ? end - 1 : end) > 0;

    // Check for block-blank-block
    // Note we start one el in and stop one before end
    for (let i = 1; !spread && i < end; i++) {
      const blanks = blank(nd.children, i);
      spread =  blanks > 0 && blanks <= end
                && !phrasing(nd.children[i - blanks])
                && !phrasing(nd.children[i + 1]);
    }
  }

  const content = wrapChildren(h, nd);
  return h(node, 'listItem', {spread: spread, checked}, content)
}
