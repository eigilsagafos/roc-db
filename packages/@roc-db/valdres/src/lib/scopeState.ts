import type { Ref } from "roc-db"
import { atom, type Atom, type State, type Store } from "valdres"

// roc-db-owned state for a changeSet scope. Entries live as long as the store;
// the heavy part, the transaction cache, is released when the changeSet is
// applied and rebuilt whenever it no longer matches the scope.
//
// These are roc-db concepts that valdres has no reason to know about, so they
// live in an adapter-owned registry keyed by the two identities valdres does
// expose: the store and the changeSet ref that names the scope. The registry is
// not rolled back with a valdres transaction, so each field is either checked
// against valdres state before use (txnCache) or safe to over-approximate
// (written).
export type ScopeState = {
    // The transaction cache shared by every request made against this scope
    // (roc-db's `changeSet` cacheMap). Created lazily by beginRequest, and only
    // trusted while `cacheToken` matches the scope's cacheTokenAtom.
    txnCache?: any
    cacheToken?: object
    // Every atom and row the adapter has written in this scope. valdres has no
    // "revert everything this scope owns" operation, so onChangeSetApplied
    // resets these one by one. A write that later rolled back may still be
    // listed; resetting a state the scope does not own is a no-op.
    written: Set<State<any>>
}

// Whether onChangeSetInit has built this scope from the changeSet's base and
// its full mutation history. A scope opened anywhere else (prepareChangeSets,
// application code, a re-creation after disposal) only holds what later
// requests wrote, so onChangeSetInit rebuilds it. Only ever set in a scope,
// never in the root. Being valdres state, it rolls back with the transaction
// that built the scope.
export const scopeBuiltAtom: Atom<boolean> = atom<boolean>(false)

// Proves a scope's txnCache describes its committed state. Every write request
// (and every request that rebuilt the cache) replaces the token in the scope and
// in the registry, in the request's transaction. If that transaction rolls
// back, the scope is disposed and re-created, or an applied changeSet resets
// the scope, the two no longer match and the cache is rebuilt.
export const cacheTokenAtom: Atom<object | null> = atom<object | null>(null)

// Weak on the store so a discarded store takes its scope state with it.
const registry = new WeakMap<Store, Map<Ref, ScopeState>>()
// The changeSet each scope opened by onChangeSetInit belongs to.
const scopeChangeSetRefs = new WeakMap<Store, Ref>()

export const registerScope = (scope: Store, changeSetRef: Ref) => {
    scopeChangeSetRefs.set(scope, changeSetRef)
}

export const scopeChangeSetRef = (scope: Store): Ref | undefined =>
    scopeChangeSetRefs.get(scope)

// State for `changeSetRef`'s scope, created on first use.
export const getScopeState = (store: Store, changeSetRef: Ref): ScopeState => {
    let scopes = registry.get(store)
    if (!scopes) {
        scopes = new Map()
        registry.set(store, scopes)
    }
    let state = scopes.get(changeSetRef)
    if (!state) {
        state = { written: new Set() }
        scopes.set(changeSetRef, state)
    }
    return state
}

// Read without creating, so a caller can tell "no state for this scope" apart
// from "empty state".
export const peekScopeState = (
    store: Store,
    changeSetRef: Ref,
): ScopeState | undefined => registry.get(store)?.get(changeSetRef)
