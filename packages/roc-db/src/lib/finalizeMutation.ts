import type { WriteTransaction } from "./WriteTransaction"

export const finalizeMutation = (txn: WriteTransaction, isChangeSetApply) => {
    const log = [...txn.log.entries()].map(
        ([ref, [action, document, reverse]]) => {
            switch (action) {
                case "create":
                    return [ref, "create"]
                case "update":
                    return [ref, "update", reverse]
                case "delete":
                    return [ref, "delete", document]
                default:
                    throw new Error("Not implemented " + action)
            }
        },
    )
    const doc = {
        ...txn.mutation,
        log,
    }
    // isChangeSetApply:
    // TODO: Remove this once we ensure sessionRef is never undefined
    // console.log("finalizeMutation", {
    //     isChangeSetApply,
    //     // log,
    //     // txn,
    // })

    if (isChangeSetApply) {
        if (!txn.timestamp) throw new Error("No timestamp")
        doc.appliedAt = txn.timestamp
    }
    if ("sessionRef" in doc && !doc.sessionRef) {
        delete doc.sessionRef
    }
    return doc
}
