import { commitCreate } from "../lib/commitCreate"
import { commitDelete } from "../lib/commitDelete"
import { commitUpdate } from "../lib/commitUpdate"

export const end = async txn => {
    const { sqlTxn } = txn.engineOpts
    if (txn.request.type === "write") {
        const { uncommitted, entitiesTableName } = txn.engineOpts
        await Promise.all([
            ...Object.values(uncommitted).map(([action, row]) => {
                switch (action) {
                    case "create":
                        return commitCreate(sqlTxn, entitiesTableName, row)
                    case "update":
                        return commitUpdate(sqlTxn, entitiesTableName, row)
                    case "delete":
                        return commitDelete(sqlTxn, entitiesTableName, row)
                    default:
                        throw new Error("Unhandled action ")
                }
            }),
        ])
    }
    if (txn.engineOpts.onTransactionStart) {
        await txn.engineOpts.onTransactionStart(sqlTxn)
    }
}
