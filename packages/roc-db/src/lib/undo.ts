const undoAsync = async (txn, mutationRef) => {
    const mutation = await txn.readMutation(mutationRef)
    addToLog(txn, mutation)
}

const undoSync = (txn, mutationRef) => {
    const mutation = txn.readMutation(mutationRef)
    addToLog(txn, mutation)
}
export const undo = (txn, mutationRef) => {
    if (txn.adapterOpts.async) {
        return undoAsync(txn, mutationRef)
    } else {
        return undoSync(txn, mutationRef)
    }
}

const addToLog = (txn, mutation) => {
    mutation.log.forEach(([ref, action, document]) => {
        switch (action) {
            case "create": {
                txn.deleteEntity(ref)
                break
            }
            case "update": {
                txn.patchEntity(ref, document)
                break
            }
            case "delete": {
                const { ref, data, children, parents, ancestors } = document
                txn.createEntity(ref, { data, children, parents, ancestors })
                break
            }
            default: {
                console.log("action", action)
                throw new Error("Not implemented" + action)
            }
        }
    })
}
