export const postgresRowToMutation = (row: DBRow) => {
    if (!row) throw new Error("Row is undefined")
    const {
        id,
        timestamp,
        operation_name,
        payload,
        log,
        change_set_id,
        change_set_kind,
        debounce_count,
    } = row
    let changeSetRef
    if (change_set_id) {
        changeSetRef = `${change_set_kind}/${change_set_id}`
    }
    return {
        ref: `Mutation/${id}`,
        timestamp: timestamp.toISOString(),
        name: operation_name,
        payload,
        log,
        changeSetRef: changeSetRef || null,
        debounceCount: debounce_count,
    }
}
