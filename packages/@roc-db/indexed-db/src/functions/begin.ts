export const begin = async (engineOpts, callback) => {
    return new Promise((resolve, reject) => {
        let db
        const idbRequest = indexedDB.open(engineOpts.dbName, 1)
        idbRequest.onupgradeneeded = event => {
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

        idbRequest.onsuccess = event => {
            db = idbRequest.result

            resolve(
                callback({
                    ...engineOpts,
                    db,
                    txn: db.transaction(
                        ["entities", "mutations"],
                        "readwrite",
                        // request.type === "write" ? "readwrite" : "readonly",
                    ),
                }),
            )
        }
    })
}
