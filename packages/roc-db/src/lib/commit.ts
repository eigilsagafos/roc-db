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
    const { docsToCreate, docsToUpdate, refsToDelete } = convertLog(txn.log)

    if (txn.adapter.validateCreate) {
        docsToCreate.forEach(doc => {
            txn.adapter.validateCreate(txn, doc)
        })
    }
    if (txn.adapter.validateUpdate) {
        docsToUpdate.forEach(doc => {
            const [, , , , originalDoc] = txn.log.get(doc.ref)
            txn.adapter.validateUpdate(txn, doc, originalDoc)
        })
    }
    if (txn.adapter.validateDelete) {
        refsToDelete.forEach(ref => {
            const [, doc] = txn.log.get(ref)
            txn.adapter.validateDelete(txn, doc)
        })
    }

    return txn.adapter.functions.commit(txn, finalizedMutation, {
        created: docsToCreate,
        updated: docsToUpdate,
        deleted: refsToDelete,
    })
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
