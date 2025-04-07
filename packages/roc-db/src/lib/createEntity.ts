import { BadRequestError } from "../errors/BadRequestError"
import type { Entity } from "../types/Entity"
import type { Ref } from "../types/Ref"
import { entityFromRef } from "../utils/entityFromRef"
import { cleanAndVerifyDocumentBody } from "./cleanAndVerifyDocumentBody"
import type { WriteTransaction } from "./WriteTransaction"

const generateCreateDocument = (txn: WriteTransaction, ref: Ref, body: any) => {
    const bodyClean = cleanAndVerifyDocumentBody(body)
    return {
        ref,
        entity: entityFromRef(ref),
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
    } as Entity
}

export const createEntity = (txn: WriteTransaction, ref: Ref, body: any) => {
    const document = generateCreateDocument(txn, ref, body)
    txn.changeSet.entities.set(ref, document)
    if (txn.changeSetInitialized) {
        if (txn.log.has(ref)) {
            throw new BadRequestError(`Entity ${ref} already exists`)
        } else {
            txn.log.set(ref, ["create", document])
        }
    }
    return document
}
