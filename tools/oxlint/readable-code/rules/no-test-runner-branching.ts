import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

const TEST_RUNNER_VARIABLES = new Set(["JEST_WORKER_ID", "VITEST", "VITEST_WORKER_ID"]);
const TEST_FRAMEWORK_GLOBALS = new Set(["jest", "vi"]);
const EQUALITY_OPERATORS = new Set(["===", "==", "!==", "!="]);

/** Ban production code that branches on the test runner; inject the dependency instead. */
export const noTestRunnerBranchingRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow source code that detects the test runner through environment variables or globals.",
    },
    messages: {
      testRunnerEnv:
        "Source code reads `{{name}}` to detect the test runner. Inject the dependency instead of branching on tests.",
      nodeEnvTest:
        'Source code special-cases `NODE_ENV === "test"`. Inject the dependency instead of branching on tests.',
      testFrameworkTypeof:
        "Source code detects the test framework with `typeof {{name}}`. Inject the dependency instead of branching on tests.",
    },
  },
  createOnce(context) {
    return {
      MemberExpression(node) {
        const variable = readEnvVariable(node);
        if (variable !== undefined && TEST_RUNNER_VARIABLES.has(variable)) {
          context.report({ node, messageId: "testRunnerEnv", data: { name: `process.env.${variable}` } });
        }
      },
      BinaryExpression(node) {
        if (EQUALITY_OPERATORS.has(node.operator) && isNodeEnvComparedToTest(node.left, node.right)) {
          context.report({ node, messageId: "nodeEnvTest" });
        }
      },
      UnaryExpression(node) {
        const { argument } = node;
        if (node.operator === "typeof" && argument.type === "Identifier" && TEST_FRAMEWORK_GLOBALS.has(argument.name)) {
          context.report({ node, messageId: "testFrameworkTypeof", data: { name: argument.name } });
        }
      },
    };
  },
});

function isNodeEnvComparedToTest(left: ESTree.Node, right: ESTree.Node): boolean {
  return (
    (readEnvVariable(left) === "NODE_ENV" && isTestLiteral(right)) ||
    (readEnvVariable(right) === "NODE_ENV" && isTestLiteral(left))
  );
}

function isTestLiteral(node: ESTree.Node): boolean {
  return node.type === "Literal" && node.value === "test";
}

/** Returns `X` for `process.env.X` or `process.env["X"]`, otherwise undefined. */
function readEnvVariable(node: ESTree.Node): string | undefined {
  if (node.type !== "MemberExpression" || !isProcessEnv(node.object)) return undefined;
  return readPropertyName(node);
}

function isProcessEnv(node: ESTree.Node): boolean {
  return (
    node.type === "MemberExpression" &&
    node.object.type === "Identifier" &&
    node.object.name === "process" &&
    readPropertyName(node) === "env"
  );
}

function readPropertyName(member: ESTree.MemberExpression): string | undefined {
  const { property } = member;
  if (member.computed) {
    return property.type === "Literal" && typeof property.value === "string" ? property.value : undefined;
  }
  return property.type === "Identifier" ? property.name : undefined;
}
