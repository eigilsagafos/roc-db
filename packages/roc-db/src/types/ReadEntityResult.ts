import type { Ref } from "./Ref"

type EntityNameFromRef<R extends Ref> = R extends `${infer E}/${string}` ? E : never

type BaseEntity = {
    ref: Ref
    entity: string
    data: Record<string, any>
    parents: Record<string, Ref>
    children: Record<string, Ref[]>
    ancestors: Record<string, Ref>
    created: { timestamp: string; mutationRef: Ref }
    updated: { timestamp: string; mutationRef: Ref }
    [key: string]: unknown
}

export type ReadEntityResult<R extends Ref> =
    EntityNameFromRef<R> extends keyof RocDBEntityMap
        ? RocDBEntityMap[EntityNameFromRef<R>]
        : BaseEntity
