---
"@roc-db/in-memory": minor
"@roc-db/indexed-db": minor
"@roc-db/postgres": minor
"@roc-db/test-utils": minor
"@roc-db/valdres": minor
"roc-db": minor
---

Add first-class predicates, keyset paging and facets to the mutation log

`pageMutations` grew from "optional change-set equality plus a LIMIT" into a
real query, implemented identically in all four adapters:

- **`changeSet`** — an explicit tri-state, `Ref | "none" | "any"`, defaulting to
  `"any"`. `"none"` is `change_set_id IS NULL`: committed history rather than
  pending draft work. `null` is deliberately *not* a spelling of `"none"` —
  `changeSet: null` throws, so a caller threading a nullable ref can't silently
  narrow to a subset. The old `changeSetRef` still works and still treats
  `null`/`undefined` as "no filter"; passing both spellings is an error.
- **`operationName`** / **`identityRef`** — one value or several.
- **`logRefs`** — one ref or several, matched by containment (`log_refs @>
  ARRAY[...]` in postgres, GIN-indexable): "every mutation that touched this
  entity".
- **Keyset paging** — `before` (the previous page's last `timestamp`) plus an
  optional `beforeRef` tiebreak, in place of the `skip` argument that was
  destructured and never used. Results are ordered `timestamp DESC, id DESC`;
  the id tiebreak makes the order total, which millisecond-precision timestamps
  alone do not.
- **`size`** — `null` now means explicitly unbounded. The `pageMutations`
  operation defaults it to 30.
- **`mutationFacets`** — a new opt-in read operation returning distinct values
  and counts for `operationName` / `identityRef` under the same predicates, so
  a filter UI can populate itself without reading the whole log.

`pageMutations` is typed end to end (operation payload, `AdapterFunctions`,
`ReadTransaction`); `ReadTransaction.pageMutations` was `(args: any) => any`.

### Breaking

- **`AdapterFunctions` requires a new `mutationFacets` function.** All in-repo
  adapters implement it; a custom adapter must add one.
- **The `pageMutations` payload is now strict.** `skip` was accepted and
  silently ignored; it is now rejected, as is any other unknown key.
- **`pageMutations()` with no arguments now returns 30 rows, not the whole
  table.** Previously the payload schema was `.optional()`, so a no-argument
  call skipped every default and paged unbounded while `pageMutations({})`
  returned 30. Pass `size: null` to keep the unbounded read. Calls that already
  passed an argument object are unaffected.
- **Ordering is now `timestamp DESC` in every adapter.** The valdres, in-memory
  and indexed-db adapters previously returned insertion order; indexed-db also
  ignored `size` entirely. They now match postgres.
