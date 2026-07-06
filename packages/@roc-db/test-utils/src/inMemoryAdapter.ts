import { createInMemoryAdapter } from "@roc-db/in-memory"
import type { Entity } from "roc-db"
import { operations } from "./operations"
import { entities } from "./entities"

export const inMemoryAdapter = createInMemoryAdapter({
    operations: operations,
    entities: entities as readonly Entity<any>[],
    session: {
        identityRef: "User/42",
    },
})
