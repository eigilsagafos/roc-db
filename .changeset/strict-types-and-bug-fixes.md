---
"roc-db": patch
"@roc-db/valdres": patch
"@roc-db/postgres": patch
"@roc-db/in-memory": patch
"@roc-db/indexed-db": patch
"@roc-db/test-utils": patch
---

Type-check the whole monorepo and ship correct type declarations.

Every package now type-checks with zero errors and no longer builds its `.d.ts`
with `tsc --noCheck`, so the published declarations are actually verified. CI
gains a repo-wide `typecheck` gate.

Consumer-facing type fixes in `@roc-db/valdres`'s `createValdresAdapter`: the
`AtomFamily` params had swapped `<Value, Args>` generics and non-tuple `Args`
(which silently degraded to `any`); `entityAtom`/`mutationAtom`/`entityUniqueAtom`/
`entityIndexAtom` now have correct value-first/args-second generics matching
runtime. `roc-db` also exports the document type as `EntityDocument`, tightens
`Mutation` (`identityRef`/`sessionRef`/`persistedAt`/`appliedAt`), and makes
`readOperation` accept an `outputSchema` setting (symmetric with `writeOperation`).

Runtime bug fixes surfaced by the type-checking:

- `WriteTransaction.redo` was never wired as an instance method (unlike `undo`),
  so the `redo` operation threw at runtime — now wired.
- `patchEntity` removed **all** refs from an index array on update (a
  `ref !== ref` self-comparison) instead of just the patched entity's ref.
