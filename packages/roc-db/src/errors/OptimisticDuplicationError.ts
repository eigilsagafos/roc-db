import type { Ref } from "../types/Ref"
import { BadRequestError } from "./BadRequestError"

/**
 * Thrown by `duplicateChangeSetMutations` when it is invoked on an optimistic
 * adapter. The primitive emits the source's mutations as N independent mutation
 * records in the target changeSet; running the wrapping write operation
 * optimistically would sync that operation's own mutation too, and re-executing
 * it (on the server, or on another client via `loadMutations`) re-runs the
 * primitive — double-executing it (silent duplicate copies, or a
 * `ChangeSetNotEmptyError` when the target is already populated).
 *
 * Duplication is therefore server-authoritative only: run the wrapping operation
 * once on a non-optimistic adapter and load the resulting mutations on clients.
 * Do not replay the wrapping operation on clients — load the granular copies it
 * produced instead.
 */
export class OptimisticDuplicationError extends BadRequestError {
    sourceChangeSetRef: Ref
    targetChangeSetRef: Ref
    constructor(sourceChangeSetRef: Ref, targetChangeSetRef: Ref) {
        super(
            `Cannot duplicate changeSet '${sourceChangeSetRef}' into '${targetChangeSetRef}' on an optimistic adapter. duplicateChangeSetMutations is server-authoritative: run the wrapping operation once on a non-optimistic adapter and load the resulting mutations on clients (do not replay the wrapping operation).`,
        )
        this.name = "OptimisticDuplicationError"
        this.sourceChangeSetRef = sourceChangeSetRef
        this.targetChangeSetRef = targetChangeSetRef
    }
}
