import { entityToRow } from "./entityToRow"

export const commitUpdate = (txn, table, entity: any) => {
    const row = entityToRow(entity)
    return txn`
        UPDATE ${txn(table)}
        SET (
            updated_at,
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
        ) = (
            ${row.updated_at},
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
        )
        WHERE
            id = ${row.id}
        RETURNING *;
    `.catch(err => {
        console.error("Error updating entity", row)
        throw err
    })
}
