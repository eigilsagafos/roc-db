import type { Entity, Ref, Mutation } from "roc-db"

export type InMemoryEngine = {
    entities: Map<Ref, Entity>
    mutations: Map<Ref, Mutation>
}
