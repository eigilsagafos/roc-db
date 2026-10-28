const quoteIdentifier = (identifier: string) =>
    `"${identifier.replaceAll('"', '""')}"`

/**
 * Indexes for the lookups the adapter runs on every write: a changeSet's
 * mutations (changeSet init, debounce), and recent root mutations (debounce).
 * `tableName` may be schema-qualified (`schema.table`). On a live table, run
 * the statements with CONCURRENTLY outside a transaction.
 */
export const mutationsTableIndexes = (tableName: string) => {
    const parts = tableName.split(".")
    const table = parts.map(quoteIdentifier).join(".")
    const index = (suffix: string) =>
        quoteIdentifier(`${parts[parts.length - 1]}_${suffix}`)
    return [
        `CREATE INDEX IF NOT EXISTS ${index("change_set_id_idx")} ON ${table} (change_set_id)`,
        `CREATE INDEX IF NOT EXISTS ${index("root_timestamp_idx")} ON ${table} (timestamp) WHERE change_set_id IS NULL`,
        `CREATE INDEX IF NOT EXISTS ${index("root_persisted_at_idx")} ON ${table} (persisted_at) WHERE change_set_id IS NULL`,
    ]
}
