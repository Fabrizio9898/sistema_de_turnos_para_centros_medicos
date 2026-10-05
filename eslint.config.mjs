import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.ts'],
    plugins: { prettier: prettierPlugin },
    rules: { 'prettier/prettier': 'error' },
  },
);
