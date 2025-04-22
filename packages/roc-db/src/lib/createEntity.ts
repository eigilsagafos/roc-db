import { BadRequestError } from "../errors/BadRequestError"
import type { Ref } from "../types/Ref"
import { entityFromRef } from "../utils/entityFromRef"
import { validateAndIndexDocument } from "../utils/validateAndIndexDocument"
import { cleanAndVerifyDocumentBody } from "./cleanAndVerifyDocumentBody"
import type { WriteTransaction } from "./WriteTransaction"

const generateCreateDocument = (txn: WriteTransaction, ref: Ref, body: any) => {
    const bodyClean = cleanAndVerifyDocumentBody(body)
    const entity = entityFromRef(ref)
    return {
        ref,
        entity,
        created: {
            mutationRef: txn.mutation.ref,
            timestamp: txn.mutation.timestamp,
        },
        updated: {
            mutationRef: txn.mutation.ref,
            timestamp: txn.mutation.timestamp,
        },
        data: bodyClean.data || {},
        children: bodyClean.children || {},
        parents: bodyClean.parents || {},
        ancestors: bodyClean.ancestors || {},
    }
}

const addIndexEntriesToMap = (document, indexMap) => {
    for (const [key, value] of document.__.index) {
        const entry = `${document.entity}:${key}:${JSON.stringify(value)}`
        const arr = [document.ref, ...(indexMap.get(entry) || [])]
        indexMap.set(entry, arr)
    }
}
const addUniqueEntriesToMap = (document, uniqueMap) => {
    for (const [key, value] of document.__.unique) {
        const entry = `${document.entity}:${key}:${JSON.stringify(value)}`
        uniqueMap.set(entry, document.ref)
    }
}

export const createEntity = (txn: WriteTransaction, ref: Ref, body: any) => {
    const document = generateCreateDocument(txn, ref, body)
    const model = txn.adapter.models[document.entity]
    const validatedDocument = validateAndIndexDocument(model, document)
    txn.changeSet.entities.set(ref, validatedDocument)

    if (validatedDocument.__.index?.length) {
        addIndexEntriesToMap(validatedDocument, txn.changeSet.entitiesIndex)
    }
    if (validatedDocument.__.unique?.length) {
        addUniqueEntriesToMap(validatedDocument, txn.changeSet.entitiesUnique)
    }
    if (txn.changeSetInitialized) {
        if (txn.log.has(ref)) {
            throw new BadRequestError(`Entity ${ref} already exists`)
        } else {
            txn.log.set(ref, ["create", validatedDocument])
        }
    }
    return document
}
