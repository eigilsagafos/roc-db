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
    {
        changeSetRef,
        identityRef,
        since,
        scopeMutations,
        identityMutations,
    }: RecentMutationsQuery,
) => {
    const objectStore = (engine as IndexedDBTxnEngine).txn.objectStore(
        "mutations",
    )
    const wantsScope = scopeMutations !== false
    const results = new Map<string, Mutation>()
    // A changeSet's mutations come from the changeSet index. Root mutations
    // are not in it (a null key is not indexed), so they come from the
    // timestamp and persistedAt indexes, which also serve the identity's.
    const wantsRoot = wantsScope && !changeSetRef
    const after = IDBKeyRange.lowerBound(since, true)
    await Promise.all([
        (identityMutations !== "none" || wantsRoot) &&
            collect(objectStore.index("timestamp").openCursor(after), results),
        (identityMutations === undefined || wantsRoot) &&
            collect(
                objectStore.index("persistedAt").openCursor(after),
                results,
            ),
        wantsScope &&
            changeSetRef &&
            collect(
                objectStore
                    .index("byChangeSetRef")
                    .openCursor(IDBKeyRange.only(changeSetRef)),
                results,
            ),
    ])
    const afterSince = (mutation: Mutation) =>
        mutation.timestamp > since ||
        (!!mutation.persistedAt && mutation.persistedAt > since)
    return [...results.values()].filter(mutation => {
        const scope = mutation.changeSetRef ?? null
        if (wantsScope && scope === changeSetRef && afterSince(mutation)) {
            return true
        }
        if (mutation.identityRef !== identityRef) return false
        if (identityMutations === undefined) return afterSince(mutation)
        if (identityMutations === "none") return false
        return mutation.timestamp > since
    })
}) as unknown as FindRecentMutationsFunction
