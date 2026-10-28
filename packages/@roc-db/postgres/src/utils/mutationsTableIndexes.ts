// Indexes for the lookups the adapter runs on every write: a changeSet's
// mutations (changeSet init, debounce) and an identity's recent mutations
// (debounce). Run with CONCURRENTLY outside a transaction on a live table.
export const mutationsTableIndexes = (tableName: string) => [
    `CREATE INDEX IF NOT EXISTS ${tableName}_change_set_id_idx ON ${tableName} (change_set_id)`,
    `CREATE INDEX IF NOT EXISTS ${tableName}_identity_ref_timestamp_idx ON ${tableName} (identity_ref, timestamp)`,
]
