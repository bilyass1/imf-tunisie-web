import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const compat=new FlatCompat({baseDirectory:path.dirname(fileURLToPath(import.meta.url))});
export default [
  {ignores:['.next*/**','node_modules/**','public/**','qa/**']},
  ...compat.extends('next/core-web-vitals','next/typescript'),
  {files:['**/*.cjs'],rules:{'@typescript-eslint/no-require-imports':'off','@next/next/no-assign-module-variable':'off'}},
  {rules:{'@typescript-eslint/no-unused-vars':['warn',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}],'@typescript-eslint/no-explicit-any':'warn','react/no-unescaped-entities':'warn','@next/next/no-img-element':'warn'}},
];
