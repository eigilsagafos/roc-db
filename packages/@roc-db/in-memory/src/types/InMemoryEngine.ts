import type { EntityDocument, Mutation, Ref } from "roc-db"

// The engine options `createInMemoryAdapter` passes to `createAdapter`. The
// in-memory adapter is synchronous and Map-based, so — unlike valdres — there
// is no transaction object and no base-vs-transactional split. All four Maps
// are always present.
export type InMemoryEngine = {
    entities: Map<Ref, EntityDocument>
    mutations: Map<Ref, Mutation>
    // Keyed by `${entity}:${field}:${JSON.stringify(value)}` -> owning entity ref.
    entitiesUnique: Map<string, Ref>
    // Keyed by `${entity}:${field}:${JSON.stringify(value)}` -> matching entity refs.
    entitiesIndex: Map<string, Ref[]>
}
