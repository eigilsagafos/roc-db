import { z } from "zod"
import { writeOperation } from "../writeOperation"
import { Query } from "../utils/Query"
import { QueryChain } from "../utils/QueryChain"

export const redo = writeOperation("redo", z.string().optional(), txn => {
    if (txn.payload) {
        return QueryChain(Query(() => txn.redo(txn.payload)))
    } else if (txn.adapter.redoStack.length > 0) {
        const mutation = txn.adapter.redoStack.pop()
        if (!mutation) return false
        return QueryChain(
            Query(() => txn.redo(mutation.ref)),
            Query(success => {
                txn.adapter.undoStack.push(mutation)
                txn.mutation.payload = mutation.ref
            }),
        )
    } else {
        return false
    }
})
