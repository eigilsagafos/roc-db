import { z } from "zod"
import { writeOperation } from "../writeOperation"
import { Query } from "../utils/Query"
import { QueryChain } from "../utils/QueryChain"

export const undo = writeOperation("undo", z.string().optional(), txn => {
    if (txn.payload) {
        return QueryChain(Query(() => txn.undo(txn.payload)))
    } else if (txn.adapter.undoStack.length > 0) {
        const mutation = txn.adapter.undoStack.pop()
        if (!mutation) return false
        return QueryChain(
            Query(() => txn.undo(mutation.ref)),
            Query(success => {
                txn.adapter.redoStack.push(mutation)
                txn.mutation.payload = mutation.ref
            }),
        )
    } else {
        return false
    }
})
