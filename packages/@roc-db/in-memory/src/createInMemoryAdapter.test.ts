import { testAdapterImplementation } from "@roc-db/test-utils"
import { describe } from "bun:test"
import { createInMemoryAdapter } from "./createInMemoryAdapter"
import type { InMemoryEngine } from "./types/InMemoryEngine"

describe("createInMemorydapter", () => {
    testAdapterImplementation<InMemoryEngine>(createInMemoryAdapter, () => ({
        engine: {
            entities: new Map(),
            mutations: new Map(),
            entitiesUnique: new Map(),
            entitiesIndex: new Map(),
        },
    }))
})
