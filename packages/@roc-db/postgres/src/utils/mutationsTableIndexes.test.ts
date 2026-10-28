import { expect, test } from "bun:test"
import { mutationsTableIndexes } from "./mutationsTableIndexes"

test("quotes the table and index names", () => {
    expect(mutationsTableIndexes('My"Mutations')[0]).toBe(
        'CREATE INDEX IF NOT EXISTS "My""Mutations_change_set_id_idx" ON "My""Mutations" (change_set_id)',
    )
})

test("names indexes after the table in a schema-qualified name", () => {
    expect(mutationsTableIndexes("shiftx.mutations")[1]).toBe(
        'CREATE INDEX IF NOT EXISTS "mutations_root_timestamp_idx" ON "shiftx"."mutations" (timestamp) WHERE change_set_id IS NULL',
    )
})

test("index names stay distinct within PostgreSQL's 63-byte identifier limit", () => {
    const names = mutationsTableIndexes("t".repeat(59)).map(
        statement => statement.match(/INDEX IF NOT EXISTS "([^"]+)"/)![1],
    )
    expect(new Set(names).size).toBe(names.length)
    for (const name of names) {
        expect(new TextEncoder().encode(name).length).toBeLessThanOrEqual(63)
    }
})
