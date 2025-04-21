import type { Entity } from "roc-db"
import { entityToRow } from "../lib/entityToRow"
import type { PostgresMutationTransaction } from "../types/PostgresMutationTransaction"

export const commitUpdate = async (
    txn: PostgresMutationTransaction,
    entity: Entity,
) => {
    const { sqlTxn, entitiesTableName } = txn.engineOpts
    const row = entityToRow(entity)
    return sqlTxn`
        UPDATE ${sqlTxn(entitiesTableName)}
        SET (
            updated_at,
            updated_mutation_id,
            data,
            children,
            children_refs,
            parents,
            parent_refs,
            ancestors,
            ancestor_refs,
            index_entries,
            unique_constraint_0,
            unique_constraint_1
        ) = (
            ${row.updated_at},
            ${row.updated_mutation_id},
            ${row.data},
            ${row.children},
            ${row.children_refs},
            ${row.parents},
            ${row.parent_refs},
            ${row.ancestors},
            ${row.ancestor_refs},
            ${row.index_entries},
            ${row.unique_constraint_0},
            ${row.unique_constraint_1}
        )
        WHERE
            id = ${row.id}
        RETURNING *;
    `.catch(err => {
        console.error("Error updating entity", row)
        throw err
    })
}
