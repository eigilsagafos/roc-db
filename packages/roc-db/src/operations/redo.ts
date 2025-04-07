import { z } from "zod"
import { mutationSchemaGenerator } from "../schemas/generators/mutationSchemaGenerator"
import { writeOperation } from "../writeOperation"
import { Query } from "../utils/Query"
import { QueryChain } from "../utils/QueryChain"

export const RedoMutationSchema = mutationSchemaGenerator(
    "redo",
    z.string().optional(),
)

export const redo = writeOperation(RedoMutationSchema, z.undefined(), txn => {
    if (txn.payload) {
        return QueryChain(Query(() => txn.redo(txn.payload)))
    } else if (txn.adapterOpts.redoStack.length > 0) {
        const mutation = txn.adapterOpts.redoStack.pop()
        if (!mutation) return false
        return QueryChain(
            Query(() => txn.redo(mutation.ref)),
            Query(success => {
                txn.adapterOpts.undoStack.push(mutation)
                txn.mutation.payload = mutation.ref
            }),
        )
    } else {
        return false
    }
})
