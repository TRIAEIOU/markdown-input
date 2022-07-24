import {nodeResolve} from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";

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
    ],
    onwarn: (warning, warn) => { // Supress "errounous warnings"
      if ((warning.pluginCode === 'TS2614'
            && warning.message.startsWith(String.raw`@rollup/plugin-typescript TS2614: Module '"*.svelte"' has no exported member`))
        || (warning.pluginCode === undefined
            && warning.message.startsWith(String`Circular dependency:`))
      )
        return;
      warn(warning);
    },
  };
}

export default [
    bundle("./field_input.ts", "./../field_input.js", "MarkdownInput"),
    bundle("./dialog_input.ts", "./../dialog_input.js", "MarkdownInput"),
    bundle("./dialog_input_helpers.ts", "./../dialog_input_helpers.js", "MarkdownInputHelpers")
]