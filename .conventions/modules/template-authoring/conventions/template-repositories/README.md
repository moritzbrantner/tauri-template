# Template repository conventions

## TEMPLATE-001 — Template repositories are executable golden paths

- Ship an intentional, working starting architecture and workflow rather than an empty scaffold.
- Encode endorsed defaults in working configuration, scripts, structure, dependencies, tests, and examples rather than prose alone.

## TEMPLATE-002 — Templates must dogfood the conventions they prescribe

- Maintain templates using the same conventions, commands, tests, and agent workflow they require downstream.

## TEMPLATE-003 — Fresh instantiation is the acceptance test

- Validate a fresh instance, not only the template repository.
- A fresh instance must be able to install, start, test, and build without undeclared local state.

## TEMPLATE-004 — A template should have one canonical path to green

- Provide one repository-owned path from declared prerequisites to a known-green state.
- Make development, focused validation, broader validation, and build commands mechanically discoverable without duplicating their implementation in wrappers.

## TEMPLATE-005 — Only propagate intentional decisions

- Everything included in a template is an endorsed downstream default.
- Do not preinstall speculative dependencies, abstractions, services, or architecture merely because some future consumer might need them.

## TEMPLATE-006 — Prove the stack with a thin vertical slice

- Prefer the smallest coherent end-to-end example over disconnected demos or placeholders.
- The slice should demonstrate the intended architecture rather than bypassing it for sample convenience.

## TEMPLATE-007 — Downstream friction feeds back into the template

- Promote repeated downstream fixes and workarounds into the template when they reveal a baseline gap.

## TEMPLATE-008 — Templates declare their applicable convention stack

- Reference applicable convention IDs and technology scopes from machine-readable local configuration or profiles.
