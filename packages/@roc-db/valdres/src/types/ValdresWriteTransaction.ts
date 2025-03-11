import type { WriteTransaction } from "roc-db"
import type { ValdresEngine } from "./ValdresEngine"

export type ValdresWriteTransaction = WriteTransaction<ValdresEngine>
