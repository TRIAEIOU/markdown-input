// Sync with constants.py

// Field input
export const FIELD_INPUT = 'Field input'
export const SC_TOGGLE = 'Shortcut'
export const SC_RICH = "Rich text shortcut"
export const SC_NEXT = "Next field"
export const SC_PREV = "Previous field"
export const FIELD_DEFAULT = 'Default field state'
export const CYCLE_RICH_MD = "Cycle rich text/Markdown"
export const HIDE_TOOL = "Autohide toolbar"

// Window input
export const WINDOW_INPUT = "Window input"
export const WINDOW_MODE = "Mode"
export const SC_OPEN = 'Shortcut'
export const SC_ACCEPT = "Shortcut accept"
export const SC_REJECT = "Shortcut reject"
export const SIZE_MODE = "Size mode" // "parent", "last", WIDTHxHEIGHT (e.g "1280x1024")
export const CSS = "CSS"
export const LAST_GEOM = "Last geometry"

// Converter
export const CONVERTER = "Converter"
export const MD_FORMAT = "Markdown format"
export const MD_EXTENSIONS = "Markdown extensions"

// Editor
export const EDITOR = "CodeMirror"
export const KEYMAP = "keymap"
export const THEME = "Theme"
export const SYNTAX = "Syntax highlighting"

// General
export const MDI = "MDI"

import { Options as AnkiMdHtmlOptions } from "anki-md-html"
import { Configuration as CMConfiguration } from "./editor"
export interface Configuration {
  'Field input': {},
  'Converter': AnkiMdHtmlOptions,
  'CodeMirror': CMConfiguration
}