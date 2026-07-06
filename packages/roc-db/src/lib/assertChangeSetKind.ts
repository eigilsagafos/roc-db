import { NotAChangeSetError } from "../errors/NotAChangeSetError"
import { NotAVersionError } from "../errors/NotAVersionError"
import type { Ref } from "../types/Ref"
import { entityFromRef } from "../utils/entityFromRef"

// Role guard shared by the changeSet and version checks: the ref's entity kind
// must be declared with the matching role flag (changeSet: true / version:
// true), otherwise we throw. Enforcement is unconditional.
const assertRole = (
    adapter: any,
    ref: Ref,
    role: "changeSet" | "version",
    error: () => Error,
) => {
    if (!ref) return
    const kind = entityFromRef(ref)
    if (adapter.models?.[kind]?.[role]) return
    throw error()
}

// Guardrail: a ref used as a changeSetRef must resolve to a changeSet kind.
export const assertChangeSetKind = (adapter: any, changeSetRef: Ref) =>
    assertRole(
        adapter,
        changeSetRef,
        "changeSet",
        () => new NotAChangeSetError(changeSetRef, entityFromRef(changeSetRef)),
    )

// Guardrail: a changeSet's version parent must resolve to a version kind.
export const assertVersionKind = (adapter: any, versionRef: Ref) =>
    assertRole(
        adapter,
        versionRef,
        "version",
        () => new NotAVersionError(versionRef, entityFromRef(versionRef)),
    )
