const DB_CACHE = new WeakMap()

const openDatabase = engineOpts => {
    let cached = DB_CACHE.get(engineOpts)
    if (cached) return cached
    const promise = new Promise((resolve, reject) => {
        const idbRequest = indexedDB.open(engineOpts.dbName, engineOpts.version)
        idbRequest.onupgradeneeded = () => {
            const entitiesObjectStore = idbRequest.result.createObjectStore(
                "entities",
                { keyPath: "ref" },
            )
            const mutationsObjectStore = idbRequest.result.createObjectStore(
                "mutations",
                { keyPath: "ref" },
            )

            entitiesObjectStore.createIndex(
                "unique_constraint_0",
                ["entity", "unique_constraint_0"],
                { unique: true },
            )
            entitiesObjectStore.createIndex(
                "unique_constraint_1",
                ["entity", "unique_constraint_1"],
                { unique: true },
            )
            entitiesObjectStore.createIndex("byIndexEntry", "index_entries", {
                multiEntry: true,
            })
            mutationsObjectStore.createIndex("timestamp", "timestamp", {
                unique: false,
            })
            mutationsObjectStore.createIndex("byChangeSetRef", "changeSetRef", {
                unique: false,
            })
        }

        idbRequest.onsuccess = () => {
            const db = idbRequest.result
            // The connection is cached and long-lived. If another connection
            // requests a version upgrade, close ours and drop it from the
            // cache so the upgrade isn't blocked and we don't reuse a stale
            // handle.
            db.onversionchange = () => {
                db.close()
                DB_CACHE.delete(engineOpts)
            }
            resolve(db)
        }
        idbRequest.onerror = () => {
            DB_CACHE.delete(engineOpts)
            reject(idbRequest.error)
        }
    })
    DB_CACHE.set(engineOpts, promise)
    return promise
}

export const begin = async (engineOpts, callback) => {
    const db = await openDatabase(engineOpts)
    return new Promise((resolve, reject) => {
        const txn = db.transaction(["entities", "mutations"], "readwrite")

        let callbackResult
        let callbackDone = false
        let txnComplete = false
        let settled = false

        const maybeResolve = () => {
            if (settled) return
            if (callbackDone && txnComplete) {
                settled = true
                resolve(callbackResult)
            }
        }

        txn.oncomplete = () => {
            txnComplete = true
            maybeResolve()
        }
        txn.onerror = event => {
            if (settled) return
            settled = true
            reject(txn.error ?? event.target?.error)
        }
        txn.onabort = () => {
            if (settled) return
            settled = true
            reject(txn.error ?? new Error("Transaction aborted"))
        }

        Promise.resolve(
            callback({
                ...engineOpts,
                db,
                txn,
            }),
        )
            .then(result => {
                callbackResult = result
                callbackDone = true
                maybeResolve()
            })
            .catch(error => {
                if (settled) return
                settled = true
                try {
                    txn.abort()
                } catch {}
                reject(error)
            })
    })
}
