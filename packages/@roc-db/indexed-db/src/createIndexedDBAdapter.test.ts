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
// black-box conformance suite: it seeds store state directly.
describe("debounce with multiple matching rows", () => {
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

    test("merges into the latest matching row", async () => {
        const dbName = crypto.randomUUID().slice(0, 8)
        const adapter = createIndexedDBAdapter({
            operations,
            entities,
            session: { identityRef: "User/42" },
            snowflake: new Snowflake(10, 10),
            dbName,
        })

        const [post] = await adapter.createPost({ title: "Title 1" })

        // Two mutations that both match an updatePostTitle on this post from
        // this identity, inside the debounce window. Only the later one is
        // the latest mutation, so the write merges into it.
        const now = new Date().toISOString()
        const seededIds = new Snowflake(10, 11)
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
        const earlierRef = `Mutation/${seededIds.generate()}`
        const laterRef = `Mutation/${seededIds.generate()}`
        await seedMutations(dbName, [
            { ...baseMutation, ref: earlierRef },
            { ...baseMutation, ref: laterRef },
        ])

        const [, mutation] = await withTimeout(
            adapter.updatePostTitle({ ref: post.ref, title: "New title" }),
            1000,
            "updatePostTitle",
        )
        expect(mutation.ref).toBe(laterRef)
        expect(mutation.debounceCount).toBe(1)
    })
})
