import { describe } from "bun:test"
import { testAdapterImplementation } from "@roc-db/test-utils"
import { createIndexedDBAdapter } from "./createIndexedDBAdapter"
import type { IndexedDBEngine } from "./types/IndexedDBEngine"

describe(
    "createIndexedDBAdapter",
    testAdapterImplementation<IndexedDBEngine>(
        createIndexedDBAdapter,
        {
            dbName: "roc-db-1",
        },
        {
            dbName: "roc-db-2",
        },
    ),
)
