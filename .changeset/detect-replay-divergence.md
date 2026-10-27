---
"roc-db": minor
"@roc-db/in-memory": patch
"@roc-db/indexed-db": patch
---

Detect replay divergence when re-executing persisted mutations on load. `loadMutations`/`persistOptimisticMutations` reconstruct client state by re-running each operation's callback rather than applying the stored effect, which silently corrupts state when an operation isn't perfectly deterministic on re-execution (e.g. a graph-restructuring op sensitive to transient state or replay order).

After a replayed mutation's log is finalized, roc-db now compares the recomputed effect against the stored `mutation.log` — the set and order of entries, the structural fields each update changed, and the captured document for deletes — ignoring metadata that legitimately differs on replay (`created`/`updated`, mutation identity) and normalizing `null`/absent/`undefined`. Debounce continuations (`debounceCount > 0`) and the fresh-write path are left untouched.

Divergence is surfaced via a configurable per-adapter policy (`replayDivergence`): `strict` throws a new `ReplayDivergenceError` naming the mutation, operation, and first diverging entity+field; `warn` (default) logs and continues; `off` disables the check. An `onDivergence` telemetry hook is exposed for both. The in-memory and IndexedDB adapters accept and forward the `replayDivergence` option.
