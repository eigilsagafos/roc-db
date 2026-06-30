import { NotAVersionError } from "../errors/NotAVersionError"
import { entityKindsFromRefSchema } from "../utils/entityKindsFromRefSchema"

// Registration-time cross-entity check: a changeSet entity's `version` parent
// (its base-snapshot pointer) must reference a version-flagged entity. We can
// validate this up front — before any runtime resolution — because
// refSchemaGenerator tags the parent ref schema with its kinds.
//
// Warn-then-enforce, sharing `adapter.strictChangeSets`. Runs once per adapter.
export const validateChangeSetVersionParents = (adapter: any) => {
    if (adapter._versionParentsValidated) return
    adapter._versionParentsValidated = true
    const models = adapter.models ?? {}
    for (const name in models) {
        const model = models[name]
        if (!model?.changeSet) continue
        const versionParent = model.parents?.shape?.version
        if (!versionParent) continue
        for (const kind of entityKindsFromRefSchema(versionParent)) {
            if (models[kind]?.version) continue
            if (adapter.strictChangeSets) {
                throw new NotAVersionError(`${name}.parents.version`, kind)
            }
            const warned: Set<string> = (adapter._warnedRoleKinds ??= new Set())
            const key = `regversion:${name}:${kind}`
            if (!warned.has(key)) {
                warned.add(key)
                console.warn(
                    `roc-db: changeSet entity '${name}' has a version parent referencing '${kind}', which is not declared as a version (version: true).`,
                )
            }
        }
    }
}
