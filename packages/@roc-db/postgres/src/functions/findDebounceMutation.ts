import type { WriteRequest } from "roc-db"
import { postgresRowToMutation } from "../lib/postgresRowToMutation"

export const findDebounceMutation = async (
    request: WriteRequest,
    engineOpts,
    now,
) => {
    const debounceTime = request.settings.debounce
    const mutationName = request.schema.shape.name.value
    const thresholdTime = new Date(now - debounceTime * 1000).toISOString()
    const { sqlTxn, mutationsTableName } = engineOpts

    const res = await sqlTxn`
        SELECT * FROM ${sqlTxn(mutationsTableName)}
        WHERE 
            operation_name = ${mutationName} AND
            timestamp > ${thresholdTime} AND
            log_refs = ARRAY[${request.payload.ref}]
        LIMIT 2
    `
    if (res.length === 0) {
        return
    }
    if (res.length > 1) {
        throw new Error("TODO - handle more than one mutation")
    }
    const mutations = res.values().toArray()
    return postgresRowToMutation(mutations[0])
}
