import { testAdapterImplementation } from "@roc-db/test-utils"
import { describe } from "bun:test"
import { createTestDatabase } from "../test/createTestDatabase"
import { createPostgresAdapter } from "./createPostgresAdapter"
import type { PostgresEngineOpts } from "./types/PostgresEngineOpts"

describe("createPostgresAdapter", () => {
    testAdapterImplementation<PostgresEngineOpts>(
        createPostgresAdapter,
        async () => {
            const client = await createTestDatabase(globalThis.rootSql)
            return {
                client,
                mutationsTableName: "mutations",
                entitiesTableName: "entities",
            }
        },
    )
})
