type DBRow = Record<string, any>

export const postgresRowToMutation = (row: DBRow) => {
    if (!row) throw new Error("Row is undefined")
    const {
        id,
        timestamp,
        operation_name,
        operation_version,
        payload,
        log,
        change_set_id,
        change_set_kind,
        debounce_count,
        identity_ref,
        session_ref,
        persisted_at,
    } = row
    let changeSetRef
    if (change_set_id) {
        changeSetRef = `${change_set_kind}/${change_set_id}`
    }
    return {
        ref: `Mutation/${id}`,
        timestamp: timestamp.toISOString(),
        operation: {
            name: operation_name,
            // `operation_version` is a nullable column with no DB default; rows
            // written before it existed round-trip as NULL. Default to 1 (as the
            // write path and mutation schema do) so the returned Mutation matches
            // its `version: number` type and replay resolves version-1 history.
            version: operation_version ?? 1,
        },
        payload,
        log,
        changeSetRef: changeSetRef || null,
        persistedAt: persisted_at ? persisted_at.toISOString() : null,
        debounceCount: debounce_count,
        identityRef: identity_ref,
        sessionRef: session_ref ?? null,
    }
}
