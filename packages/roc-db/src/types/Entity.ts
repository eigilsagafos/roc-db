import { z } from "zod"
import { EntitySchema } from "../schemas/EntitySchema"
import type { Ref } from "./Ref"

// Derived index/relation metadata attached to a document at runtime by
// validateAndIndexDocument (`document.__`). Not part of the persisted schema,
// so it's added here as an optional field on the document type.
export type DocumentMeta = {
    index?: [string, string | number | boolean][]
    unique?: [string, string | number | boolean][]
    parentRefs?: Ref[]
    childRefs?: Ref[]
    ancestorRefs?: Ref[]
}

export type Entity = z.infer<typeof EntitySchema> & {
    __?: DocumentMeta
}
