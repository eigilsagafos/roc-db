# @roc-db/indexed-db

## 0.2.0-pre.101

### Patch Changes

- [#34](https://github.com/eigilsagafos/roc-db/pull/34)
  [`ef7f916`](https://github.com/eigilsagafos/roc-db/commit/ef7f9166bbb53bb87a55ab1d7575152344c79cb2)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - Fix: a debounced
  write only merges into the latest mutation, so a row never holds versions
  written before and after other mutations.

    A mutation row has one position in replay order, but debounce merged any
    matching row in the window, including one that other mutations were written
    after. The intervening mutation then landed on the wrong side of one of the
    versions: the server rejected it live (`Entity not found`), changeSet init
    failed on replay (`Delete not allowed …`), or replay silently produced
    different content (a copy made between two versions lost the value it
    copied).

    Now a debounced write merges into a row only when it is consecutive: the row
    is the latest mutation in its changeSet (or root) from any identity, and the
    identity has written nothing after it anywhere. Otherwise the write gets a
    new row, which later consecutive writes merge into, so typing still
    collapses into one row.

    - **Adapter interface:** `findDebounceMutation` is replaced by
      `findRecentMutations(engineOpts, { changeSetRef, identityRef, since })`,
      which lists recent mutations; core picks the merge target. Several
      matching rows are no longer an error (postgres threw "TODO - handle more
      than one mutation", indexed-db rejected "Unhandled multiple debounced
      mutations"), and postgres no longer matches the payload ref through the
      first version's `log_refs`.
    - **Merged versions** get `persistedAt: null` on optimistic adapters (the
      version is not synced yet) and the current time on others. Server-side
      writes kept the first version's `persistedAt`, so replay ran the latest
      version before mutations it depended on.
    - **`persistOptimisticMutations`:** a client that merged into a row other
      mutations now follow (an older client, or one that had not seen another
      user's write) still has its version persisted, but as a fresh debounced
      write from its identity: merged into the row it would merge into today, or
      as a new row with a new ref. A resend of that version throws "Mutation
      already synced".

    Replay order and stored mutations are unchanged, so existing changeSets open
    as before.

## 0.2.0-pre.100

### Patch Changes

- [#14](https://github.com/eigilsagafos/roc-db/pull/14)
  [`50b2092`](https://github.com/eigilsagafos/roc-db/commit/50b2092eaa6bd1f26b0eec8d81131471dcb0e40b)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - Type-check the
  whole monorepo and ship correct type declarations.

    Every package now type-checks with zero errors and no longer builds its
    `.d.ts` with `tsc --noCheck`, so the published declarations are actually
    verified. CI gains a repo-wide `typecheck` gate.

    Consumer-facing type fixes in `@roc-db/valdres`'s `createValdresAdapter`:
    the `AtomFamily` params had swapped `<Value, Args>` generics and non-tuple
    `Args` (which silently degraded to `any`);
    `entityAtom`/`mutationAtom`/`entityUniqueAtom`/ `entityIndexAtom` now have
    correct value-first/args-second generics matching runtime. `roc-db` also
    exports the document type as `EntityDocument`, tightens `Mutation`
    (`identityRef`/`sessionRef`/`persistedAt`/`appliedAt`), and makes
    `readOperation` accept an `outputSchema` setting (symmetric with
    `writeOperation`).

    Runtime bug fixes surfaced by the type-checking:

    - `WriteTransaction.redo` was never wired as an instance method (unlike
      `undo`), so the `redo` operation threw at runtime — now wired.
    - `patchEntity` removed **all** refs from an index array on update (a
      `ref !== ref` self-comparison) instead of just the patched entity's ref.

## 0.2.0-pre.99

### Patch Changes

- [#12](https://github.com/eigilsagafos/roc-db/pull/12)
  [`f48c634`](https://github.com/eigilsagafos/roc-db/commit/f48c63478e017896c17fffdacb209e61a0fd1640)
  Thanks [@eigilsagafos](https://github.com/eigilsagafos)! - The IndexedDB
  adapter now passes the shared adapter conformance suite
  (`testAdapterImplementation`), matching `@roc-db/in-memory` and
  `@roc-db/postgres`. Fixes the `begin()` transaction lifecycle (resolve only
  after the transaction commits, reuse the connection), honours the injected
  `snowflake` instead of always creating a new one, scopes debounce lookups by
  `identityRef`, and surfaces unique-constraint violations as `ConflictError`.
