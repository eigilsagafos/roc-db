import { z } from "zod"
import { mutationSchemaGenerator } from "../schemas/generators/mutationSchemaGenerator"
import { writeOperation } from "../writeOperation"
import { Query } from "../utils/Query"
import { QueryChain } from "../utils/QueryChain"

export const UndoMutationSchema = mutationSchemaGenerator(
    "undo",
    z.string().optional(),
)

export const undo = writeOperation(UndoMutationSchema, z.undefined(), txn => {
    if (txn.payload) {
        return QueryChain(Query(() => txn.undo(txn.payload)))
    } else if (txn.adapterOpts.undoStack.length > 0) {
        const mutation = txn.adapterOpts.undoStack.pop()
        if (!mutation) return false
        return QueryChain(
            Query(() => txn.undo(mutation.ref)),
            Query(success => {
                txn.adapterOpts.redoStack.push(mutation)
                txn.mutation.payload = mutation.ref
            }),
        )
    } else {
        return false
    }
})
