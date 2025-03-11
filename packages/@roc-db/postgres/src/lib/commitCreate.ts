import { entityToRow } from "./entityToRow"

export const commitCreate = (txn, table, entity: any) => {
    const row = entityToRow(entity)
    return txn`
        INSERT INTO ${txn(table)} (
            id,
            kind,
            created_at,
            updated_at,
            created_mutation_id,
            updated_mutation_id,
            data,
            indexed_data,
            children,
            children_ids,
            children_refs,
            parents,
            parent_ids,
            parent_refs,
            ancestors,
            ancestor_ids,
            ancestor_refs
        ) VALUES (
            ${row.id},
            ${row.kind},
            ${row.created_at},
            ${row.updated_at},
            ${row.created_mutation_id},
            ${row.updated_mutation_id},
            ${row.data},
            ${row.indexed_data},
            ${row.children},
            ${row.children_ids},
            ${row.children_refs},
            ${row.parents},
            ${row.parent_ids},
            ${row.parent_refs},
            ${row.ancestors},
            ${row.ancestor_ids},
            ${row.ancestor_refs}
        ) RETURNING *;
    `.catch(e => {
        console.error("Error creating entity")
        throw e
    })
}
