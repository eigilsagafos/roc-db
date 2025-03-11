import type { IndexedDBEngine } from "./IndexedDBEngine"
import type { WriteTransaction } from "roc-db"

export type IndexedDBReadTransaction = WriteTransaction<
    any,
    IndexedDBEngine,
    [],
    any
>
