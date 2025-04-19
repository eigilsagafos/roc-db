import { entityToRow } from "../lib/entityToRow"
import type { PostgresMutationTransaction } from "../types/PostgresMutationTransaction"

export const commitCreate = async (
    txn: PostgresMutationTransaction,
    entity,
) => {
    const { sqlTxn, entitiesTableName } = txn.engineOpts
    const row = entityToRow(entity)
    return sqlTxn`
        INSERT INTO ${sqlTxn(entitiesTableName)} (
            id,
            kind,
            created_at,
            updated_at,
            created_mutation_id,
            updated_mutation_id,
            data,
            children,
            children_ids,
            children_refs,
            parents,
            parent_ids,
            parent_refs,
            ancestors,
            ancestor_ids,
            ancestor_refs,
            index_entries,
            unique_constraint_0,
            unique_constraint_1
        ) VALUES (
            ${row.id},
            ${row.kind},
            ${row.created_at},
            ${row.updated_at},
            ${row.created_mutation_id},
            ${row.updated_mutation_id},
            ${row.data},
            ${row.children},
            ${row.children_ids},
            ${row.children_refs},
            ${row.parents},
            ${row.parent_ids},
            ${row.parent_refs},
            ${row.ancestors},
            ${row.ancestor_ids},
            ${row.ancestor_refs},
            ${row.index_entries},
            ${row.unique_constraint_0},
            ${row.unique_constraint_1}
        ) RETURNING *;`
}
