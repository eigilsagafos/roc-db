import type { Transaction } from "roc-db/src/types/Transaction"
import type { ValdresEngine } from "./ValdresEngine"

export type ValdresTransaction = Transaction<any, ValdresEngine, any, any>
