import { idFromRef, parseRef } from "roc-db"
import type { PostgresMutationTransaction } from "../types/PostgresMutationTransaction"
import { postgresRowToMutation } from "../lib/postgresRowToMutation"

export const saveMutation = async (
    txn: PostgresMutationTransaction,
    finalizedMutation,
) => {
    const {
        ref,
        timestamp,
        operation,
        payload,
        changeSetRef,
        debounceCount,
        log,
        identityRef,
        sessionRef,
        appliedAt,
    } = finalizedMutation

    const id = idFromRef(ref)
    const [changeSetId, changeSetKind] = changeSetRef
        ? parseRef(changeSetRef)
        : [null, null]
    const { sqlTxn, mutationsTableName } = txn.engineOpts

    if (txn.mutation.debounceCount > 0 || appliedAt) {
        const [row] = await sqlTxn`
            UPDATE ${sqlTxn(mutationsTableName)}
            SET (
                timestamp,
                debounce_count,
                payload,
                applied_at
            ) = (
                ${new Date(timestamp)},
                ${txn.mutation.debounceCount},
                ${payload},
                ${appliedAt ? appliedAt : null}
            )
            WHERE id = ${id}
            RETURNING *;
        `.catch(err => {
            console.error("Error updating mutation")
            throw err
        })
        return postgresRowToMutation(row)
    } else {
        const [row] = await sqlTxn`
            INSERT INTO ${sqlTxn(mutationsTableName)} (
                id,
                timestamp,
                operation_name,
                operation_version,
                payload,
                log,
                log_refs,
                change_set_id,
                change_set_kind,
                debounce_count,
                identity_ref,
                session_ref
            ) VALUES (
                ${id},
                ${new Date(timestamp)},
                ${operation.name},
                ${operation.version ?? 1},
                ${payload},
                ${log},
                ${log.map(logItem => logItem[0])},
                ${changeSetId},
                ${changeSetKind},
                ${debounceCount},
                ${identityRef},
                ${sessionRef || null}
            ) RETURNING *;
        `.catch(err => {
            console.error("Error creating mutation", finalizedMutation)
            console.log(finalizedMutation)
            throw err
        })
        return postgresRowToMutation(row)
    }
}
