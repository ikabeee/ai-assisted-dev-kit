---
name: readable-code
description: "Trigger: writing, refactoring or reviewing code. Code that reads like a book: stepdown order, one level of abstraction per function, intention-revealing names, only the requested scope."
license: MIT
metadata:
  author: "ikabeee"
  version: "1.0"
---

## Activation Contract

Load before writing, refactoring or reviewing code, in any language and by any harness. The reader is a human engineer who must be able to read the file top to bottom once and then adjust it alone.

## The stepdown rule

Source: Robert C. Martin, *Clean Code* 2nd ed., Ch. 7 "Reading Code from Top to Bottom: The Stepdown Rule" ([Pearson](https://www.pearson.com/en-us/subject-catalog/p/clean-code-a-handbook-of-agile-software-craftsmanship-2nd-edition/P200000013239)).

- **Top-down narrative.** The entry point (exported function, public method, component) comes first. Each function it calls sits below it, in the order it is called. Reading down the file goes from intent to detail.
- **One level per function.** A function reads as a short paragraph of calls to named steps one level below it. Raw detail (parsing, index arithmetic, I/O calls, data reshaping) lives in the lowest functions.
- **Intention-revealing names.** The name and argument names tell the reader what the function does without opening it. Booleans read as questions: `isExpired`, `hasAccess`.
- **Small and flat.** A function fits on one screen, nests at most two levels, and handles guard cases with early returns.
- **JS/TS hoisting.** Declare module-level helpers with `function` declarations, so a callee below its caller is safe ([MDN: Hoisting](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting)).

## Simple by default

Based on Anthropic's overeagerness counter-prompt ([Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)).

- **Scope.** Deliver exactly the requested change. Ideas for extra features, tests, docs, files or refactors go at the end of the reply as suggestions.
- **One source of truth.** Before writing a helper, search for an existing one and reuse or extend it. Each meaning lives in one place.
- **Inline until reused.** A one-time operation stays inline. An abstraction earns its place with a second real caller, never a hypothetical future one.
- **Comments say why.** Write a comment only for a constraint, a gotcha or a decision the code cannot show. Comments on code you did not change stay as they are.
- **Validate at boundaries.** Check user input, external APIs, files and environment at the edge. Internal code trusts its callers and framework guarantees. Errors propagate to the layer that can handle them; fix the root cause, never suppress the error.
- **Honest types.** Model the real type. Guardrail: no `any`, chained `as`, non-null `!`, `@ts-ignore` or disabled lint rules to make code compile.
- **Real dependencies.** Add a package only after confirming it exists in the registry (`npm view <package>`, [npm docs](https://docs.npmjs.com/cli/commands/npm-view)) and that the project does not already cover the need.
- **Leave it clean.** Remove scratch files, debug output and placeholders before reporting done.

## Completion criterion

Before reporting done, read every changed file top to bottom and confirm each item. Fix any that fail; report the result.

1. Each callee appears below its first caller.
2. Each changed function reads at one level of abstraction.
3. Each name is understood without opening its body.
4. No meaning is duplicated across the change and the existing code (search for it).
5. The diff contains only the requested scope.
6. When the project has `.oxlintrc.json`, `node_modules/.bin/oxlint <changed files>` exits 0.
