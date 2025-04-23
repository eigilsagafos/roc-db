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
        persistedAt,
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
                applied_at,
                persisted_at
            ) = (
                ${new Date(timestamp)},
                ${txn.mutation.debounceCount},
                ${payload},
                ${appliedAt ? appliedAt : null},
                ${persistedAt ? persistedAt : null}
            )
            WHERE id = ${id}
            RETURNING *;
        `.catch(err => {
            console.error("Error updating mutation")
            throw err
        })
        // If the row is not found, it means that the mutation was never created. This can
        // happen when a optimistic mutation is not synced until it has debounced a few times
        if (row) {
            return postgresRowToMutation(row)
        }
    }
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
                persisted_at,
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
                ${persistedAt || null},
                ${sessionRef || null}
            ) RETURNING *;
        `.catch(err => {
        console.error("Error creating mutation", finalizedMutation)
        console.log(finalizedMutation)
        throw err
    })
    return postgresRowToMutation(row)
}
