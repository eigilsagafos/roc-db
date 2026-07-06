import type { IndexedDBEngine } from "./IndexedDBEngine"
import type { WriteTransaction } from "roc-db"

export type IndexedDBWriteTransaction = WriteTransaction<IndexedDBEngine>
