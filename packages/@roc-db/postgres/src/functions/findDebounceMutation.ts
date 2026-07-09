import { entityFromRef, idFromRef } from "roc-db"
import type { FindDebounceMutationFunction, WriteRequest } from "roc-db"
import type { PostgresTxnEngine } from "../types/PostgresEngineOpts"
import { postgresRowToMutation } from "../lib/postgresRowToMutation"

// Async adapter: the runtime returns a Promise, so the body cannot satisfy the
// synchronous `Mutation | null | undefined` alias return directly. Params are
// typed manually and the value is cast to the alias for the AdapterFunctions
// check. NOTE: the alias types `now` as a Date; core passes a Date, so
// `now.getTime()` replaces the previous numeric subtraction (equivalent).
export const findDebounceMutation: FindDebounceMutationFunction = (async (
    request: WriteRequest,
    engineOpts: PostgresTxnEngine,
    now: Date,
    mutationName: string,
    identityRef: string,
) => {
    const debounceTime = request.operation.debounce

    const thresholdTime = new Date(
        now.getTime() - debounceTime * 1000,
    ).toISOString()
    const { sqlTxn, mutationsTableName } = engineOpts
    const payloadRef = request.payload?.ref

    // Debounce must be scoped to the request's changeSet. Otherwise a mutation
    // from an already-applied changeSet gets reused and the new mutation
    // inherits its stale (applied) changeSetRef, which the server rejects.
    const changeSetRef = request.changeSetRef ?? null
    const changeSetId = changeSetRef ? idFromRef(changeSetRef) : null
    const changeSetKind = changeSetRef ? entityFromRef(changeSetRef) : null
    const changeSetFilter = changeSetId
        ? sqlTxn`change_set_id = ${changeSetId} AND change_set_kind = ${changeSetKind}`
        : sqlTxn`change_set_id IS NULL`

    const res = await (
        payloadRef === undefined
            ? sqlTxn`
            SELECT * FROM ${sqlTxn(mutationsTableName)}
            WHERE
                operation_name = ${mutationName} AND
                timestamp > ${thresholdTime} AND
                identity_ref = ${identityRef} AND
                ${changeSetFilter}
            LIMIT 2
        `
            : sqlTxn`
            SELECT * FROM ${sqlTxn(mutationsTableName)}
            WHERE
                operation_name = ${mutationName} AND
                timestamp > ${thresholdTime} AND
                identity_ref = ${identityRef} AND
                log_refs = ARRAY[${payloadRef}] AND
                ${changeSetFilter}
            LIMIT 2
        `
    ).catch((err: any) => {
        console.error("findDebounceMutation failed")
        throw err
    })
    if (res.length === 0) {
        return
    }
    if (res.length > 1) {
        throw new Error("TODO - handle more than one mutation")
    }
    const mutations = res.values().toArray()
    return postgresRowToMutation(mutations[0])
}) as unknown as FindDebounceMutationFunction
