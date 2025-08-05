import { describe } from "bun:test"
import { testAdapterImplementation } from "@roc-db/test-utils"
import { createIndexedDBAdapter } from "./createIndexedDBAdapter"
import type { IndexedDBEngine } from "./types/IndexedDBEngine"

describe("createIndexedDBAdapter", () => {
    // testAdapterImplementation<IndexedDBEngine>(createIndexedDBAdapter, () => ({
    //     dbName: crypto.randomUUID().slice(0, 8),
    // }))
})
