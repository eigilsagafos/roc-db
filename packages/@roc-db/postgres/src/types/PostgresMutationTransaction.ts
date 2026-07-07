import type { WriteTransaction } from "roc-db"
import type { PostgresEngineOpts } from "./PostgresEngineOpts"

// A write transaction over the *base* engine options. Functions narrow
// `txn.engineOpts` to PostgresTxnEngine via `as` where the transactional SQL
// handle (`sqlTxn`) is needed — these helpers only run inside `begin`.
export type PostgresMutationTransaction = WriteTransaction<PostgresEngineOpts>
