import { verifyReplayDivergence } from "./verifyReplayDivergence"
import type { WriteTransaction } from "./WriteTransaction"

export const finalizeMutation = (
    txn: WriteTransaction,
    isChangeSetApply: boolean,
) => {
    const log = [...txn.log.entries()].map(
        ([ref, [action, document, reverse]]) => {
            switch (action) {
                case "create":
                    return [ref, "create"]
                case "update":
                    return [ref, "update", reverse]
                case "delete":
                    return [ref, "delete", document]
                case "ref":
                    throw new Error(`A ref '${ref}' was created but not used`)
                default: {
                    console.log("Unknown action", txn.log)
                    throw new Error("Not implemented " + action)
                }
            }
        },
    )
    // On replay/load (a re-executed mutation that carries an optimisticMutation),
    // `txn.mutation.log` is the stored effect and `log` is what re-execution just
    // reproduced. Compare them so a non-deterministic operation's silent
    // divergence is caught here rather than surfacing later as corrupted state.
    // The fresh-write path has no optimisticMutation and is left untouched.
    if (txn.request?.type === "write" && txn.request.optimisticMutation) {
        verifyReplayDivergence(txn, log)
    }
    const doc = {
        ...txn.mutation,
        log,
    }
    // isChangeSetApply:
    // TODO: Remove this once we ensure sessionRef is never undefined

    if (isChangeSetApply) {
        if (!txn.timestamp) throw new Error("No timestamp")
        doc.appliedAt = txn.timestamp
    }
    return doc
}
