import type { Ref } from "../types/Ref"
import { BadRequestError } from "./BadRequestError"

/**
 * Thrown by `duplicateChangeSetMutations` when the target changeSet already has
 * pending mutations. Duplicating is defined as producing an independent copy
 * into a *fresh* changeSet; ingesting into a non-empty one would silently merge
 * the clones with the target's existing work (and can fail mid-replay). The
 * target must be a freshly created, empty changeSet.
 */
export class ChangeSetNotEmptyError extends BadRequestError {
    targetChangeSetRef: Ref
    existingCount: number
    constructor(targetChangeSetRef: Ref, existingCount: number) {
        super(
            `Cannot duplicate into changeSet '${targetChangeSetRef}': it already has ${existingCount} pending mutation(s). The target must be a freshly created, empty changeSet.`,
        )
        this.name = "ChangeSetNotEmptyError"
        this.targetChangeSetRef = targetChangeSetRef
        this.existingCount = existingCount
    }
}
