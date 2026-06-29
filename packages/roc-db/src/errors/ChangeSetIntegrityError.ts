import type { Ref } from "../types/Ref"
import { BadRequestError } from "./BadRequestError"

/**
 * Thrown by `duplicateChangeSetMutations` when a kept mutation references an entity that
 * is created *only* by a mutation the `filter` excluded. Replaying the clone
 * would hit a non-existent entity, so we fail fast (with the dangling ref) here
 * rather than deep in the apply path as a `NotFoundError`.
 */
export class ChangeSetIntegrityError extends BadRequestError {
    danglingRef: Ref
    mutationRef?: Ref
    constructor(danglingRef: Ref, mutationRef?: Ref) {
        super(
            `Cannot duplicate changeSet: mutation '${
                mutationRef ?? "(unknown)"
            }' references '${danglingRef}', which is only created by a mutation excluded by the filter.`,
        )
        this.name = "ChangeSetIntegrityError"
        this.danglingRef = danglingRef
        this.mutationRef = mutationRef
    }
}
