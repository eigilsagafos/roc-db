import { idFromRef, parseRef } from "roc-db"
import type { PostgresMutationTransaction } from "../types/PostgresMutationTransaction"

export const saveMutation = async (
    txn: PostgresMutationTransaction,
    finalizedMutation,
) => {
    const { ref, timestamp, name, payload, changeSetRef, debounceCount, log } =
        finalizedMutation
    const id = idFromRef(ref)
    const [changeSetId, changeSetKind] = changeSetRef
        ? parseRef(changeSetRef)
        : [null, null]
    const { sqlTxn, mutationsTableName } = txn.engineOpts

    if (txn.mutation.debounceCount > 0) {
        const [row] = await sqlTxn`
            UPDATE ${sqlTxn(mutationsTableName)}
            SET (
                timestamp,
                debounce_count,
                payload
            ) = (
                ${new Date(timestamp)},
                ${txn.mutation.debounceCount},
                ${payload}
            )
            WHERE id = ${id}
        `.catch(err => {
            console.error("Error updating mutation")
            throw err
        })
    } else {
        const [row] = await sqlTxn`
            INSERT INTO ${sqlTxn(mutationsTableName)} (
                id,
                timestamp,
                name,
                payload,
                log,
                log_refs,
                change_set_id,
                change_set_kind,
                debounce_count
            ) VALUES (
                ${id},
                ${new Date(timestamp)},
                ${name},
                ${payload},
                ${log},
                ${log.map(logItem => logItem[0])},
                ${changeSetId},
                ${changeSetKind},
                ${debounceCount}
            ) RETURNING *;
        `.catch(err => {
            console.error("Error creating mutation", txn.mutation)

            throw err
        })
    }
    return finalizedMutation
}
