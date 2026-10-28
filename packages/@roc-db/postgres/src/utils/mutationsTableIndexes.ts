// PostgreSQL truncates longer identifiers, which can make two index names equal.
const MAX_IDENTIFIER_BYTES = 63

const byteLength = (value: string) => new TextEncoder().encode(value).length

const quoteIdentifier = (identifier: string) =>
    `"${identifier.replaceAll('"', '""')}"`

// FNV-1a, so a shortened name stays distinct per table.
const shortHash = (value: string) => {
    let hash = 0x811c9dc5
    for (const byte of new TextEncoder().encode(value)) {
        hash = Math.imul(hash ^ byte, 0x01000193) >>> 0
    }
    return hash.toString(16).padStart(8, "0")
}

const indexName = (table: string, suffix: string) => {
    const name = `${table}_${suffix}`
    if (byteLength(name) <= MAX_IDENTIFIER_BYTES) return name
    const tail = `_${shortHash(table)}_${suffix}`
    const prefix = Array.from(table)
    while (byteLength(prefix.join("") + tail) > MAX_IDENTIFIER_BYTES) {
        prefix.pop()
    }
    return prefix.join("") + tail
}

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
        quoteIdentifier(indexName(parts[parts.length - 1], suffix))
    return [
        `CREATE INDEX IF NOT EXISTS ${index("change_set_id_idx")} ON ${table} (change_set_id)`,
        `CREATE INDEX IF NOT EXISTS ${index("root_timestamp_idx")} ON ${table} (timestamp) WHERE change_set_id IS NULL`,
        `CREATE INDEX IF NOT EXISTS ${index("root_persisted_at_idx")} ON ${table} (persisted_at) WHERE change_set_id IS NULL`,
    ]
}
