import type {
    FindRecentMutationsFunction,
    Mutation,
    RecentMutationsQuery,
} from "roc-db"
import type {
    IndexedDBEngine,
    IndexedDBTxnEngine,
} from "../types/IndexedDBEngine"

const collect = (
    idbRequest: IDBRequest<IDBCursorWithValue | null>,
    results: Map<string, Mutation>,
) =>
    new Promise<void>((resolve, reject) => {
        idbRequest.onsuccess = () => {
            const cursor = idbRequest.result
            if (cursor) {
                results.set(cursor.value.ref, cursor.value)
                cursor.continue()
            } else {
                resolve()
            }
        }
        idbRequest.onerror = () => reject(idbRequest.error)
    })

// Async adapter: the runtime returns a Promise, so the body cannot satisfy the
// synchronous `Mutation[]` alias return directly. Params are typed manually and
// the value is cast to the alias for the AdapterFunctions check.
export const findRecentMutations: FindRecentMutationsFunction = (async (
    engine: IndexedDBEngine,
    { changeSetRef, identityRef, since }: RecentMutationsQuery,
) => {
    const objectStore = (engine as IndexedDBTxnEngine).txn.objectStore(
        "mutations",
    )
    const results = new Map<string, Mutation>()
    // There is no persistedAt index, so a changeSet's mutations persisted
    // recently but written earlier come from the changeSet index. Root
    // mutations are not in that index (a null key is not indexed).
    await Promise.all([
        collect(
            objectStore
                .index("timestamp")
                .openCursor(IDBKeyRange.lowerBound(since, true)),
            results,
        ),
        changeSetRef &&
            collect(
                objectStore
                    .index("byChangeSetRef")
                    .openCursor(IDBKeyRange.only(changeSetRef)),
                results,
            ),
    ])
    return [...results.values()].filter(
        mutation =>
            (mutation.timestamp > since ||
                (!!mutation.persistedAt && mutation.persistedAt > since)) &&
            ((mutation.changeSetRef ?? null) === changeSetRef ||
                mutation.identityRef === identityRef),
    )
}) as unknown as FindRecentMutationsFunction
