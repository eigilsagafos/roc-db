import { NotAChangeSetError } from "../errors/NotAChangeSetError"
import { NotAVersionError } from "../errors/NotAVersionError"
import type { Ref } from "../types/Ref"
import { entityFromRef } from "../utils/entityFromRef"

// Warn-then-enforce role guard, shared by the changeSet and version checks: warn
// once per kind by default (so unmigrated apps keep working), or throw `error`
// when `adapter.strictChangeSets` is set.
const assertRole = (
    adapter: any,
    ref: Ref,
    role: "changeSet" | "version",
    error: () => Error,
) => {
    if (!ref) return
    const kind = entityFromRef(ref)
    if (adapter.models?.[kind]?.[role]) return
    if (adapter.strictChangeSets) throw error()
    const key = `${role}:${kind}`
    const warned: Set<string> = (adapter._warnedRoleKinds ??= new Set())
    if (!warned.has(key)) {
        warned.add(key)
        console.warn(
            `roc-db: ref '${ref}' resolves to entity '${kind}', which is not declared as a ${role} (${role}: true). This will become an error in a future version.`,
        )
    }
}

// Guardrail: a ref used as a changeSetRef should resolve to a changeSet kind.
export const assertChangeSetKind = (adapter: any, changeSetRef: Ref) =>
    assertRole(
        adapter,
        changeSetRef,
        "changeSet",
        () => new NotAChangeSetError(changeSetRef, entityFromRef(changeSetRef)),
    )

// Guardrail: a changeSet's version parent should resolve to a version kind.
export const assertVersionKind = (adapter: any, versionRef: Ref) =>
    assertRole(
        adapter,
        versionRef,
        "version",
        () => new NotAVersionError(versionRef, entityFromRef(versionRef)),
    )
