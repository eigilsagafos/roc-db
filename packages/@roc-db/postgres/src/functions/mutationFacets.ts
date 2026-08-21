import { normalizeMutationFacetsArgs } from "roc-db"
import type {
    MutationFacetField,
    MutationFacetsFunction,
    MutationFacetsResult,
} from "roc-db"
import type {
    PostgresEngineOpts,
    PostgresTxnEngine,
} from "../types/PostgresEngineOpts"
import { createMutationFilterClause } from "./mutationFilterClauses"

const COLUMN_BY_FIELD: Record<MutationFacetField, string> = {
    operationName: "operation_name",
    identityRef: "identity_ref",
}

export const mutationFacets: MutationFacetsFunction<PostgresEngineOpts> =
    (async (txn: any, args: any) => {
        const normalized = normalizeMutationFacetsArgs(args)
        const { mutationsTableName, sqlTxn } =
            txn.engineOpts as PostgresTxnEngine
        const filter = createMutationFilterClause(normalized.filter, sqlTxn)

        const result: MutationFacetsResult = {}
        for (const field of normalized.fields) {
            // One GROUP BY per field rather than a single grouping-sets query:
            // the shapes stay trivially readable and each is independently
            // index-friendly. `fields` is a closed enum, so the identifier is
            // never caller-controlled.
            const rows = await sqlTxn`
                SELECT ${sqlTxn(COLUMN_BY_FIELD[field])} AS value, count(*)::int AS count
                FROM ${sqlTxn(mutationsTableName)}
                WHERE ${filter}
                GROUP BY 1
                ORDER BY count DESC, value ASC NULLS LAST;
            `.catch((err: any) => {
                console.error("mutationFacets failed")
                throw err
            })
            result[field] = rows
                .values()
                .toArray()
                .map((row: any) => ({
                    value: row.value ?? null,
                    count: row.count,
                }))
        }
        return result
    }) as unknown as MutationFacetsFunction<PostgresEngineOpts>
