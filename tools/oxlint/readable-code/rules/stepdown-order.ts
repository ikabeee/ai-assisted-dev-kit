import { defineRule } from '@oxlint/plugins';
import type { ESTree, SourceCode, Variable } from '@oxlint/plugins';

// A module-level function: a declaration, or a variable holding an arrow/function expression.
interface Unit {
  name: string;
  nameNode: ESTree.BindingIdentifier;
  variable: Variable;
  fn: ESTree.Node;
  index: number;
}

interface Edge {
  caller: Unit;
  callee: Unit;
}

type Candidate = ESTree.Function | ESTree.VariableDeclarator;

const TYPE_ONLY_PARENTS = new Set(['TSTypeReference', 'TSTypeQuery']);

export const stepdownOrderRule = defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require a module-level function to be declared below its first caller.',
    },
    messages: {
      calleeAboveCaller:
        '`{{callee}}` is declared above `{{caller}}`, which calls it. Move it below so the file reads top-down.',
    },
  },
  createOnce(context) {
    return {
      'Program:exit'(program) {
        const units = collectUnits(program, context.sourceCode);
        for (const { callee, caller } of findCalleesAboveFirstCaller(units)) {
          context.report({
            node: callee.nameNode,
            messageId: 'calleeAboveCaller',
            data: { callee: callee.name, caller: caller.name },
          });
        }
      },
    };
  },
});

function collectUnits(program: ESTree.Program, sourceCode: SourceCode): Unit[] {
  return program.body.flatMap((statement, index) =>
    unitCandidates(statement).flatMap((candidate) => toUnit(candidate, index, sourceCode)),
  );
}

function unitCandidates(statement: ESTree.Node): Candidate[] {
  const declaration = isExport(statement) ? statement.declaration : statement;
  if (declaration?.type === 'FunctionDeclaration') return [declaration];
  if (declaration?.type === 'VariableDeclaration') return declaration.declarations;
  return [];
}

function isExport(
  node: ESTree.Node,
): node is ESTree.ExportNamedDeclaration | ESTree.ExportDefaultDeclaration {
  return node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration';
}

function toUnit(candidate: Candidate, index: number, sourceCode: SourceCode): Unit[] {
  const fn = candidate.type === 'VariableDeclarator' ? candidate.init : candidate;
  const nameNode = candidate.id;
  if (nameNode?.type !== 'Identifier' || !isFunction(fn)) return [];
  const variable = sourceCode.getDeclaredVariables(candidate).find((v) => v.name === nameNode.name);
  return variable ? [{ name: nameNode.name, nameNode, variable, fn, index }] : [];
}

function isFunction(
  node: ESTree.Node | null | undefined,
): node is ESTree.Function | ESTree.ArrowFunctionExpression {
  return (
    node?.type === 'FunctionDeclaration' ||
    node?.type === 'FunctionExpression' ||
    node?.type === 'ArrowFunctionExpression'
  );
}

function findCalleesAboveFirstCaller(units: Unit[]): Edge[] {
  const edges = withoutCycles(findEdges(units));
  return units.flatMap((callee) => {
    const caller = firstCaller(callee, edges);
    return caller && callee.index < caller.index ? [{ caller, callee }] : [];
  });
}

function findEdges(units: Unit[]): Edge[] {
  return units.flatMap((callee) =>
    callee.variable.references
      .filter((reference) => !isTypeOnly(reference.identifier))
      .map((reference) => ({ caller: enclosingUnit(units, reference.identifier), callee }))
      .filter((edge): edge is Edge => edge.caller !== undefined && edge.caller !== callee),
  );
}

function isTypeOnly(identifier: ESTree.Node): boolean {
  return identifier.parent !== null && TYPE_ONLY_PARENTS.has(identifier.parent.type);
}

function enclosingUnit(units: Unit[], node: ESTree.Node): Unit | undefined {
  return units.find((unit) => unit.fn.start <= node.start && node.end <= unit.fn.end);
}

function withoutCycles(edges: Edge[]): Edge[] {
  return edges.filter((edge) => !canReach(edges, edge.callee, edge.caller));
}

function canReach(edges: Edge[], from: Unit, target: Unit): boolean {
  const visited = new Set<Unit>();
  const pending = [from];
  for (let unit = pending.pop(); unit; unit = pending.pop()) {
    if (unit === target) return true;
    if (visited.has(unit)) continue;
    visited.add(unit);
    pending.push(...calleesOf(edges, unit));
  }
  return false;
}

function calleesOf(edges: Edge[], caller: Unit): Unit[] {
  return edges.filter((edge) => edge.caller === caller).map((edge) => edge.callee);
}

function firstCaller(callee: Unit, edges: Edge[]): Unit | undefined {
  const callers = edges.filter((edge) => edge.callee === callee).map((edge) => edge.caller);
  return callers.toSorted((a, b) => a.index - b.index)[0];
}
