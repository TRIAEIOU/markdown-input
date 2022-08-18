import {all as mdastAll} from 'mdast-util-to-hast';
import {all as hastAll} from 'hast-util-to-mdast';

/**
 * Convert `mdast` `emphasis` and `strong` nodes to `hast` `i` and `b` nodes,
 * pass in `mdast-to-hast` and `hast-to-mdast` `handlers` respectively
 */
const emStrongToIB = {
    emphasis: function (h, node) { return h(node, 'i', mdastAll(h, node)); },
    strong: function (h, node) { return h(node, 'b', mdastAll(h, node)); }
}

const iBToEmStrong = {
    i: function (h, node) { return h(node, 'emphasis', hastAll(h, node)); },
    b: function (h, node) { return h(node, 'strong', hastAll(h, node)); }
}

export {emStrongToIB, iBToEmStrong}