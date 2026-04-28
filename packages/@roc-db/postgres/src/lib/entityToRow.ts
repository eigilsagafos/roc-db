import { entityFromRef, idFromRef } from "roc-db"

const stringifyIndexEntry = ([k, v]) => `${k}:${JSON.stringify(v)}`

const stringifyIndexEntries = arr => {
    return arr.map(stringifyIndexEntry)
}

export const entityToRow = entity => {
    const kind = entityFromRef(entity.ref)
    return {
        // Singleton entities have no id segment in their ref (just the kind).
        // We store them under the sentinel id `_<Kind>` so the global PRIMARY
        // KEY on `id` still enforces uniqueness across kinds. Snowflake ids
        // are numeric strings so they cannot collide with this sentinel.
        id: idFromRef(entity.ref) ?? `_${kind}`,
        kind,
        created_at: entity.created.timestamp,
        updated_at: entity.updated.timestamp,
        created_mutation_id: idFromRef(entity.created.mutationRef),
        updated_mutation_id: idFromRef(entity.updated.mutationRef),
        data: entity.data,
        children: entity.children,
        parents: entity.parents,
        ancestors: entity.ancestors,
        children_refs: entity.__.childRefs ?? [],
        parent_refs: entity.__.parentRefs ?? [],
        ancestor_refs: entity.__.ancestorRefs ?? [],
        index_entries: entity.__.index
            ? stringifyIndexEntries(entity.__.index)
            : [],
        unique_constraint_0: entity.__?.unique?.[0]
            ? stringifyIndexEntry(entity.__?.unique?.[0])
            : null,
        unique_constraint_1: entity.__?.unique?.[1]
            ? stringifyIndexEntry(entity.__?.unique?.[1])
            : null,
    }
}
