import type { Ref } from "roc-db"
import type { ScopedStore, Store } from "valdres"

// roc-db-owned state that lives for as long as a changeSet scope does.
//
// This used to be stashed on valdres' per-scope `data` object, which stopped
// being public in valdres 1.0.0-beta.17. Both fields are roc-db concepts that
// valdres has no reason to know about, so they live in an adapter-owned
// registry keyed by the two identities valdres does expose: the store and the
// changeSet ref that names the scope.
export type ScopeState = {
    // The transaction cache shared by every request made against this scope
    // (roc-db's `changeSet` cacheMap). Created lazily by beginRequest.
    txnCache?: any
    // The version ref whose base snapshot has been seeded into this scope, so
    // onChangeSetInit loads the base exactly once per scope.
    versionRefLoaded?: Ref
    // Cancels this entry's disposal hook, so dropping the entry early (on
    // apply) leaves no registration behind on a scope that is still alive.
    release?: () => void
}

// Weak on the store so a discarded store takes its scope state with it.
const registry = new WeakMap<Store, Map<Ref, ScopeState>>()

// State for `changeSetRef`'s scope, created on first use.
//
// The entry describes one particular incarnation of the scope. valdres
// destroys a scope once its last lease detaches, and a later `store.scope(id)`
// builds a fresh, empty one under the same id — a stale `versionRefLoaded`
// would then suppress the base seed the new scope needs, and a stale
// `txnCache` would convince roc-db the changeSet is already initialized.
// Living on the scope's own `data` object used to tie the two lifetimes
// together; `onDispose` does that job now. It fires on scope death rather than
// lease detach, and a re-created scope reusing the id does not inherit the
// registration, so a new incarnation always starts from a clean entry.
export const getScopeState = (
    store: Store,
    changeSetRef: Ref,
    scopedStore: ScopedStore,
): ScopeState => {
    let scopes = registry.get(store)
    if (!scopes) {
        scopes = new Map()
        registry.set(store, scopes)
    }
    let state = scopes.get(changeSetRef)
    if (!state) {
        state = {}
        scopes.set(changeSetRef, state)
        state.release = scopedStore.onDispose(() =>
            deleteScopeState(store, changeSetRef),
        )
    }
    return state
}

// Read without creating, so a caller can tell "no state for this scope" apart
// from "empty state". Only the lifecycle tests need this.
export const peekScopeState = (
    store: Store,
    changeSetRef: Ref,
): ScopeState | undefined => registry.get(store)?.get(changeSetRef)

export const deleteScopeState = (store: Store, changeSetRef: Ref) => {
    const scopes = registry.get(store)
    if (!scopes) return
    // Safe to call from inside the hook itself — cancelling a registration that
    // is currently firing, or has already fired, is a no-op.
    scopes.get(changeSetRef)?.release?.()
    scopes.delete(changeSetRef)
    if (scopes.size === 0) registry.delete(store)
}
