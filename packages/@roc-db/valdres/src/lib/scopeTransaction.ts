import type { Ref } from "roc-db"
import { ScopeNotFoundError, type Store, type Transaction } from "valdres"
import { isRebased, scopeBaseAtom } from "./scopeState"

// Thrown when a request targets a changeSet scope that has not been opened.
// valdres only creates named scopes through `store.scope()`, which is not
// allowed while a transaction is open: adapter.changeSet() and the
// prepareChangeSets hook open scopes before their transactions start.
export class ChangeSetScopeNotOpenError extends Error {
    constructor(readonly changeSetRef: Ref) {
        super(
            `The valdres scope for changeSet ${changeSetRef} is not open. Open it with adapter.changeSet() or store.scope() before starting the transaction.`,
        )
        this.name = "ChangeSetScopeNotOpenError"
    }
}

// Thrown when a request reaches a changeSet scope built from another version
// than the changeSet now names. Only adapter.changeSet() can rebuild the scope,
// so open the changeSet again, inside or outside a transaction.
export class ChangeSetRebasedError extends Error {
    constructor(readonly changeSetRef: Ref) {
        super(
            `The valdres scope for changeSet ${changeSetRef} was built from another version. Open it again with adapter.changeSet() to rebuild it.`,
        )
        this.name = "ChangeSetRebasedError"
    }
}

// The scope for `changeSetRef`, opened outside a transaction. A scope built
// from another version than `versionRef` is cleared in place, keeping its
// identity and subscriptions; onChangeSetInit then builds it from the new base.
export const openChangeSetScope = (
    store: Store,
    changeSetRef: Ref,
    versionRef: Ref | null | undefined,
): Store => {
    const scope = store.scope(changeSetRef)
    if (isRebased(scope.get(scopeBaseAtom), versionRef)) {
        store.txn(txn => txn.scope(scope).resetAll())
    }
    return scope
}

// The transaction cursor for `changeSetRef`'s scope, or undefined when the
// scope does not exist. Only the lookup is guarded, so a ScopeNotFoundError
// raised by later work is not mistaken for a missing scope.
export const findScopeTransaction = (
    txn: Transaction,
    changeSetRef: Ref,
): Transaction | undefined => {
    try {
        return txn.scope(changeSetRef)
    } catch (error) {
        if (error instanceof ScopeNotFoundError) return undefined
        throw error
    }
}

export const getScopeTransaction = (
    txn: Transaction,
    changeSetRef: Ref,
): Transaction => {
    const scopedTxn = findScopeTransaction(txn, changeSetRef)
    if (!scopedTxn) throw new ChangeSetScopeNotOpenError(changeSetRef)
    return scopedTxn
}
