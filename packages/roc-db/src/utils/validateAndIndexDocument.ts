import { BadRequestError } from "../errors/BadRequestError"
import { refsFromRelations } from "./refsFromRelations"

// Compute just the index/unique entries from a document's `data`. Cheap —
// independent of relation/array sizes and without re-running schema validation —
// so callers that already hold a validated document (e.g. patchEntity's prior
// state) can get its `__.index`/`__.unique` without a full `safeParse`.
export const indexEntriesForDocument = (model: any, document: any): any => {
    const __: any = {}
    if (model.indexedDataKeys.length > 0) {
        const indexEntries: any[] = []
        model.indexedDataKeys.forEach((key: string) => {
            const value = document.data[key]
            if (value === undefined) return
            if (Array.isArray(value)) {
                indexEntries.push(
                    ...value.map(v => validatedIndexEntry(key, v)),
                )
            } else {
                indexEntries.push(validatedIndexEntry(key, value))
            }
        })
        __.index = indexEntries
    }
    if (model.uniqueDataKeys.length > 0) {
        const uniqueEntries: any[] = []
        model.uniqueDataKeys.forEach((key: string) => {
            const value = document.data[key]
            if (value === undefined) return
            const type = typeof value
            if (type === "string" || type === "boolean" || type === "number") {
                uniqueEntries.push([key, value])
            } else {
                throw new Error("Invalid type for unique key")
            }
        })
        __.unique = uniqueEntries
    }
    return __
}

export const validateAndIndexDocument = (model, { __, ...document }) => {
    const entity = document.entity
    if (!model) {
        throw new BadRequestError(
            `Missing model for entity '${entity}' in validateAndIndexDocument`,
        )
    }
    const parseRes = model.schema.safeParse(document)
    if (parseRes.success === false) {
        throw new BadRequestError(
            `Invalid document for entity ${entity}: ${JSON.stringify(
                parseRes.error.format(),
            )}`,
        )
    }
    document.__ = indexEntriesForDocument(model, document)
    if (Object.keys(document.parents).length > 0) {
        document.__.parentRefs = refsFromRelations(document.parents)
    }
    if (Object.keys(document.children).length > 0) {
        document.__.childRefs = refsFromRelations(document.children)
    }
    if (Object.keys(document.ancestors).length > 0) {
        document.__.ancestorRefs = refsFromRelations(document.ancestors)
    }

    return document
}

const validatedIndexEntry = (key, value) => {
    const type = typeof value
    if (type === "string" || type === "boolean" || type === "number") {
        return [key, value]
    } else {
        throw new Error("Invalid value for index")
    }
}
