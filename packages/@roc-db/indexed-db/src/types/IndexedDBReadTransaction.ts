import type { ReadTransaction } from "roc-db"
import type { IndexedDBEngine } from "./IndexedDBEngine"

export type IndexedDBReadTransaction = ReadTransaction<
    any,
    IndexedDBEngine,
    [],
    any
>
