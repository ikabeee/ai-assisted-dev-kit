import { describe, it } from 'node:test';

import { RuleTester } from 'oxlint/plugins-dev';

import { stepdownOrderRule } from './stepdown-order.ts';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } });

const message = (callee: string, caller: string) => ({
  messageId: 'calleeAboveCaller',
  data: { callee, caller },
});

ruleTester.run('stepdown-order', stepdownOrderRule, {
  valid: [
    {
      name: 'caller above callee',
      code: `function main() { helper(); }\nfunction helper() {}`,
    },
    {
      name: 'const arrow caller above callee',
      code: `const main = () => helper();\nconst helper = () => 1;`,
    },
    {
      name: 'self recursion',
      code: `function fact(n: number): number { return n <= 1 ? 1 : n * fact(n - 1); }`,
    },
    {
      name: 'type-only reference in a type annotation',
      code: `function helper() {}\nfunction main(): typeof helper { return null as never; }`,
    },
    {
      name: 'reference in module-init code',
      code: `function build() { return 1; }\nconst config = build();`,
    },
    {
      name: 'mutual recursion',
      code: `function isEven(n: number): boolean { return n === 0 || isOdd(n - 1); }\nfunction isOdd(n: number): boolean { return n !== 0 && isEven(n - 1); }`,
    },
    {
      name: 'longer cycle',
      code: `function a() { b(); }\nfunction b() { c(); }\nfunction c() { a(); }`,
    },
    {
      name: 'local variable shadows the unit name',
      code: `function helper() {}\nfunction main() { const helper = 1; return helper; }`,
    },
    {
      name: 'parameter shadows the unit name',
      code: `function helper() {}\nfunction main(helper: () => void) { helper(); }`,
    },
  ],
  invalid: [
    {
      name: 'callee above caller, reported on the callee name',
      code: `function helper() {}\nfunction main() { helper(); }`,
      errors: [{ ...message('helper', 'main'), line: 1, column: 9, endColumn: 15 }],
    },
    {
      name: 'exported declarations',
      code: `export function helper() {}\nexport default function main() { helper(); }`,
      errors: [{ ...message('helper', 'main'), line: 1 }],
    },
    {
      name: 'const arrow units',
      code: `const helper = () => 1;\nconst main = () => helper();`,
      errors: [{ ...message('helper', 'main'), line: 1, column: 6 }],
    },
    {
      name: 'function expression units',
      code: `const helper = function () {};\nconst main = function () { helper(); };`,
      errors: [{ ...message('helper', 'main'), line: 1 }],
    },
    {
      name: 'first caller wins among several',
      code: `function helper() {}\nfunction second() { helper(); }\nfunction first() { helper(); }`,
      errors: [{ ...message('helper', 'second'), line: 1 }],
    },
    {
      name: 'first caller is the lowest statement index, not the first one visited',
      code: `function late() { helper(); }\nfunction helper() {}\nfunction early() { helper(); }\nfunction other() { late(); }`,
      errors: [{ ...message('late', 'other'), line: 1 }],
    },
    {
      name: 'reference inside a nested callback',
      code: `function helper() {}\nfunction main(items: number[]) { return items.map(() => helper()); }`,
      errors: [{ ...message('helper', 'main'), line: 1 }],
    },
    {
      name: 'caller reports once even when it calls the callee twice',
      code: `function helper() {}\nfunction main() { helper(); helper(); }`,
      errors: [{ ...message('helper', 'main'), line: 1 }],
    },
    {
      name: 'a shadowing function does not hide a real caller',
      code: `function helper() {}\nfunction shadow() { const helper = 1; return helper; }\nfunction main() { helper(); }`,
      errors: [{ ...message('helper', 'main'), line: 1 }],
    },
  ],
});
