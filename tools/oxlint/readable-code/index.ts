// Oxlint JS plugin with the rules that keep code readable like a book.
// eslintCompatPlugin also makes it loadable from ESLint:
// https://oxc.rs/docs/guide/usage/linter/writing-js-plugins.html
import { eslintCompatPlugin } from '@oxlint/plugins';

export default eslintCompatPlugin({
  meta: { name: 'readable-code' },
  rules: {},
});
