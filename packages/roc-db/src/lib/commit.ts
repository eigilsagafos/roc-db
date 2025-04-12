import type { WriteTransaction } from "./WriteTransaction"

export const commit = (txn: WriteTransaction, isChangeSetApply = false) => {
    const finalizedMutation = txn.finalizedMutation(isChangeSetApply)
    if (
        !(
            finalizedMutation.operation.name === "undo" ||
            finalizedMutation.operation.name === "redo"
        )
    ) {
        txn.adapter.undoStack.push(finalizedMutation)
    }
    // txn.adapter.undoStack.push(finalizedMutation)
    // if (isChangeSetInit) return
    const { docsToCreate, docsToUpdate, refsToDelete } = convertLog(txn.log)
    return txn.adapter.functions.commit(txn, finalizedMutation, {
        created: docsToCreate,
        updated: docsToUpdate,
        deleted: refsToDelete,
    })
    // if (txn.adapter.async) {
    //     return commitAsync(txn, isChangeSetApply)
    // } else {
    //     return commitSync(txn, isChangeSetApply)
    // }
}

const convertLog = log => {
    const docsToCreate = []
    const docsToUpdate = []
    const refsToDelete = []
    for (const [ref, [action, document]] of log) {
        switch (action) {
            case "create": {
                docsToCreate.push(document)
                break
            }
            case "update": {
                docsToUpdate.push(document)
                break
            }
            case "delete": {
                refsToDelete.push(ref)
                break
            }
            default: {
                throw new Error("Not implemented")
            }
        }
    }
    return { docsToCreate, docsToUpdate, refsToDelete }
}
