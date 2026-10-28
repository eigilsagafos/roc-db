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
