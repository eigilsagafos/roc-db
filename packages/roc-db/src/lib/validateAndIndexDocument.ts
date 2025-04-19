import { BadRequestError } from "../errors/BadRequestError"

export const validateAndIndexDocument = (txn, { __, ...document }) => {
    const entity = document.entity
    const model = txn.adapter.models[entity]
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
    document.__ = document.__ || {}
    // console.log("parseRes", parseRes)
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
            // if (type === "string") {
            //     indexEntries.push(`${key}:${JSON.stringify(value)}`)
            // } else if (type === "number") {
            //     indexEntries.push(`${key}:${JSON.stringify(value)}`)
            // } else {
            //     console.log("TODO", key, type, JSON.stringify(value))
            //     throw new Error("TODO")
            // }
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
            // if (type === "string") {
            //     uniqueEntries.push(`${key}:${JSON.stringify(value)}`)
            // } else if (type === "number") {
            //     uniqueEntries.push(`${key}:${JSON.stringify(value)}`)
            // } else {
            //     console.log("TODO", key, type, JSON.stringify(value))
            //     throw new Error("TODO")
            // }
        })
        document.__.unique = uniqueEntries
    }

    // if (request.operation.outputSchema) {
    //     validateOutput(res, request)
    // }
    // console.log(txn.adapter.entities[0].shape.entity.value)
    // const schema = txn.adapter.entities
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
