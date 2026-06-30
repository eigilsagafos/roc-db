import { NotAChangeSetError } from "../errors/NotAChangeSetError"
import type { Ref } from "../types/Ref"
import { entityFromRef } from "../utils/entityFromRef"

// Guardrail: a ref used as a changeSetRef should resolve to an entity declared
// as a changeSet (`changeSet: true`). Default behaviour warns once per kind so
// unmigrated apps keep working; `adapter.strictChangeSets` flips it to throw.
export const assertChangeSetKind = (adapter: any, changeSetRef: Ref) => {
    if (!changeSetRef) return
    const kind = entityFromRef(changeSetRef)
    if (adapter.models?.[kind]?.changeSet) return
    if (adapter.strictChangeSets) {
        throw new NotAChangeSetError(changeSetRef, kind)
    }
    const warned: Set<string> = (adapter._warnedNonChangeSetKinds ??= new Set())
    if (!warned.has(kind)) {
        warned.add(kind)
        console.warn(
            `roc-db: changeSetRef '${changeSetRef}' resolves to entity '${kind}', which is not declared as a changeSet (changeSet: true). This will become an error in a future version.`,
        )
    }
}
