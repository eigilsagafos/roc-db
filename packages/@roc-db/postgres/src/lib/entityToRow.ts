import { entityFromRef, idFromRef } from "roc-db"
import { idsFromRelations } from "./idsFromRelations"
import { refsFromRelations } from "./refsFromRelations"

const stringifyIndexEntry = ([k, v]) => `${k}:${JSON.stringify(v)}`

const stringifyIndexEntries = arr => {
    return arr.map(stringifyIndexEntry)
}

export const entityToRow = entity => {
    return {
        id: idFromRef(entity.ref),
        kind: entityFromRef(entity.ref),
        created_at: entity.created.timestamp,
        updated_at: entity.updated.timestamp,
        created_mutation_id: idFromRef(entity.created.mutationRef),
        updated_mutation_id: idFromRef(entity.updated.mutationRef),
        data: entity.data,
        children: entity.children,
        parents: entity.parents,
        ancestors: entity.ancestors,
        children_ids: idsFromRelations(entity.children),
        children_refs: refsFromRelations(entity.children),
        parent_ids: idsFromRelations(entity.parents),
        parent_refs: refsFromRelations(entity.parents),
        ancestor_ids: idsFromRelations(entity.ancestors),
        ancestor_refs: refsFromRelations(entity.ancestors),
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
