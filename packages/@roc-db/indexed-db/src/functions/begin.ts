import { entities } from "@roc-db/test-utils"

export const begin = async (request, engineOpts, callback) => {
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
                        request.type === "write" ? "readwrite" : "readonly",
                    ),
                    changeSet: request.changeSetRef
                        ? {
                              entities: new Map([]),
                              mutations: new Map([]),
                          }
                        : null,
                }),
            )
        }
    })
}
