/**
 * @-typedef {import('mdast').Delete} Delete
 * @-typedef {import('mdast-util-from-markdown').Extension} Extension
 * @-typedef {import('mdast-util-from-markdown').Handle} FromHandle
 * @-typedef {import('mdast-util-to-markdown').Options} Options
 * @-typedef {import('mdast-util-to-markdown').Handle} ToHandle
 */
import { containerPhrasing } from 'mdast-util-to-markdown/lib/util/container-phrasing.js';
import { track } from 'mdast-util-to-markdown/lib/util/track.js';
/** @-type {Extension} */
const fromMarkdown = {
    canContainEols: ['span'],
    // @ts-ignore
    enter: { span: enterSpan },
    // @ts-ignore
    exit: { span: exitSpan }
};
/** @-type {Options} */
const toMarkdown = {
    unsafe: [{ character: '~', inConstruct: 'phrasing' }],
    handlers: { delete: handleDelete }
};
handleDelete.peek = peekDelete;
/** @-type {FromHandle} */
function enterSpan(token) {
    this.enter({ type: 'span', children: [] }, token);
}
/** @-type {FromHandle} */
function exitSpan(token) {
    this.exit(token);
}
/**
 * @-type {ToHandle}
 * @-param {Delete} node
 */
function handleDelete(node, _, context, safeOptions) {
    const tracker = track(safeOptions);
    const exit = context.enter('emphasis');
    let value = tracker.move('~');
    value += containerPhrasing(node, context, {
        ...tracker.current(),
        before: value,
        after: '~'
    });
    value += tracker.move('~');
    exit();
    return value;
}
/** @-type {ToHandle} */
function peekDelete() {
    return '~';
}
export { fromMarkdown, toMarkdown };
