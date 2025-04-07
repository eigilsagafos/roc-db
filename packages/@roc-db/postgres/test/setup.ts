import { beforeAll, afterAll } from "bun:test"
import "@roc-db/test-utils/setup"
import postgres from "postgres"

beforeAll(async () => {
    if (!globalThis.rootSql) {
        await runSetup().catch(err => {
            console.error("Test setup failed", err)
            process.exit(1)
        })
    }
})

const runSetup = async () => {
    const rootSql = await postgres(
        "postgres://postgres:password@localhost:5432",
    )
    globalThis.rootSql = rootSql
}

afterAll(async () => {
    await rootSql.end()
})
