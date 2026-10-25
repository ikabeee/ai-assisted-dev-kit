---
status: done
---

# readable-code

Objective: a skill that makes agents write code that reads like a book. Branch: `feat/readable-code`. Delivery: single commit. Test runner: none (passive documentation; structural readback).

## Specs

- S1. The skill is built on Uncle Bob's stepdown rule. User: "si, la stepdown rule de Uncle Bob". Problem it fixes: "el codigo que esta generando mis agentes es muy redundante, no se puede leer como un libro (es mi filosofia), y no es sencillo".
- S2. The skill carries the anti-slop rules agreed from `docs/research/ai-generated-code-slop.md`: scope, why-comments, validate only at boundaries, no single-use abstractions, no type escapes, verify packages exist. (Agreed plan from the 2026-10-24 session, not a verbatim user quote.)
- S3. `CLAUDE.md` replaces "Keep it as simple as possible: I must be able to read it easily and adjust it myself." with a pointer to the skill (research gap 11).
- S4. `README.md` lists the skill and its install step.

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S1, S2 | inline | done | — |
| T2 | S3, S4 | inline | done | — |

## Log

- L1 (2026-10-23, user): "Este es un proyecto que tiene mis configuraciones de claude code pero estoy notando que el codigo que esta generando mis agentes es muy redundante, no se puede leer como un libro (es mi filosofia), y no es sencillo por lo tanto quiero mejorar estas herramientas para que no haga slop en el codigo."
- L2 (2026-10-24, user): "Vamos a continuar con este proyecto estabamos haciendo el readable code"
- L3 (2026-10-24): Skill written positively (target behaviour first, guardrails only where no positive phrasing exists), per `writing-for-agents`. Test-gaming rules (research gap 1) stay out of this skill: they belong to objectives 4 and 5.
- L4 (2026-10-25, close): User approved ("Seems fine", "Go"). Outcome: skill, CLAUDE.md pointer and README shipped in one commit on `feat/readable-code`. Pending: copy the skill to `~/.claude/skills/` and update the global `~/.claude/CLAUDE.md`; commit `docs/research/`. Next objective: 2, ambiguity gate.
