import type { PageEntitiesByIndexFunction, Ref } from "roc-db"
import type { InMemoryEngine } from "../types/InMemoryEngine"

export const pageEntitiesByIndex: PageEntitiesByIndexFunction<
    InMemoryEngine
> = (txn, entity, field, value) => {
    const { entitiesIndex } = txn.engineOpts
    const indexKey = `${entity}:${field}:${JSON.stringify(value)}`
    const refs = entitiesIndex.get(indexKey) ?? []
    return refs.map((ref: Ref) => txn.engineOpts.entities.get(ref))
}
