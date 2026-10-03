import type { Ref } from "roc-db"
import { ScopeNotFoundError, type State, type Transaction } from "valdres"

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

// Wraps a scope's transaction so every atom and row written through it is
// recorded in `written` (see ScopeState.written).
export const recordScopeWrites = (
    txn: Transaction,
    written: Set<State<any>>,
): Transaction =>
    ({
        get: state => txn.get(state),
        set: (target: any, value: any) => {
            written.add(target)
            txn.set(target, value)
        },
        update: (target: any, update: any) => {
            written.add(target)
            txn.update(target, update)
        },
        reset: (target: any) => {
            written.add(target)
            txn.reset(target)
        },
        delete: target => {
            written.add(target)
            txn.delete(target)
        },
        scope: ((target: any, callback?: any) =>
            callback === undefined
                ? txn.scope(target)
                : txn.scope(target, callback)) as Transaction["scope"],
    }) as Transaction
