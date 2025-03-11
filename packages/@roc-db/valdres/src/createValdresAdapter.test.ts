import { describe } from "bun:test"
import { testAdapterImplementation } from "@roc-db/test-utils"
import { createValdresAdapter } from "./createValdresAdapter"
import type { ValdresEngine } from "./types/ValdresEngine"
import { atomFamily, store } from "valdres"

describe(
    "createIndexedDBAdapter",
    testAdapterImplementation<ValdresEngine>(
        createValdresAdapter,
        {
            store: store(),
            entityAtom: atomFamily(null),
            mutationAtom: atomFamily(null),
        },
        {
            store: store(),
            entityAtom: atomFamily(null),
            mutationAtom: atomFamily(null),
        },
    ),
)
