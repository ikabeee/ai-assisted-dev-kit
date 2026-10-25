# Objectives

## General objective

> Este es un proyecto que tiene mis configuraciones de claude code pero estoy notando que el codigo que esta generando mis agentes es muy redundante, no se puede leer como un libro (es mi filosofia), y no es sencillo por lo tanto quiero mejorar estas herramientas para que no haga slop en el codigo.

## Specific objectives

Order and titles are edited by hand. The status after each " — " is derived from the feature document's front-matter by `scripts/objectives-index.ts`.

1. [Readable-code skill: stepdown rule + anti-slop rules](tasks/readable-code.md) — done
2. Ambiguity gate: rewrite or guided interview for vague change requests — not started
3. Context guard mod: offer continue, compact or new session past a threshold (open: threshold) — not started
4. swarm-workflow fixes: read-only tests for coders, bounded FEEDBACK, scratch cleanup — not started
5. [Readable-code lint template: Oxlint rules, stepdown rule, lint-on-edit hook](tasks/readable-lint.md) — done
6. [Tests first, with tests locked during implementation](tasks/test-lock.md)
