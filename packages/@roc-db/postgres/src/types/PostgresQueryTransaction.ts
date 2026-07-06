import type { Transaction } from "roc-db"
import type { PostgresEngineOpts } from "./PostgresEngineOpts"

// A read/query transaction over the *base* engine options. Functions narrow
// `txn.engineOpts` to PostgresTxnEngine via `as` where the transactional SQL
// handle (`sqlTxn`) is needed.
export type PostgresQueryTransaction = Transaction<PostgresEngineOpts>
