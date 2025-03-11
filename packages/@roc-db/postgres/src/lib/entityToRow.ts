import { entityFromRef, idFromRef } from "roc-db"
import { idsFromRelations } from "./idsFromRelations"
import { refsFromRelations } from "./refsFromRelations"

export const entityToRow = entity => {
    return {
        id: idFromRef(entity.ref),
        kind: entityFromRef(entity.ref),
        created_at: entity.created.timestamp,
        updated_at: entity.updated.timestamp,
        created_mutation_id: idFromRef(entity.created.mutationRef),
        updated_mutation_id: idFromRef(entity.updated.mutationRef),
        data: entity.data,
        indexed_data: {},
        children: entity.children,
        parents: entity.parents,
        ancestors: entity.ancestors,
        children_ids: idsFromRelations(entity.children),
        children_refs: refsFromRelations(entity.children),
        parent_ids: idsFromRelations(entity.parents),
        parent_refs: refsFromRelations(entity.parents),
        ancestor_ids: idsFromRelations(entity.ancestors),
        ancestor_refs: refsFromRelations(entity.ancestors),
    }
}
