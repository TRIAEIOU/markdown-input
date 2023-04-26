import svelte from "rollup-plugin-svelte"
import {nodeResolve} from "@rollup/plugin-node-resolve"
import typescript from "@rollup/plugin-typescript"
import commonjs from "@rollup/plugin-commonjs"
import terser from "@rollup/plugin-terser"

export default [
  {
    input: "src/ts/field_input.ts",
    plugins: [
      typescript(),
      commonjs(),
      nodeResolve({ preferBuiltins: false, browser: true }),
      svelte({ include: 'src/**/*.svelte' }),
      terser({format: {comments: false}})
    ],
    output: {
      dir: "bin",
      format: "iife",
      name: "MarkdownInput",
      globals: {}
    }
  },
  {
    input: "src/ts/window_input.ts",
    plugins: [
      typescript(),
      commonjs(),
      nodeResolve({ preferBuiltins: false, browser: true }),
      svelte({ include: 'src/**/*.svelte' }),
      terser({format: {comments: false}})
    ],
    output: {
      dir: "bin",
      format: "iife",
      name: "MarkdownInput",
      globals: {}
    }
  },
  {
    input: "src/ts/field_input_2.1.55.ts",
    plugins: [
      typescript(),
      commonjs(),
      nodeResolve({ preferBuiltins: false, browser: true }),
      svelte({ include: 'src/**/*.svelte' }),
      terser({format: {comments: false}})
    ],
    output: {
      dir: "bin",
      format: "iife",
      name: "MarkdownInput",
      globals: {}
    }
  }
]
