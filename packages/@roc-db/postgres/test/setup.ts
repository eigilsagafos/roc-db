import { beforeAll, afterAll } from "bun:test"
import "@roc-db/test-utils/setup"
import postgres from "postgres"
import { POSTGRES_TEST_URL } from "./createTestDatabase"

beforeAll(async () => {
    if (!globalThis.rootSql) {
        await runSetup().catch(err => {
            console.error("Test setup failed", err)
            process.exit(1)
        })
    }
})

const runSetup = async () => {
    const rootSql = await postgres(POSTGRES_TEST_URL)
    globalThis.rootSql = rootSql
}

afterAll(async () => {
    await rootSql.end()
})
