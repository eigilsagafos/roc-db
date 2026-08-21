import { entities, operations } from "@roc-db/test-utils"
import { beforeAll, describe, expect, test } from "bun:test"
import { createTestDatabase } from "../../test/createTestDatabase"
import { createPostgresAdapter } from "../createPostgresAdapter"

// Snowflake ids are stored as decimal `text` and gain a digit as time passes
// (the current epoch crosses 21 -> 22 digits in 2026), so a real log contains
// both lengths. A text comparison would order "1000..." before "999...";
// `ORDER BY id::numeric` and the `id::numeric` keyset cast exist for exactly
// this. Seeded straight into the table because the adapter's own writer can
// only mint ids of whatever length today's clock produces.
describe("pageMutations id ordering across a snowflake digit boundary", () => {
    const SHORT = "999999999999999999999" // 21 digits
    const LONG = "1000000000000000000000" // 22 digits, numerically larger
    const TIED = new Date("2026-01-01T00:00:00.000Z")

    let adapter: any
    beforeAll(async () => {
        const client = await createTestDatabase(globalThis.rootSql)
        adapter = createPostgresAdapter({
            client,
            operations,
            entities,
            session: { identityRef: "User/42" },
        })
        for (const id of [SHORT, LONG]) {
            await client`
                INSERT INTO mutations
                    (id, timestamp, operation_name, operation_version, payload,
                     log, log_refs, change_set_id, change_set_kind,
                     debounce_count, identity_ref)
                VALUES
                    (${id}, ${TIED}, 'createPost', 1, ${{}}, ${[]}, ${[]},
                     null, null, 0, 'User/42');
            `
        }
    })

    test("tied timestamps order by numeric id, newest first", async () => {
        const res = await adapter.pageMutations({ size: null })
        expect(res.map((m: any) => m.ref)).toStrictEqual([
            `Mutation/${LONG}`,
            `Mutation/${SHORT}`,
        ])
    })

    test("the keyset cursor skips exactly the rows already seen", async () => {
        const [first] = await adapter.pageMutations({ size: 1 })
        expect(first.ref).toBe(`Mutation/${LONG}`)
        const second = await adapter.pageMutations({
            size: 1,
            before: first.timestamp,
            beforeRef: first.ref,
        })
        expect(second.map((m: any) => m.ref)).toStrictEqual([
            `Mutation/${SHORT}`,
        ])
    })
})
