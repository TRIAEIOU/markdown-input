import svelte from "rollup-plugin-svelte"
import {nodeResolve} from "@rollup/plugin-node-resolve"
import typescript from "@rollup/plugin-typescript"
import commonjs from "@rollup/plugin-commonjs"
import terser from "@rollup/plugin-terser"

const plugins = [
  typescript(),
  commonjs(),
  nodeResolve({ preferBuiltins: false, browser: true }),
  svelte({ include: 'src/**/*.svelte' }),
  //terser({format: {comments: false}})
]
const output = {
  dir: "bin",
  format: "iife",
  name: "MarkdownInput",
  globals: {},
  manualChunks: () => 'true'
}

export default [
  {
    input: "src/ts/field_input.ts",
    plugins: plugins,
    output: output
  },
  {
    input: "src/ts/window_input.ts",
    plugins: plugins,
    output: output
  },
  {
    input: "src/ts/field_input_2.1.55.ts",
    plugins: plugins,
    output: output
  }
]
