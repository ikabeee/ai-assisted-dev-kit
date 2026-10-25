// Oxlint JS plugin with the rules that keep code readable like a book.
// eslintCompatPlugin also makes it loadable from ESLint:
// https://oxc.rs/docs/guide/usage/linter/writing-js-plugins.html
import { eslintCompatPlugin } from '@oxlint/plugins';
import { noTestRunnerBranchingRule } from './rules/no-test-runner-branching.ts';

export default eslintCompatPlugin({
  meta: { name: 'readable-code' },
  rules: {
    'no-test-runner-branching': noTestRunnerBranchingRule,
  },
});
