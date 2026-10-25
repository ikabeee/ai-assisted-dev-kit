import { describe, it } from "node:test";

import { RuleTester } from "oxlint/plugins-dev";

import { noTestRunnerBranchingRule } from "./no-test-runner-branching.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

const testRunnerEnvCases = [
  { code: "const id = process.env.JEST_WORKER_ID;", name: "process.env.JEST_WORKER_ID" },
  { code: "const id = process.env.VITEST;", name: "process.env.VITEST" },
  { code: "const id = process.env.VITEST_WORKER_ID;", name: "process.env.VITEST_WORKER_ID" },
  { code: 'const id = process.env["VITEST"];', name: "process.env.VITEST" },
  { code: "if (process.env.VITEST) run();", name: "process.env.VITEST" },
];

const equalityOperators = ["===", "==", "!==", "!="];

const nodeEnvTestCases = equalityOperators.flatMap((operator) => [
  `const isTest = process.env.NODE_ENV ${operator} "test";`,
  `const isTest = "test" ${operator} process.env.NODE_ENV;`,
  `const isTest = process.env["NODE_ENV"] ${operator} "test";`,
]);

const frameworkNames = ["jest", "vi"];

ruleTester.run("no-test-runner-branching", noTestRunnerBranchingRule, {
  valid: [
    'const isProduction = process.env.NODE_ENV === "production";',
    'const isTest = process.env.NODE_ENV === "testing";',
    "const mode = process.env.NODE_ENV;",
    'const isTest = process.env.OTHER === "test";',
    'const isTest = mode === "test";',
    "const id = process.env.JEST_OTHER;",
    "const id = env.VITEST;",
    "const id = process.VITEST;",
    "const name = typeof window;",
    "const name = typeof jestLike;",
    "const value = jest;",
  ],
  invalid: [
    ...testRunnerEnvCases.map(({ code, name }) => ({
      code,
      errors: [{ messageId: "testRunnerEnv", data: { name } }],
    })),
    ...nodeEnvTestCases.map((code) => ({
      code,
      errors: [{ messageId: "nodeEnvTest" }],
    })),
    ...frameworkNames.map((name) => ({
      code: `const detected = typeof ${name} !== "undefined";`,
      errors: [{ messageId: "testFrameworkTypeof", data: { name } }],
    })),
  ],
});
