import { describe, expect, test } from "bun:test"
import {
    entities,
    operations,
    testAdapterImplementation,
} from "@roc-db/test-utils"
import { Snowflake } from "roc-db"
import { createIndexedDBAdapter } from "./createIndexedDBAdapter"
import type { IndexedDBEngine } from "./types/IndexedDBEngine"

describe("createIndexedDBAdapter", () => {
    testAdapterImplementation<IndexedDBEngine>(createIndexedDBAdapter, () => ({
        dbName: crypto.randomUUID().slice(0, 8),
    }))
})

// White-box regression test that can't be expressed through the shared
// black-box conformance suite: it seeds a corrupt store state directly.
describe("findDebounceMutation with multiple matches", () => {
    // Open the same named database the adapter uses and commit rows straight
    // into the "mutations" store, bypassing the adapter's write path.
    const seedMutations = (dbName: string, rows: any[]) =>
        new Promise<void>((resolve, reject) => {
            const openReq = indexedDB.open(dbName)
            openReq.onsuccess = () => {
                const db = openReq.result
                const txn = db.transaction(["mutations"], "readwrite")
                const store = txn.objectStore("mutations")
                rows.forEach(row => store.put(row))
                txn.oncomplete = () => {
                    db.close()
                    resolve()
                }
                txn.onerror = () => reject(txn.error)
            }
            openReq.onerror = () => reject(openReq.error)
        })

    const withTimeout = <T>(promise: Promise<T>, ms: number, label: string) =>
        Promise.race([
            promise,
            new Promise<never>((_, reject) =>
                setTimeout(
                    () => reject(new Error(`Timed out waiting for ${label}`)),
                    ms,
                ),
            ),
        ])

    test("rejects instead of hanging when two debounced mutations collide", async () => {
        const dbName = crypto.randomUUID().slice(0, 8)
        const adapter = createIndexedDBAdapter({
            operations,
            entities,
            session: { identityRef: "User/42" },
            snowflake: new Snowflake(10, 10),
            dbName,
        })

        const [post] = await adapter.createPost({ title: "Title 1" })

        // Two mutations that both satisfy the debounce match criteria for an
        // updatePostTitle on this post from this identity, inside the debounce
        // window. This is a state the write path should never produce, but the
        // guard for it must surface as a rejection rather than an unsettled
        // promise (a thrown error inside an IDBRequest.onsuccess handler does
        // not reject the surrounding Promise).
        const now = new Date().toISOString()
        const baseMutation = {
            timestamp: now,
            operation: { name: "updatePostTitle", version: 1 },
            payload: { ref: post.ref, title: "Collide" },
            log: [],
            changeSetRef: null,
            debounceCount: 0,
            sessionRef: null,
            identityRef: "User/42",
            persistedAt: now,
        }
        await seedMutations(dbName, [
            { ...baseMutation, ref: "Mutation/collision-1" },
            { ...baseMutation, ref: "Mutation/collision-2" },
        ])

        await expect(
            withTimeout(
                adapter.updatePostTitle({ ref: post.ref, title: "New title" }),
                1000,
                "updatePostTitle",
            ),
        ).rejects.toThrow("Unhandled multiple debounced mutations")
    })
})
