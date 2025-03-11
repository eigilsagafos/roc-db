import type { WriteTransaction } from "roc-db"
import type { InMemoryEngine } from "./InMemoryEngine"

export type InMemoryWriteTransaction = WriteTransaction<
    any,
    InMemoryEngine,
    any,
    any
>
