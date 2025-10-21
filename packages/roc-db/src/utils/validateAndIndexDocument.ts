import { BadRequestError } from "../errors/BadRequestError"
import { refsFromRelations } from "./refsFromRelations"

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
    document.__ = {}
    if (model.indexedDataKeys.length > 0) {
        const indexEntries = []
        model.indexedDataKeys.forEach(key => {
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
        document.__.index = indexEntries
    }
    if (model.uniqueDataKeys.length > 0) {
        const uniqueEntries = []
        model.uniqueDataKeys.forEach(key => {
            const value = document.data[key]
            if (value === undefined) return
            const type = typeof value
            if (type === "string" || type === "boolean" || type === "number") {
                uniqueEntries.push([key, value])
            } else {
                throw new Error("Invalid type for unique key")
            }
        })
        document.__.unique = uniqueEntries
    }
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
