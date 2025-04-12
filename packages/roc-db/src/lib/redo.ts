const redoAsync = async (txn, mutationRef) => {
    const mutation = await txn.readMutation(mutationRef)
    addToLog(txn, mutation)
}

const redoSync = (txn, mutationRef) => {
    const mutation = txn.readMutation(mutationRef)
    addToLog(txn, mutation)
}
export const redo = (txn, mutationRef) => {
    if (txn.adapter.async) {
        return redoAsync(txn, mutationRef)
    } else {
        return redoSync(txn, mutationRef)
    }
}

const addToLog = (txn, mutation) => {
    mutation.log.forEach(([ref, action, document]) => {
        switch (action) {
            case "create": {
                const { ref, data, children, parents, ancestors } = document
                txn.createEntity(ref, { data, children, parents, ancestors })
                break
            }
            case "update": {
                txn.patchEntity(ref, document)
                break
            }
            case "delete": {
                txn.deleteEntity(ref)
                break
            }
            default: {
                throw new Error("Not implemented" + action)
            }
        }
    })
}
