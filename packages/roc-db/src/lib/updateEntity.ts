import type { Ref } from "../types/Ref"
import type { WriteTransaction } from "./WriteTransaction"

// TODO: not implemented. `updateEntity` (full-document replace) has no callers
// yet; the previous sync/async scaffolding was incomplete (referenced undefined
// vars) and has been removed. Implement against patchEntity when needed.
export const updateEntity = (txn: WriteTransaction, ref: Ref, body: any) => {
    throw new Error("Not Implemented")
}
