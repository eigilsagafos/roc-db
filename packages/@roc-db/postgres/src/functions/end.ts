import type { EndFunction } from "roc-db"
import type {
    PostgresEngineOpts,
    PostgresTxnEngine,
} from "../types/PostgresEngineOpts"

// The async adapter receives the transactional engine opts here (not a
// Transaction wrapper), and returns a Promise. The value is cast to the alias
// for the AdapterFunctions check.
export const end: EndFunction<PostgresEngineOpts> = (async (
    engineOpts: PostgresTxnEngine,
) => {
    const { sqlTxn, onTransactionEnd } = engineOpts

    if (onTransactionEnd) {
        await onTransactionEnd(sqlTxn)
    }
}) as unknown as EndFunction<PostgresEngineOpts>
