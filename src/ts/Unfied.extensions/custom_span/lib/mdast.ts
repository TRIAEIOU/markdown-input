import type {Delete} from 'mdast';
import type {Extension, Handle as FromHandle} from 'mdast-util-from-markdown'
import type {Handle as ToHandle} from 'mdast-util-to-markdown'
import { Handlers, Join, Options, TrackFields, Unsafe, Context, Parent } from 'mdast-util-to-markdown/lib/types'
/**
 * @-typedef {import('mdast').Delete} Delete
 * @-typedef {import('mdast-util-from-markdown').Extension} Extension
 * @-typedef {import('mdast-util-from-markdown').Handle} FromHandle
 * @-typedef {import('mdast-util-to-markdown').Options} Options
 * @-typedef {import('mdast-util-to-markdown').Handle} ToHandle
 */
import {containerPhrasing} from 'mdast-util-to-markdown/lib/util/container-phrasing.js'
import {track} from 'mdast-util-to-markdown/lib/util/track.js'

/** @-type {Extension} */
const fromMarkdown: Extension = {
    canContainEols: ['span'],
    // @ts-ignore
    enter: {span: enterSpan},
    // @ts-ignore
    exit: {span: exitSpan}
}

/** @-type {Options} */
const toMarkdown:Options = {
    unsafe: [{character: '~', inConstruct: 'phrasing'}],
    handlers: {delete: handleDelete}
}

handleDelete.peek = peekDelete

/** @-type {FromHandle} */
function enterSpan(token: FromHandle) {
    this.enter({type: 'span', children: []}, token)
}

/** @-type {FromHandle} */
function exitSpan(token: FromHandle) {
    this.exit(token)
}

/**
 * @-type {ToHandle}
 * @-param {Delete} node
 */
function handleDelete(node: Delete, _: Parent, context: Context, safeOptions: TrackFields): string {
    const tracker = track(safeOptions)
    const exit = context.enter('span')
    let value = tracker.move('~')
    value += containerPhrasing(node, context, {
        ...tracker.current(),
        before: value,
        after: '~'
    })
    value += tracker.move('~')
    exit()
    return value
}

/** @-type {ToHandle} */
function peekDelete(): string {
    return '~'
}

export type {Delete, Extension, FromHandle, Options, ToHandle}
export {fromMarkdown, toMarkdown}