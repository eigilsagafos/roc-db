import type { WriteRequest } from "roc-db"
import { postgresRowToMutation } from "../lib/postgresRowToMutation"

export const findDebounceMutation = async (
    request: WriteRequest,
    engineOpts,
    now: number,
    mutationName: string,
) => {
    const debounceTime = request.operation.debounce

    const thresholdTime = new Date(now - debounceTime * 1000).toISOString()
    const { sqlTxn, mutationsTableName } = engineOpts

    const res = await sqlTxn`
        SELECT * FROM ${sqlTxn(mutationsTableName)}
        WHERE 
            operation_name = ${mutationName} AND
            timestamp > ${thresholdTime} AND
            log_refs = ARRAY[${request.payload.ref}]
        LIMIT 2
    `.catch(err => {
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
}
