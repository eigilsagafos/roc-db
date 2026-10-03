import type { BeginRequestFunction } from "roc-db"
import type { Store } from "valdres"
import type { ValdresEngine, ValdresTxnEngine } from "../types/ValdresEngine"
import { generateTransactionCache } from "roc-db"
import {
    cacheTokenAtom,
    getScopeState,
    scopeChangeSetRef,
} from "../lib/scopeState"
import { getScopeTransaction, recordScopeWrites } from "../lib/scopeTransaction"

export const beginRequest: BeginRequestFunction<ValdresEngine> = (
    request,
    engineOpts,
    callback,
) => {
    if (request.changeSetRef) {
        if (engineOpts.store) {
            const changeSetRef = request.changeSetRef
            const { rootTxn, scopedStore } = engineOpts as ValdresTxnEngine
            // A changeSet adapter writes to the scope it initialized, so once
            // that scope is disposed its requests throw StoreDisposedError
            // instead of landing in a new, unseeded scope under the same name.
            // Any other request addresses the scope by name and throws
            // ChangeSetScopeNotOpenError when it is not open (prepareChangeSets
            // opens the scopes a batch needs).
            const scopeState = getScopeState(
                engineOpts.store as Store,
                changeSetRef,
            )
            const scopedTxn = recordScopeWrites(
                scopedStore && scopeChangeSetRef(scopedStore) === changeSetRef
                    ? rootTxn.scope(scopedStore)
                    : getScopeTransaction(rootTxn, changeSetRef),
                scopeState.written,
            )
            if (scopedTxn.get(cacheTokenAtom) !== scopeState.cacheToken) {
                scopeState.txnCache = undefined
            }
            // Only a changeSet adapter (one onChangeSetInit attached a scope
            // to) shares its transaction cache across requests.
            const createsCache = !!scopedStore && !scopeState.txnCache
            if (createsCache)
                scopeState.txnCache = generateTransactionCache(false)
            // A write may change the cache, and a new cache is filled from this
            // transaction's view, so either one's token must only survive if
            // the transaction commits. Any other read leaves the cache
            // describing committed state.
            if (createsCache || request.type === "write") {
                const cacheToken = {}
                scopedTxn.set(cacheTokenAtom, cacheToken)
                scopeState.cacheToken = cacheToken
            }
            try {
                return callback(
                    {
                        ...engineOpts,
                        txn: scopedTxn,
                        rootTxn,
                    },
                    scopeState.txnCache,
                )
            } catch (error) {
                // The failed request may have changed the cache. If the
                // caller catches this inside its own transaction and commits,
                // the token would still match, so drop the cache here.
                scopeState.txnCache = undefined
                scopeState.cacheToken = undefined
                throw error
            }
        } else {
            // A store-less adapter runs on the caller's transaction, which is
            // the root. Address the changeSet's scope through it, so draft
            // writes cannot land in the root.
            const { rootTxn } = engineOpts as ValdresTxnEngine
            return callback({
                ...engineOpts,
                txn: getScopeTransaction(rootTxn, request.changeSetRef),
                rootTxn,
            })
        }
    } else {
        return callback(engineOpts)
    }
}
