import svelte from "rollup-plugin-svelte";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";

function bundle (input_file, output_file, output_name) {
  return {
    input: input_file,
    output: {
        file: output_file,
        format: "iife",
        name: output_name,
        globals: {}
    },
    external: [],
    plugins: [
      typescript(),
      commonjs(),
      nodeResolve({preferBuiltins: false, browser: true}),
      svelte({include: 'src/**/*.svelte'}),
      terser()
    ],
    onwarn: (warning, warn) => { // Supress "errounous warnings"
      if ((warning.pluginCode === undefined
            && warning.message.startsWith(String`Circular dependency:`))
      )
        return;
      warn(warning);
//      console.log(JSON.stringify(warning, null, 1))
    },
  };
}

export default [
    bundle("./src/ts/field_input.ts", "./src/field_input.js", "MarkdownInput"),
    bundle("./src/ts/dialog_input.ts", "./src/dialog_input.js", "MarkdownInput"),
    bundle("./src/ts/dialog_input_helpers.ts", "./src/dialog_input_helpers.js", "MarkdownInputHelpers")
]