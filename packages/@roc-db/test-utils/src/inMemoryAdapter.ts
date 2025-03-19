import { createInMemoryAdapter } from "@roc-db/in-memory"
import { operations } from "./operations"
import { entities } from "./schemas"

export const inMemoryAdapter = createInMemoryAdapter({
    operations: operations,
    entities: entities,
    session: {
        identityRef: "User/42",
    },
})
