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
            version: operation_version,
        },
        payload,
        log,
        changeSetRef: changeSetRef || null,
        persistedAt: persisted_at || null,
        debounceCount: debounce_count,
        identityRef: identity_ref,
        sessionRef: session_ref ?? undefined,
    }
}
