import { type ReadOperation, type Ref } from "roc-db"
import { type GetValue, selectorFamily } from "valdres"
import { generateTransactionCache } from "../../../roc-db/src/lib/generateTransactionCache"
import { ReadTransaction } from "../../../roc-db/src/lib/ReadTransaction"
import { runSyncFunctionChain } from "../../../roc-db/src/lib/runSyncFunctionChain"
import { batchReadEntities } from "./functions/batchReadEntities"
import { getChangeSetMutations } from "./functions/getChangeSetMutations"
import { pageEntities } from "./functions/pageEntities"
import { pageEntitiesByIndex } from "./functions/pageEntitiesByIndex"
import { pageMutations } from "./functions/pageMutations"
import { readEntity } from "./functions/readEntity"
import { refByUniqueField } from "./functions/refByUniqueField"

const functions = {
    readEntity,
    refByUniqueField,
    batchReadEntities,
    getChangeSetMutations,
    pageEntities,
    pageEntitiesByIndex,
    pageMutations,
}

export const createQuerySelector = (
    operation: ReadOperation,
    payload: unknown,
    adapterOptions: {
        session: unknown
        changeSetRef?: Ref | null
        [key: string]: unknown
    },
    engineOptions: { [key: string]: unknown },
) => {
    if (operation.type !== "read") {
        throw new Error(
            `Operation "${operation.name}" is not a read operation.`,
        )
    }

    const family = selectorFamily(
        (payload: unknown) => (get: GetValue) => {
            const engineOpts = { ...engineOptions, rootTxn: { get } }

            const request = {
                type: "read" as const,
                operation,
                payload,
                changeSetRef: adapterOptions.changeSetRef || null,
            }

            const txn = new ReadTransaction(
                request,
                engineOpts,
                { ...adapterOptions, functions },
                payload,
                generateTransactionCache(!request.changeSetRef),
            )

            return runSyncFunctionChain(
                operation.callback(txn, adapterOptions.session),
            )
        },
        { name: `query/${operation.name}` },
    )

    return family(payload)
}
