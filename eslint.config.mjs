import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["**/dist/", "**/node_modules/", "**/coverage/"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
  },
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  // Config/tooling files run in Node (CommonJS), so expose Node globals there.
  {
    files: ["**/*.{js,cjs}"],
    languageOptions: { globals: globals.node },
  },
];