import { testAdapterImplementation } from "@roc-db/test-utils"
import { describe } from "bun:test"
import { createInMemoryAdapter } from "./createInMemoryAdapter"
import type { InMemoryEngine } from "./types/InMemoryEngine"

describe(
    "createInMemorydapter",
    testAdapterImplementation<InMemoryEngine>(createInMemoryAdapter),
)
