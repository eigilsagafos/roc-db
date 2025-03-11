import { describe } from "bun:test"
import { testAdapterImplementation } from "@roc-db/test-utils"
import { createPostgresAdapter } from "./createPostgresAdapter"
import type { PostgresEngineOpts } from "./types/PostgresEngineOpts"

describe(
    "createPostgresAdapter",
    testAdapterImplementation<PostgresEngineOpts>(
        createPostgresAdapter,
        {
            getClient: () => sql1,
            mutationsTableName: "mutations",
            entitiesTableName: "entities",
        },
        {
            getClient: () => sql2,
            mutationsTableName: "mutations",
            entitiesTableName: "entities",
        },
    ),
)
