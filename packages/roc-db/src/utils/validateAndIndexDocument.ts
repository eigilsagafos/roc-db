import { BadRequestError } from "../errors/BadRequestError"

export const validateAndIndexDocument = (model, { __, ...document }) => {
    const entity = document.entity
    if (!model) {
        throw new BadRequestError(`Unknown entity ${entity}`)
    }
    const parseRes = model.schema.safeParse(document)
    if (parseRes.success === false) {
        console.log("parseRes", parseRes.error, document)
        console.log("model", model.name)
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
