export const postgresRowToEntity = (row: DBRow) => {
    if (!row) throw new Error("Row is undefined")
    const {
        id,
        kind,
        created_at,
        updated_at,
        children,
        ancestors,
        parents,
        indexed_data,
        data,
        created_mutation_id,
        updated_mutation_id,
    } = row
    return {
        ref: `${kind}/${id}`,
        entity: kind,
        created: {
            timestamp: created_at.toISOString(),
            mutationRef: `Mutation/${created_mutation_id}`,
        },
        updated: {
            timestamp: updated_at.toISOString(),
            mutationRef: `Mutation/${updated_mutation_id}`,
        },
        children,
        parents,
        ancestors,
        data: { ...indexed_data, ...data },
    }
}
